package com.godzillamode.studyforge
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.OnBackPressedCallback
import com.getcapacitor.BridgeActivity

/** Shown over the lock screen. Hosts the same web app and navigates to /alarm/:blockId. */
class AlarmActivity : BridgeActivity() {
    companion object { var current: AlarmActivity? = null }
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AlarmPlugin::class.java)
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
        else @Suppress("DEPRECATION") window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        super.onCreate(savedInstanceState)
        current = this
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { bridge.webView.evaluateJavascript("window.__alarmBack&&window.__alarmBack()", null) } })
        route(intent)
    }
    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); route(intent) }
    private fun route(i: Intent) {
        val id = i.getStringExtra("blockId") ?: return
        bridge.webView.post { bridge.webView.loadUrl(bridge.localUrl + "/alarm/" + android.net.Uri.encode(id)) }
    }
    override fun onDestroy() { if (current === this) current = null; super.onDestroy() }
}
