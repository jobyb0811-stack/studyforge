package com.godzillamode.studyforge
import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.PowerManager
import android.provider.MediaStore
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.result.ActivityResult
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONObject
import java.io.File
import java.util.concurrent.CopyOnWriteArrayList

@CapacitorPlugin(name = "AlarmPlugin", permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")])
class AlarmPlugin : Plugin() {
    companion object {
        private val instances = CopyOnWriteArrayList<AlarmPlugin>()
        fun ping(rec: JSONObject) { val o = JSObject(rec.toString()); instances.forEach { it.emit(o) } }
    }
    fun emit(o: JSObject) { notifyListeners("alarmAction", o) }
    override fun load() { instances.add(this) }
    override fun handleOnDestroy() { instances.remove(this) }

    private fun perms(): JSObject {
        val c = context
        val am = ContextCompat.getSystemService(c, AlarmManager::class.java)!!
        val pm = ContextCompat.getSystemService(c, PowerManager::class.java)!!
        val exact = if (Build.VERSION.SDK_INT >= 31) am.canScheduleExactAlarms() else true
        val fs = if (Build.VERSION.SDK_INT >= 34) ContextCompat.getSystemService(c, NotificationManager::class.java)!!.canUseFullScreenIntent() else true
        return JSObject().put("notifications", NotificationManagerCompat.from(c).areNotificationsEnabled())
            .put("exactAlarm", exact).put("fullScreen", fs)
            .put("batteryExempt", pm.isIgnoringBatteryOptimizations(c.packageName))
            .put("sdk", Build.VERSION.SDK_INT).put("manufacturer", Build.MANUFACTURER.lowercase())
    }
    private fun launch(i: Intent) {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try { context.startActivity(i) } catch (ex: Exception) {
            try { context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (ex2: Exception) {} }
    }
    private fun pkg() = Uri.parse("package:" + context.packageName)

    @PluginMethod fun schedule(call: PluginCall) {
        val arr = call.getArray("alarms") ?: return call.reject("alarms required")
        var n = 0
        for (i in 0 until arr.length()) { val o = arr.getJSONObject(i); AlarmStore.put(context, o); AlarmScheduler.schedule(context, o); n++ }
        call.resolve(JSObject().put("count", n))
    }
    @PluginMethod fun cancel(call: PluginCall) {
        val ids = call.getArray("ids") ?: JSArray()
        for (i in 0 until ids.length()) { val id = ids.getString(i); AlarmScheduler.cancel(context, id); AlarmStore.remove(context, id) }
        call.resolve()
    }
    /** keepPast=true keeps fired/past entries (evidence for the missed-alarm detector) and mid-snooze entries. */
    @PluginMethod fun cancelAll(call: PluginCall) {
        val keep = call.getBoolean("keepPast", true) ?: true; val now = System.currentTimeMillis()
        for (e in AlarmStore.list(context)) {
            val id = e.getString("id"); val t = e.optLong("triggerAt")
            if (t < now - 7 * 86_400_000L) { AlarmStore.remove(context, id); continue }
            if (keep && (t <= now || e.optInt("snoozes", 0) > 0)) continue
            AlarmScheduler.cancel(context, id); AlarmStore.remove(context, id)
        }
        call.resolve()
    }
    @PluginMethod override fun checkPermissions(call: PluginCall) { call.resolve(perms()) }
    @PluginMethod fun requestNotifications(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) requestPermissionForAlias("notifications", call, "notifResult")
        else { openNotificationSettings(call) }
    }
    @PermissionCallback fun notifResult(call: PluginCall) { call.resolve(perms()) }
    @PluginMethod fun openNotificationSettings(call: PluginCall) {
        launch(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)); call.resolve(perms())
    }
    @PluginMethod fun openExactAlarmSettings(call: PluginCall) { launch(Intent("android.settings.REQUEST_SCHEDULE_EXACT_ALARM", pkg())); call.resolve() }
    @PluginMethod fun openFullScreenSettings(call: PluginCall) { launch(Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT", pkg())); call.resolve() }
    @PluginMethod fun requestBatteryExemption(call: PluginCall) { launch(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, pkg())); call.resolve() }
    @PluginMethod fun getScheduled(call: PluginCall) {
        val arr = JSArray(); AlarmStore.list(context).sortedBy { it.optLong("triggerAt") }.forEach { arr.put(it) }
        call.resolve(JSObject().put("alarms", arr).put("now", System.currentTimeMillis()))
    }
    @PluginMethod fun getAlarmInfo(call: PluginCall) {
        val e = AlarmStore.get(context, (call.getString("blockId") ?: "") + ":alarm")
        call.resolve(JSObject().put("info", e ?: JSONObject.NULL))
    }
    @PluginMethod fun alarmAction(call: PluginCall) {
        val r = AlarmController.act(context, call.getString("blockId") ?: return call.reject("blockId required"),
            call.getString("action") ?: "snooze", call.getInt("minutes") ?: 5, call.getString("reason") ?: "")
        call.resolve(JSObject(r.toString()))
    }
    @PluginMethod fun consumePendingActions(call: PluginCall) { call.resolve(JSObject().put("actions", AlarmStore.takePending(context))) }
    @PluginMethod fun keepAwake(call: PluginCall) {
        val on = call.getBoolean("on", true) ?: true
        activity.runOnUiThread { if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
        call.resolve()
    }
    /** Writes a JSON backup to Downloads/StudyForge (API 29+, no permission needed) or app storage on older phones. */
    @PluginMethod fun saveBackup(call: PluginCall) {
        val name = call.getString("name") ?: "studyforge-backup.json"; val data = call.getString("data") ?: return call.reject("data required")
        try {
            val where: String
            if (Build.VERSION.SDK_INT >= 29) {
                val v = ContentValues().apply { put(MediaStore.MediaColumns.DISPLAY_NAME, name); put(MediaStore.MediaColumns.MIME_TYPE, "application/json")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/StudyForge") }
                val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v) ?: return call.reject("Could not create file")
                context.contentResolver.openOutputStream(uri)!!.use { it.write(data.toByteArray()) }
                where = "Downloads/StudyForge/" + name
            } else {
                val f = File(context.getExternalFilesDir(null) ?: context.filesDir, name); f.writeText(data); where = f.absolutePath
            }
            call.resolve(JSObject().put("path", where))
        } catch (ex: Exception) { call.reject(ex.message ?: "save failed") }
    }
    @PluginMethod fun setSound(call: PluginCall) { AlarmStore.setSound(context, call.getString("sound") ?: "soft"); call.resolve(JSObject().put("sound", AlarmStore.sound(context))) }
    @PluginMethod fun getSound(call: PluginCall) { call.resolve(JSObject().put("sound", AlarmStore.sound(context))) }
    @PluginMethod fun pickRingtone(call: PluginCall) {
        val i = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
            .putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false).putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Alarm tone")
        startActivityForResult(call, i, "ringtoneResult")
    }
    @ActivityCallback fun ringtoneResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        @Suppress("DEPRECATION") val u = if (result.resultCode == Activity.RESULT_OK) result.data?.getParcelableExtra<Uri>(RingtoneManager.EXTRA_RINGTONE_PICKED_URI) else null
        if (u != null) AlarmStore.setSound(context, "uri:$u")
        call.resolve(JSObject().put("sound", AlarmStore.sound(context)))
    }
}
