package com.godzillamode.studyforge
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import org.json.JSONObject

object AlarmScheduler {
    private fun fire(c: Context, id: String): PendingIntent = PendingIntent.getBroadcast(
        c, id.hashCode(), Intent(c, AlarmReceiver::class.java).setAction("sf.fire.$id").putExtra("id", id),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    private fun am(c: Context) = ContextCompat.getSystemService(c, AlarmManager::class.java)!!

    /** setAlarmClock = exact, Doze-proof, exempt from exact-alarm permission. Never inexact. */
    fun schedule(c: Context, e: JSONObject) {
        val t = e.optLong("triggerAt"); if (t <= System.currentTimeMillis()) return
        val show = PendingIntent.getActivity(c, 1, Intent(c, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        am(c).setAlarmClock(AlarmManager.AlarmClockInfo(t, show), fire(c, e.getString("id")))
    }
    fun cancel(c: Context, id: String) { am(c).cancel(fire(c, id)) }

    fun rescheduleAll(c: Context) {
        val now = System.currentTimeMillis()
        for (e in AlarmStore.list(c)) {
            if (e.optBoolean("repeat") && e.optLong("triggerAt") <= now) {
                var n = e.optLong("baseAt", e.optLong("triggerAt")); while (n <= now) n += 86_400_000L
                e.put("baseAt", n); e.put("triggerAt", n); e.put("snoozes", 0); e.remove("fired"); AlarmStore.put(c, e)
            }
            schedule(c, e)
        }
    }
}
