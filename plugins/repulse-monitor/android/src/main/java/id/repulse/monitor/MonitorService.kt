package id.repulse.monitor

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Stays alive while the screen is off, and puts the alert in front of a
 * sleeping person when the band says so.
 *
 * Two notification channels rather than one, and the split matters. The
 * ongoing channel is silent and unimportant — it exists only because
 * Android requires a notification to keep a foreground service, and
 * nobody should be woken by the fact that monitoring is working. The
 * alert channel is the opposite: maximum importance, alarm category,
 * bypasses Do Not Disturb, and carries a full-screen intent.
 *
 * A single channel cannot be both, and the version that tried would have
 * either buzzed all night or stayed silent during an emergency.
 */
class MonitorService : Service() {

    companion object {
        const val ONGOING_CHANNEL = "repulse.monitoring"
        const val ALERT_CHANNEL = "repulse.alert"
        const val ONGOING_ID = 4101
        const val ALERT_ID = 4102

        const val ACTION_START = "id.repulse.monitor.START"
        const val ACTION_ALERT = "id.repulse.monitor.ALERT"
        const val ACTION_CLEAR = "id.repulse.monitor.CLEAR"

        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
        const val EXTRA_STAGE = "stage"

        @Volatile
        var running: Boolean = false
            private set
    }

    private var wakeLock: PowerManager.WakeLock? = null

    // Kept so a promotion triggered by an alert, or by the OS restarting
    // us with a null intent, still names the night it belongs to.
    private var title = "RePulse is watching"
    private var body = "Monitoring until morning."

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.getStringExtra(EXTRA_TITLE)?.let { title = it }
        intent?.getStringExtra(EXTRA_BODY)?.let { body = it }

        when (intent?.action) {
            // Posted before the service is promoted, deliberately. If
            // promotion then fails, the alert has already gone out — this
            // is the one message that has to survive everything else
            // going wrong.
            ACTION_ALERT -> showAlert(intent.getIntExtra(EXTRA_STAGE, 3))
            ACTION_CLEAR -> notifier().cancel(ALERT_ID)
            else -> running = true
        }

        // Every path promotes, not only START. `startForegroundService()`
        // gives five seconds to reach `startForeground()` whatever the
        // action was, and missing the window kills the process — which is
        // how raising an alert could take the app down with it.
        if (!promote()) return START_NOT_STICKY

        if (!running) {
            // An alert alone asked for this; no night is being watched, so
            // there is nothing to keep running. The alert notification is
            // the system's now and outlives us.
            stopSelf()
            return START_NOT_STICKY
        }

        acquireWakeLock()
        // Restarted if the OS reclaims us mid-night. Without this a
        // low-memory kill at 2am ends the night silently, which is the
        // failure nobody would find out about until morning.
        return START_STICKY
    }

    /**
     * Foreground, or down — never a crash. Android 14+ refuses a
     * `connectedDevice` service unless Nearby devices is granted, and the
     * refusal arrives as a SecurityException on the main thread. Letting
     * it through kills the app at the one hour it exists to survive.
     */
    private fun promote(): Boolean = try {
        startForeground(ONGOING_ID, ongoing(title, body))
        true
    } catch (e: Exception) {
        android.util.Log.e("RePulse", "foreground service refused", e)
        running = false
        stopSelf()
        false
    }

    override fun onDestroy() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        running = false
        super.onDestroy()
    }

    private fun notifier() = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = notifier()

        // Deliberately IMPORTANCE_LOW: silent, no heads-up. It is a
        // receipt, not a message.
        manager.createNotificationChannel(
            NotificationChannel(
                ONGOING_CHANNEL,
                "Monitoring",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shown while RePulse is watching overnight."
                setShowBadge(false)
            }
        )

        manager.createNotificationChannel(
            NotificationChannel(
                ALERT_CHANNEL,
                "Emergency alert",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Raised when the band reports an anomaly."
                setBypassDnd(true)
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
        )
    }

    private fun ongoing(title: String, body: String): Notification =
        NotificationCompat.Builder(this, ONGOING_CHANNEL)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openApp(null))
            .build()

    /**
     * The full-screen intent. On a locked phone Android launches the
     * activity directly rather than showing a banner, which is the only
     * behaviour that reaches someone asleep.
     *
     * It still needs a notification attached: if the OS declines to launch
     * — permission withdrawn, or a manufacturer being creative — the
     * heads-up is what remains, and silence is not an acceptable fallback
     * for this particular message.
     */
    private fun showAlert(stage: Int) {
        val open = openApp(stage)
        val notification = NotificationCompat.Builder(this, ALERT_CHANNEL)
            .setContentTitle("Something looks wrong")
            .setContentText("Move your arm and this stops.")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOngoing(true)
            .setFullScreenIntent(open, true)
            .setContentIntent(open)
            .build()

        notifier().notify(ALERT_ID, notification)
    }

    /** Reopens the app's own activity; the WebView routes to /alert from
     *  the extra. No second activity to keep in step with the first. */
    private fun openApp(stage: Int?): PendingIntent {
        val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            if (stage != null) putExtra(EXTRA_STAGE, stage)
        }
        return PendingIntent.getActivity(
            this,
            if (stage != null) 1 else 0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * A partial wake lock keeps the CPU running so the BLE callbacks that
     * will live here keep being delivered during Doze. It does not touch
     * the screen — the screen is the alert's job, not monitoring's.
     */
    private fun acquireWakeLock() {
        if (wakeLock != null) return
        val power = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "repulse:monitor").apply {
            setReferenceCounted(false)
            acquire()
        }
    }
}
