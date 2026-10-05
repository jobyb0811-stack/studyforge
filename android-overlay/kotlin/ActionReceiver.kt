package com.godzillamode.studyforge
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ActionReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        AlarmController.act(c, i.getStringExtra("blockId") ?: return, i.getStringExtra("action") ?: "snooze", i.getIntExtra("minutes", 5), i.getStringExtra("reason") ?: "")
    }
}
