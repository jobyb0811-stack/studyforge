package com.godzillamode.studyforge
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) { AlarmScheduler.rescheduleAll(c) }
}
