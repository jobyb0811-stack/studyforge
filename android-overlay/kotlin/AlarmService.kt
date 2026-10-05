package com.godzillamode.studyforge
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

class AlarmService : Service() {
    private var player: MediaPlayer? = null
    private var vib: Vibrator? = null
    private val h = Handler(Looper.getMainLooper())
    private var vol = 0.1f
    private var blockId = ""
    private val ramp = object : Runnable { override fun run() {
        vol = minOf(1f, vol + 0.045f); player?.setVolume(vol, vol); if (vol < 1f) h.postDelayed(this, 1000) } } // 20 s ramp
    private val timeout = Runnable { AlarmController.act(this, blockId, "missed") }          // 5 min unacknowledged

    override fun onBind(i: Intent?): IBinder? = null
    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        val id = i?.getStringExtra("id"); val e = id?.let { AlarmStore.get(this, it) }
        if (e == null) { stopSelf(); return START_NOT_STICKY }
        blockId = e.optString("blockId")
        val n = Notifs.alarm(this, e)
        if (Build.VERSION.SDK_INT >= 29) startForeground(Notifs.ALARM_NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        else startForeground(Notifs.ALARM_NOTIF_ID, n)
        startSound(); startVibration()
        h.removeCallbacks(timeout); h.postDelayed(timeout, 5 * 60_000L)
        return START_NOT_STICKY
    }
    private fun startSound() {
        player?.release(); vol = 0.1f
        val s = AlarmStore.sound(this)
        val uri = if (s.startsWith("uri:")) Uri.parse(s.substring(4)) else Uri.parse("android.resource://$packageName/raw/alarm_$s")
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
        fun make(u: Uri) = MediaPlayer().apply { setAudioAttributes(attrs); setDataSource(this@AlarmService, u); isLooping = true; setVolume(vol, vol); prepare(); start() }
        player = try { make(uri) } catch (ex: Exception) {
            try { make(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)) } catch (ex2: Exception) { null } }
        h.removeCallbacks(ramp); h.postDelayed(ramp, 1000)
    }
    @Suppress("DEPRECATION")
    private fun startVibration() {
        val v = if (Build.VERSION.SDK_INT >= 31) (getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
                else getSystemService(VIBRATOR_SERVICE) as Vibrator
        vib = v
        val a = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
        if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 500), 0), a)
        else v.vibrate(longArrayOf(0, 700, 500), 0)
    }
    override fun onDestroy() {
        h.removeCallbacksAndMessages(null)
        try { player?.stop() } catch (ex: Exception) {}
        player?.release(); player = null; vib?.cancel(); super.onDestroy()
    }
}
