package id.repulse.monitor

import android.Manifest
import android.content.Intent
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

private const val NEARBY = "nearby"

/**
 * The bridge. Thin on purpose — everything that has to survive the
 * WebView being frozen lives in the service, and everything here is a
 * message from a WebView that is, by definition, awake.
 */
@CapacitorPlugin(
    name = "RepulseMonitor",
    permissions = [
        Permission(
            alias = NEARBY,
            strings = [
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN,
            ]
        )
    ]
)
class RepulseMonitorPlugin : Plugin() {

    override fun load() {
        super.load()
        allowOverLockScreen()
    }

    /**
     * Nearby devices has to be granted before the service can start at
     * all — a `connectedDevice` foreground service is refused outright
     * without it, and the refusal arrives as a SecurityException on the
     * system's main thread, where no JavaScript catch can reach it.
     */
    @PluginMethod
    fun start(call: PluginCall) {
        if (nearbyMissing()) {
            requestPermissionForAlias(NEARBY, call, "nearbyResult")
            return
        }
        launch(call)
    }

    @PermissionCallback
    fun nearbyResult(call: PluginCall) {
        if (nearbyMissing()) {
            // Refused. Say so plainly: starting a service the OS will
            // reject is worse than not starting one, and pretending it
            // started is worst of all — that is a night nobody watches.
            call.resolve(JSObject().put("started", false))
            return
        }
        launch(call)
    }

    private fun nearbyMissing(): Boolean =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            getPermissionState(NEARBY) != PermissionState.GRANTED

    private fun launch(call: PluginCall) {
        send(
            Intent(context, MonitorService::class.java).apply {
                action = MonitorService.ACTION_START
                putExtra(MonitorService.EXTRA_TITLE, call.getString("title") ?: "RePulse is watching")
                putExtra(MonitorService.EXTRA_BODY, call.getString("body") ?: "Monitoring until morning.")
            }
        )
        call.resolve(JSObject().put("started", true))
    }

    /** Always the foreground variant. The alert path can fire while the
     *  app is behind a lock screen, and a plain startService() is refused
     *  from the background. */
    private fun send(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        context.stopService(Intent(context, MonitorService::class.java))
        call.resolve()
    }

    @PluginMethod
    fun isRunning(call: PluginCall) {
        val result = com.getcapacitor.JSObject()
        result.put("running", MonitorService.running)
        call.resolve(result)
    }

    @PluginMethod
    fun raiseAlert(call: PluginCall) {
        send(
            Intent(context, MonitorService::class.java).apply {
                action = MonitorService.ACTION_ALERT
                putExtra(MonitorService.EXTRA_STAGE, call.getInt("stage") ?: 3)
            }
        )
        // The activity may already be in front — a phone in someone's hand
        // when the anomaly fires. Ask for the screen either way; the
        // notification handles the locked case, this handles the rest.
        allowOverLockScreen()
        call.resolve()
    }

    @PluginMethod
    fun clearAlert(call: PluginCall) {
        send(
            Intent(context, MonitorService::class.java).apply {
                action = MonitorService.ACTION_CLEAR
            }
        )
        call.resolve()
    }

    /**
     * Lets the app's own activity appear over the lock screen and turn the
     * screen on, set at runtime so Capacitor's generated MainActivity does
     * not have to be edited — that file lives under android/, which is
     * gitignored, and an edit there is lost on the next clone.
     */
    private fun allowOverLockScreen() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) return
        activity?.runOnUiThread {
            activity.setShowWhenLocked(true)
            activity.setTurnScreenOn(true)
        }
    }
}
