package id.repulse.monitor

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

private const val NEARBY = "nearby"

/** PRD O4: the number one cause of a night that stops without telling
 *  anybody. Each pair is package to activity. */
private val AUTOSTART_SCREENS = listOf(
    "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
    "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
    "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
    "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
    "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
    "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity",
    "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
    "com.huawei.systemmanager" to "com.huawei.systemmanager.optimize.process.ProtectActivity",
    "com.samsung.android.lool" to "com.samsung.android.sm.ui.battery.BatteryActivity",
    "com.transsion.phonemanager" to "com.itel.autobootmanager.activity.AutoBootMgrActivity",
)

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
     * O4's two questions, answered by the phone rather than by a table of
     * manufacturer names.
     *
     * `available` is whether one of the screens below actually resolves
     * here, which is a different question from who built the phone: the
     * activity names move between OS versions, and a vendor list said
     * "Xiaomi" on an Oppo for as long as the manufacturer was hard-coded.
     * Asking the package manager cannot be wrong about it.
     */
    @PluginMethod
    fun autostart(call: PluginCall) {
        call.resolve(
            JSObject()
                .put("manufacturer", Build.MANUFACTURER ?: "")
                .put("available", resolvable() != null)
        )
    }

    /**
     * Opens the vendor's autostart list, or the app's own settings page
     * when there is none — which is where battery behaviour lives on
     * stock Android, and is never a dead end.
     *
     * `opened` is what actually happened. The screen gates its "I have
     * turned it on" button on this, and the old version set that flag
     * from a handler that opened nothing at all.
     */
    @PluginMethod
    fun openAutostart(call: PluginCall) {
        val component = resolvable()
        val intent =
            if (component != null) {
                Intent().setComponent(component)
            } else {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.fromParts("package", context.packageName, null))
            }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
            call.resolve(JSObject().put("opened", true).put("vendor", component != null))
        } catch (e: Exception) {
            android.util.Log.e("RePulse", "autostart settings refused", e)
            call.resolve(JSObject().put("opened", false).put("vendor", false))
        }
    }

    /**
     * Every vendor autostart screen we know of, in no particular order —
     * only one will resolve on any given phone.
     *
     * ponytail: a list, not a lookup by manufacturer. A phone that answers
     * to one of these is one of these, whatever Build.MANUFACTURER says,
     * and Realme, OnePlus and Oppo all answer to the ColorOS entries.
     */
    private fun resolvable(): ComponentName? =
        AUTOSTART_SCREENS
            .map { (pkg, cls) -> ComponentName(pkg, cls) }
            .firstOrNull { c ->
                context.packageManager.resolveActivity(Intent().setComponent(c), 0) != null
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
