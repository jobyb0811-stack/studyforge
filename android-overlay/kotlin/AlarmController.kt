package com.godzillamode.studyforge
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject
import java.util.UUID

object AlarmController {
    const val MAX_SNOOZE = 3
    /** action: start | snooze | skip | missed. Snooze beyond MAX_SNOOZE becomes missed. */
    fun act(c: Context, blockId: String, action: String, minutes: Int = 5, reason: String = ""): JSONObject {
        c.stopService(Intent(c, AlarmService::class.java))
        NotificationManagerCompat.from(c).cancel(Notifs.ALARM_NOTIF_ID)
        val now = System.currentTimeMillis()
        val e = AlarmStore.get(c, "$blockId:alarm")
        var eff = action; var used = e?.optInt("snoozes", 0) ?: 0
        if (action == "snooze") {
            if (e == null || used >= MAX_SNOOZE) eff = "missed" else {
                used++; e.put("snoozes", used); e.put("triggerAt", now + minutes * 60_000L); e.remove("fired")
                AlarmStore.put(c, e); AlarmScheduler.schedule(c, e)
            }
        }
        if (eff != "snooze" && e != null && e.optBoolean("repeat")) {
            var n = e.optLong("baseAt", e.optLong("triggerAt")); while (n <= now) n += 86_400_000L
            e.put("baseAt", n); e.put("triggerAt", n); e.put("snoozes", 0); e.remove("fired")
            AlarmStore.put(c, e); AlarmScheduler.schedule(c, e)
        }
        val rec = JSONObject().put("id", UUID.randomUUID().toString()).put("blockId", blockId).put("action", eff)
            .put("minutes", minutes).put("reason", reason).put("at", now).put("snoozes", used).put("snoozesLeft", MAX_SNOOZE - used)
        AlarmStore.addPending(c, rec)
        Handler(Looper.getMainLooper()).post { AlarmActivity.current?.finishAndRemoveTask() }
        if (eff == "start") c.startActivity(Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP))
        AlarmPlugin.ping(rec)
        return rec
    }
}
