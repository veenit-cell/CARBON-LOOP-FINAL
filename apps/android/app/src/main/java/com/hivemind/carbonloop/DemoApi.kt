package com.hivemind.carbonloop

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/** Debug-only, synthetic/mock demo transport; never use for production data. */
interface DemoHttp { fun request(method: String, path: String, body: String? = null, key: String? = null): String }
class UrlConnectionDemoHttp(private val baseUrl: String = BuildConfig.DEMO_API_BASE_URL) : DemoHttp {
    override fun request(method: String, path: String, body: String?, key: String?): String {
        val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = 5_000; readTimeout = 5_000; setRequestProperty("Accept", "application/json"); if (key != null) setRequestProperty("Idempotency-Key", key) }
        if (body != null) { connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json"); connection.outputStream.bufferedWriter().use { it.write(body) } }
        val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() } ?: "{\"message\":\"Demo API unavailable\"}"
        if (connection.responseCode !in 200..299) throw IllegalStateException(JSONObject(text).optString("message", "Demo API unavailable"))
        return text
    }
}
sealed interface DemoState { data object Loading : DemoState; data class Success(val text: String) : DemoState; data object Empty : DemoState; data class Error(val message: String) : DemoState }
class DemoRepository(private val http: DemoHttp = UrlConnectionDemoHttp()) {
    private fun write(path: String, json: JSONObject) = http.request("POST", path, json.toString(), UUID.randomUUID().toString())
    fun quests() = http.request("GET", "quests")
    fun startQuest(templateId: String) = write("quest-runs", JSONObject().put("questTemplateId", templateId))
    fun completeQuest(id: String, km: String) = write("quest-runs/$id/complete", JSONObject().put("distanceKm", km).put("replacedMotorizedBaseline", true))
    fun shuttle() = write("evidence/shuttle-checkin", JSONObject().put("token", "SIMULATED_DEMO_ONLY_shuttle_token_one"))
    fun progress() = http.request("GET", "player/progress")
    fun ledger() = http.request("GET", "scores/ledger")
    fun rewards() = http.request("GET", "rewards/catalogue")
    fun redeem() = write("rewards/redemptions", JSONObject().put("rewardItemId", "SYNTHETIC_TEST_ONLY_canteen_reward"))
}
