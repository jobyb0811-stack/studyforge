package com.godzillamode.studyforge
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Native source of truth for alarms so BootReceiver works without JS. */
object AlarmStore {
    private fun p(c: Context) = c.getSharedPreferences("sf_alarms", Context.MODE_PRIVATE)
    @Synchronized fun all(c: Context): JSONObject = try { JSONObject(p(c).getString("alarms", "{}") ?: "{}") } catch (e: Exception) { JSONObject() }
    @Synchronized private fun save(c: Context, o: JSONObject) { p(c).edit().putString("alarms", o.toString()).apply() }
    @Synchronized fun get(c: Context, id: String): JSONObject? = all(c).optJSONObject(id)
    @Synchronized fun put(c: Context, e: JSONObject) { val a = all(c); a.put(e.getString("id"), e); save(c, a) }
    @Synchronized fun remove(c: Context, id: String) { val a = all(c); a.remove(id); save(c, a) }
    @Synchronized fun list(c: Context): List<JSONObject> { val a = all(c); return a.keys().asSequence().mapNotNull { a.optJSONObject(it) }.toList() }
    @Synchronized fun addPending(c: Context, r: JSONObject) {
        val arr = try { JSONArray(p(c).getString("pending", "[]")) } catch (e: Exception) { JSONArray() }
        arr.put(r); p(c).edit().putString("pending", arr.toString()).apply()
    }
    @Synchronized fun takePending(c: Context): JSONArray {
        val arr = try { JSONArray(p(c).getString("pending", "[]")) } catch (e: Exception) { JSONArray() }
        p(c).edit().remove("pending").apply(); return arr
    }
    fun sound(c: Context): String = p(c).getString("sound", "soft") ?: "soft"
    fun setSound(c: Context, s: String) { p(c).edit().putString("sound", s).apply() }
}
