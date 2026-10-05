package com.godzillamode.studyforge
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

object Notifs {
    const val ALARM_CH = "sf_alarm_urgent"; const val LEAD_CH = "sf_lead_calm"; const val ALARM_NOTIF_ID = 4201
    private const val PI = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    fun channels(c: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = ContextCompat.getSystemService(c, NotificationManager::class.java)!!
        nm.createNotificationChannel(NotificationChannel(ALARM_CH, "Study alarms", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Full-screen study alarms"; setSound(null, null); enableVibration(false); lockscreenVisibility = Notification.VISIBILITY_PUBLIC })
        nm.createNotificationChannel(NotificationChannel(LEAD_CH, "Study reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Calm heads-up before a block"; lockscreenVisibility = Notification.VISIBILITY_PUBLIC })
    }
    private fun body(e: JSONObject): String {
        val t = e.optJSONArray("topics"); val names = (0 until (t?.length() ?: 0)).map { t!!.optString(it) }
        return listOf(e.optString("subject"), names.joinToString(", ")).filter { it.isNotBlank() }.joinToString(" · ")
    }
    fun lead(c: Context, e: JSONObject) {
        channels(c)
        val open = PendingIntent.getActivity(c, 2, Intent(c, MainActivity::class.java), PI)
        val mins = ((e.optLong("startAt", e.optLong("triggerAt")) - System.currentTimeMillis()) / 60000).coerceAtLeast(1)
        val n = NotificationCompat.Builder(c, LEAD_CH).setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Starting in ~$mins min: ${e.optString("title")}").setContentText(body(e))
            .setContentIntent(open).setAutoCancel(true).build()
        try { NotificationManagerCompat.from(c).notify(e.getString("id").hashCode(), n) } catch (ex: SecurityException) {}
    }
    fun alarm(c: Context, e: JSONObject): Notification {
        channels(c)
        val bid = e.optString("blockId")
        val screen = Intent(c, AlarmActivity::class.java).putExtra("blockId", bid).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val fs = PendingIntent.getActivity(c, 7, screen, PI)
        val snooze = PendingIntent.getBroadcast(c, 8, Intent(c, ActionReceiver::class.java).setAction("sf.snooze.$bid").putExtra("blockId", bid).putExtra("action", "snooze").putExtra("minutes", 5), PI)
        return NotificationCompat.Builder(c, ALARM_CH).setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(e.optString("title")).setContentText(body(e))
            .setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true).setAutoCancel(false)
            .setFullScreenIntent(fs, true).setContentIntent(fs)
            .addAction(0, "Snooze 5 min", snooze).build()
    }
}
