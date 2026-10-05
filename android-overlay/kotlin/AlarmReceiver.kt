package com.godzillamode.studyforge
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val id = i.getStringExtra("id") ?: return
        val e = AlarmStore.get(c, id) ?: return
        e.put("fired", System.currentTimeMillis()); AlarmStore.put(c, e)
        if (e.optString("kind") == "lead") { Notifs.lead(c, e); return }
        ContextCompat.startForegroundService(c, Intent(c, AlarmService::class.java).putExtra("id", id))
    }
}
