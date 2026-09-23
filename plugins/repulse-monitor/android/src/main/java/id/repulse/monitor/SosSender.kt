package id.repulse.monitor

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.HandlerThread
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The emergency message, sent without JavaScript.
 *
 * M0 established that JavaScript stops running once the Activity is not
 * visible, and the emergency this product exists for happens at 3am with
 * the phone face-down on a bedside table. A send that lives in the WebView
 * is a send that works in the demo and not in the night.
 *
 * So the payload is armed while the app is awake and can see its own data,
 * and the send itself is here: reachable from the service, from a
 * notification action, from anywhere that does not need a WebView to be
 * alive.
 *
 * The message is the same five lines `src/lib/sos.ts` builds, and has to
 * stay that way — that file is what the screen shows the user, and a
 * preview that does not match what was sent is worse than no preview.
 */
object SosSender {

    private const val PREFS = "repulse.sos"
    private const val KEY_PAYLOAD = "payload"
    private const val KEY_LAST_SENT = "lastSentAt"

    /** One emergency, one message. A stage-4 report and a person opening
     *  the SOS screen a moment later are the same emergency, and a contact
     *  who gets the same alarm twice starts ignoring the second one. */
    private const val DEDUPE_MS = 120_000L

    /** Older than this and the message says the fix is old rather than
     *  presenting it as where the person is now. Mirrors FIX_STALE_MS. */
    private const val STALE_MS = 120_000L

    /** Good enough to knock on a door with. Once a fix is better than this
     *  the updates stop: the next one would move the pin by less than the
     *  width of the building. */
    private const val TARGET_ACCURACY_M = 10f

    /** How long the GPS is allowed to keep trying, after the message has
     *  already gone. A cold lock takes 20 to 40 seconds outdoors and never
     *  arrives at all in some rooms, so this is generous rather than
     *  hopeful — and it costs nothing when the target is reached early,
     *  because reaching it ends the watch. */
    private const val FRESH_TIMEOUT_MS = 180_000L

    /** A follow-up is only worth an SMS if it actually moves the pin
     *  further than the last one's own error bar. */
    private const val WORTH_RESENDING_M = 60f

    /** The floor between two updates.
     *
     * Without it this is a pager. Android reports a fix about once a
     * second, and "keep sending while accuracy is worse than 10 m" taken
     * literally is thirty messages per contact on the way from 60 m to
     * 8 m — at which point the person reading them has stopped reading
     * them, which is the one outcome worse than sending nothing. */
    private const val UPDATE_MIN_GAP_MS = 30_000L

    /** And a hard ceiling on top of the gap, because the gap alone still
     *  allows six messages across three minutes. Three is enough to show a
     *  pin walking in towards a house. */
    private const val MAX_UPDATES = 3

    /**
     * Ends the current emergency, so the next one is allowed to send.
     *
     * The dedupe window exists so a stage-4 report and the screen that
     * opens a moment later do not send twice. It was never meant to
     * outlive the emergency itself: after somebody says they are okay,
     * the next SOS is a NEW emergency, and refusing it for the rest of
     * two minutes is a safety feature eating a safety feature. That is
     * what made a second SOS look like it sent and arrive nowhere, and
     * what made restarting the app "fix" it - restarting simply took
     * longer than the window.
     */
    fun endEmergency(context: Context) {
        prefs(context).edit().remove(KEY_LAST_SENT).apply()
    }

    fun arm(context: Context, payload: JSONObject) {
        prefs(context).edit().putString(KEY_PAYLOAD, payload.toString()).apply()
    }

    /**
     * Sends to every armed number and returns one result per number.
     *
     * Never throws. Everything that can go wrong here is something the
     * screen has to be able to report: no payload armed, no permission, no
     * SIM, a carrier that refuses.
     */
    /** How long the caller is willing to wait for the radio to report
     *  back. The service passes 0, because it runs on the main thread and
     *  an ANR during an emergency helps nobody. The screen waits, because
     *  what it prints is the only thing the user will ever know about the
     *  send. */
    fun send(context: Context, force: Boolean, waitMs: Long = 0L): JSONArray {
        val results = JSONArray()
        val raw = prefs(context).getString(KEY_PAYLOAD, null)
        if (raw.isNullOrBlank()) {
            return results.put(fail("", "no emergency contact is set up on this phone"))
        }

        val payload = try {
            JSONObject(raw)
        } catch (e: Exception) {
            return results.put(fail("", "the saved contacts could not be read"))
        }

        val numbers = payload.optJSONArray("numbers") ?: JSONArray()
        if (numbers.length() == 0) {
            return results.put(fail("", "no emergency contact is set up on this phone"))
        }

        val since = System.currentTimeMillis() - prefs(context).getLong(KEY_LAST_SENT, 0L)
        if (!force && since < DEDUPE_MS) {
            // Already gone out for this emergency. Reported rather than
            // hidden: the screen says so instead of claiming a second send.
            for (i in 0 until numbers.length()) {
                results.put(
                    JSONObject()
                        .put("to", numbers.optString(i))
                        .put("sent", true)
                        .put("reason", "already sent moments ago")
                )
            }
            return results
        }

        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            for (i in 0 until numbers.length()) {
                results.put(fail(numbers.optString(i), "permission to send SMS was refused"))
            }
            return results
        }

        val body = compose(context, payload)
        val manager = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
        } catch (e: Exception) {
            for (i in 0 until numbers.length()) {
                results.put(fail(numbers.optString(i), e.message ?: "this phone has no SMS radio"))
            }
            return results
        }

        /* Every part of every message gets its own sent-intent, and the
         * radio answers each one. Without this the screen could only
         * report that SmsManager accepted the request, which it does even
         * with the SIM removed, and a green tick for a message that never
         * existed is the worst thing this screen could show. */
        val action = "id.repulse.monitor.SMS_SENT." + System.currentTimeMillis()
        val failures = ConcurrentHashMap<String, String>()
        val plans = mutableListOf<Pair<String, ArrayList<String>>>()
        for (i in 0 until numbers.length()) {
            val to = numbers.optString(i)
            if (to.isBlank()) continue
            plans.add(to to manager.divideMessage(body))
        }
        if (plans.isEmpty()) {
            return results.put(fail("", "no emergency contact is set up on this phone"))
        }

        val latch = CountDownLatch(plans.sumOf { it.second.size })
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, intent: Intent?) {
                val to = intent?.getStringExtra("to") ?: ""
                if (resultCode != android.app.Activity.RESULT_OK) {
                    failures[to] = reasonFor(resultCode)
                }
                latch.countDown()
            }
        }
        ContextCompat.registerReceiver(
            context.applicationContext, receiver, IntentFilter(action),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )

        var any = false
        var request = 0
        for ((to, parts) in plans) {
            val intents = ArrayList<PendingIntent>(parts.size)
            for (part in parts.indices) {
                intents.add(
                    PendingIntent.getBroadcast(
                        context.applicationContext,
                        request++,
                        Intent(action).setPackage(context.packageName).putExtra("to", to),
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                    )
                )
            }
            try {
                // The body carries a maps link over several lines, so it is
                // past 160 characters more often than not. Sent whole it
                // arrives truncated at the first boundary.
                if (parts.size > 1) {
                    manager.sendMultipartTextMessage(to, null, parts, intents, null)
                } else {
                    manager.sendTextMessage(to, null, parts[0], intents[0], null)
                }
                any = true
            } catch (e: Exception) {
                android.util.Log.e("RePulse", "SMS refused for " + to, e)
                failures[to] = e.message ?: "the phone refused"
                repeat(parts.size) { latch.countDown() }
            }
        }

        /* Never on the main thread. The receiver below is delivered there,
         * so waiting on it from the main thread would wait for a message
         * that cannot arrive until the wait ends: eight seconds of frozen
         * UI, then a report that says nothing happened. Capacitor calls
         * plugin methods on a background thread today; this makes that an
         * assumption the code checks rather than one it relies on. */
        if (waitMs > 0 && Looper.myLooper() != Looper.getMainLooper()) {
            // Whatever has not answered by now is reported as accepted by
            // the radio: a late failure is rarer than a slow network, and
            // the screen cannot wait forever with somebody on the floor.
            latch.await(waitMs, TimeUnit.MILLISECONDS)
        }
        unregister(context, receiver, waitMs <= 0)

        for ((to, _) in plans) {
            val why = failures[to]
            results.put(
                if (why == null) JSONObject().put("to", to).put("sent", true)
                else fail(to, why)
            )
        }

        // Only a send that actually happened starts the dedupe window. A
        // failed attempt must not block the retry that follows it.
        if (any) {
            prefs(context).edit().putLong(KEY_LAST_SENT, System.currentTimeMillis()).apply()
            followUp(context, payload, manager, numbers)
        }
        return results
    }

    /**
     * Lets a late answer still be counted, then lets go.
     *
     * The service does not wait for the radio, so its receiver has to
     * outlive the call, but not forever: a receiver nobody unregisters
     * leaks until the process dies.
     */
    private fun unregister(context: Context, receiver: BroadcastReceiver, delayed: Boolean) {
        val drop = {
            try {
                context.applicationContext.unregisterReceiver(receiver)
            } catch (e: Exception) {
                /* Already gone. */
            }
        }
        if (delayed) Handler(Looper.getMainLooper()).postDelayed(drop, 60_000L) else drop()
    }

    /** What the radio reported, in words a frightened person can act on.
     *  "Generic failure" tells nobody to go and check their credit. */
    private fun reasonFor(code: Int): String = when (code) {
        SmsManager.RESULT_ERROR_NO_SERVICE -> "no signal on this phone"
        SmsManager.RESULT_ERROR_RADIO_OFF -> "the phone radio is off, check airplane mode"
        SmsManager.RESULT_ERROR_NULL_PDU -> "the message could not be built"
        SmsManager.RESULT_ERROR_LIMIT_EXCEEDED -> "the phone blocked too many messages at once"
        else -> "the carrier rejected it, check credit and the SIM"
    }

    /** What was sent, so the screen can show the same text it delivered. */
    fun compose(context: Context, payload: JSONObject): String {
        val now = System.currentTimeMillis()
        val owner = payload.optString("owner", "Someone")
        // Sama persis dengan clock() di src/lib/sos.ts, sampai titiknya.
        val clock = SimpleDateFormat("HH.mm.ss", Locale.UK)

        val lines = mutableListOf("$owner may need help.", "Detected at ${clock.format(Date(now))}.")
        val bpm = payload.optInt("bpm", 0)
        if (bpm > 0) lines.add("Heart rate $bpm bpm.")

        val fix = freshest(context, payload)
        if (fix == null) {
            lines.add("Location unavailable, please call.")
        } else {
            val label =
                if (now - fix.at > STALE_MS) "Last seen at ${clock.format(Date(fix.at))}"
                else "Location"
            lines.add(
                String.format(
                    Locale.UK,
                    "%s (%d m): https://maps.google.com/?q=%.6f,%.6f",
                    label, fix.accuracyM, fix.lat, fix.lon,
                )
            )
        }
        lines.add("Sent from RePulse. Not a medical device.")
        return lines.joinToString("\n")
    }

    /**
     * Keeps the pin moving in after the message has gone, and stops as soon
     * as it is good enough to act on.
     *
     * The order matters more than anything else here. A cold GPS needs 20
     * to 40 seconds, so a first message that waits for a good fix is a
     * message that arrives after the emergency is over, or never. The
     * coarse cached position goes out immediately, and precision follows.
     *
     * What follows is deliberately not every fix the radio produces:
     *
     * - a fix better than TARGET_ACCURACY_M ends the watch, and its message
     *   always goes out, ignoring both the gap and the ceiling. That is the
     *   one the contact actually needs
     * - anything coarser has to wait out UPDATE_MIN_GAP_MS, and has to be
     *   meaningfully better or meaningfully somewhere else, and counts
     *   against MAX_UPDATES
     * - nothing at all is sent when the fix is neither better nor
     *   elsewhere, however many times the radio repeats it
     *
     * So the worst case is four messages to each contact and the common
     * case is one or two, while the target is still what ends it.
     */
    private fun followUp(
        context: Context,
        payload: JSONObject,
        manager: SmsManager,
        numbers: JSONArray,
    ) {
        val lm = try {
            context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        } catch (e: Exception) {
            return
        }
        val provider = when {
            lm.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
            lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
            else -> return // Location is switched off on the phone itself.
        }

        // Its own thread with its own Looper: this can be called from the
        // service, and location updates need somewhere to be delivered
        // that is not the caller's stack. The timeout below runs on the
        // same Looper, so nothing here needs locking.
        val thread = HandlerThread("repulse-sos-fix").apply { start() }
        val handler = Handler(thread.looper)

        val first = freshest(context, payload)
        var lastLat = first?.lat
        var lastLon = first?.lon
        var bestAccuracy = first?.accuracyM?.toFloat() ?: Float.MAX_VALUE
        var lastUpdateMs = 0L
        var updates = 0
        var done = false

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (done) return
                remember(context, payload, location)

                val now = System.currentTimeMillis()
                // Some devices report 0 when they do not know. Zero is not
                // a perfect fix, and treating it as one would end the watch
                // on the worst reading of the night.
                val accuracy = if (location.accuracy > 0f) location.accuracy else Float.MAX_VALUE
                val reached = accuracy < TARGET_ACCURACY_M

                val moved = lastLat == null || lastLon == null ||
                    distanceBetween(lastLat!!, lastLon!!, location) > WORTH_RESENDING_M
                // Half the error bar gone, or 15 m of it, whichever is the
                // larger claim. Anything smaller is the same pin drawn
                // again.
                val sharper = bestAccuracy - accuracy >= maxOf(15f, bestAccuracy * 0.5f)
                val allowed = updates < MAX_UPDATES && now - lastUpdateMs >= UPDATE_MIN_GAP_MS

                /* Worth telling somebody, or the same pin drawn again.
                 * The first message may already have carried a good cached
                 * fix, and "reached" alone would answer it with an update
                 * that says exactly the same thing. */
                val worthTelling = sharper || moved

                if (worthTelling && (reached || allowed)) {
                    sendUpdate(manager, numbers, location)
                    updates++
                    lastUpdateMs = now
                    lastLat = location.latitude
                    lastLon = location.longitude
                    if (accuracy < bestAccuracy) bestAccuracy = accuracy
                }

                if (reached || updates >= MAX_UPDATES) {
                    done = true
                    try {
                        lm.removeUpdates(this)
                    } catch (e: Exception) {
                        /* Already gone. */
                    }
                    thread.quitSafely()
                }
            }

            @Deprecated("Required on API below 30, and this app runs from 23.")
            override fun onStatusChanged(p: String?, s: Int, e: android.os.Bundle?) = Unit
            override fun onProviderEnabled(p: String) = Unit
            override fun onProviderDisabled(p: String) = Unit
        }

        try {
            lm.requestLocationUpdates(provider, 0L, 0f, listener, thread.looper)
        } catch (e: SecurityException) {
            thread.quitSafely()
            return
        } catch (e: Exception) {
            thread.quitSafely()
            return
        }

        handler.postDelayed({
            if (done) return@postDelayed
            done = true
            try {
                lm.removeUpdates(listener)
            } catch (e: Exception) {
                /* Nothing to remove. */
            }
            // Never locked well enough, indoors usually. Whatever already
            // went out carries the best this phone had, and more silence is
            // the right amount of noise to add to that.
            thread.quitSafely()
        }, FRESH_TIMEOUT_MS)
    }

    /** One update, to every armed number. Failures are logged and dropped:
     *  the first message already arrived, and a contact who cannot be
     *  reached now could not be reached then either. */
    private fun sendUpdate(manager: SmsManager, numbers: JSONArray, location: Location) {
        val text = String.format(
            Locale.UK,
            "RePulse location update (%d m): https://maps.google.com/?q=%.6f,%.6f",
            location.accuracy.toInt(), location.latitude, location.longitude,
        )
        for (i in 0 until numbers.length()) {
            val to = numbers.optString(i)
            if (to.isBlank()) continue
            try {
                val parts = manager.divideMessage(text)
                if (parts.size > 1) {
                    manager.sendMultipartTextMessage(to, null, parts, null, null)
                } else {
                    manager.sendTextMessage(to, null, text, null, null)
                }
            } catch (e: Exception) {
                android.util.Log.e("RePulse", "location update refused for " + to, e)
            }
        }
    }

    /** Keeps the armed payload current, so a second emergency starts from
     *  the fix this one worked for. */
    private fun remember(context: Context, payload: JSONObject, location: Location) {
        try {
            payload.put("lat", location.latitude)
                .put("lon", location.longitude)
                .put("accuracyM", location.accuracy.toInt())
                .put("fixAt", location.time)
            arm(context, payload)
        } catch (e: Exception) {
            android.util.Log.e("RePulse", "could not store the new fix", e)
        }
    }

    private fun distanceBetween(lat: Double, lon: Double, to: Location): Float {
        val out = FloatArray(1)
        Location.distanceBetween(lat, lon, to.latitude, to.longitude, out)
        return out[0]
    }

    private data class Fix(val lat: Double, val lon: Double, val accuracyM: Int, val at: Long)

    /**
     * The best fix available without waiting for one.
     *
     * Two sources, because each covers the other's hole: the app arms the
     * last fix its own watcher saw, and Android keeps a last known location
     * of its own that stays warm from every other app on the phone. The
     * newer of the two wins. Neither asks the GPS to acquire, because an
     * emergency message that waits 30 seconds for a lock is a message that
     * did not go.
     */
    private fun freshest(context: Context, payload: JSONObject): Fix? {
        val armed =
            if (payload.has("lat") && payload.has("lon")) {
                Fix(
                    payload.optDouble("lat"),
                    payload.optDouble("lon"),
                    payload.optInt("accuracyM", 0),
                    payload.optLong("fixAt", 0L),
                )
            } else null

        val system = lastKnown(context)
        return when {
            armed == null -> system
            system == null -> armed
            system.at > armed.at -> system
            else -> armed
        }
    }

    private fun lastKnown(context: Context): Fix? {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine != PackageManager.PERMISSION_GRANTED && coarse != PackageManager.PERMISSION_GRANTED) {
            return null
        }
        return try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            var best: Location? = null
            for (provider in lm.getProviders(true)) {
                val here = lm.getLastKnownLocation(provider) ?: continue
                if (best == null || here.time > best!!.time) best = here
            }
            best?.let { Fix(it.latitude, it.longitude, it.accuracy.toInt(), it.time) }
        } catch (e: SecurityException) {
            null
        } catch (e: Exception) {
            android.util.Log.e("RePulse", "no last known location", e)
            null
        }
    }

    private fun fail(to: String, reason: String) =
        JSONObject().put("to", to).put("sent", false).put("reason", reason)

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
