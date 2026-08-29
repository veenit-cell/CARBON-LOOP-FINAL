package com.hivemind.carbonloop

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.health.connect.client.records.ExerciseSessionRecord
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

class HealthConnectSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    private val sharedPrefs: SharedPreferences = context.getSharedPreferences("carbonloop_health_sync", Context.MODE_PRIVATE)

    override suspend fun doWork(): Result {
        if (!HealthConnectManager.hasPermissions(applicationContext)) {
            Log.w("HealthConnectWorker", "Sync skipped: Health Connect permissions not granted.")
            return Result.failure()
        }

        try {
            val now = Instant.now()
            val lastSyncStr = sharedPrefs.getString("last_sync_time", null)
            val lastSyncTime = if (lastSyncStr != null) Instant.parse(lastSyncStr) else now.minus(24, ChronoUnit.HOURS)

            Log.i("HealthConnectWorker", "Starting sync from $lastSyncTime to $now")

            // 1. Sync Exercise Sessions
            val sessions = HealthConnectManager.readExerciseSessions(applicationContext, lastSyncTime, now)
            val syncedSessions = sharedPrefs.getStringSet("synced_session_ids", emptySet())?.toMutableSet() ?: mutableSetOf()

            val http = UrlConnectionDemoHttp()

            for (session in sessions) {
                if (session.metadata.id in syncedSessions) continue

                val exerciseType = session.exerciseType
                val activityType = when (exerciseType) {
                    ExerciseSessionRecord.EXERCISE_TYPE_WALKING, ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "walking"
                    ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "cycling"
                    else -> null
                }

                if (activityType != null) {
                    // Fetch steps during session
                    val stepsList = HealthConnectManager.readSteps(applicationContext, session.startTime, session.endTime)
                    val stepsCount = stepsList.sumOf { it.count }

                    // Fetch distance during session
                    val distanceList = HealthConnectManager.readDistance(applicationContext, session.startTime, session.endTime)
                    var distanceMeters = distanceList.sumOf { it.distance.inMeters }

                    // Fallback distance calculation if 0
                    if (distanceMeters <= 0.0 && stepsCount > 0) {
                        distanceMeters = stepsCount * 0.75
                    }

                    // Fetch calories during session
                    val caloriesList = HealthConnectManager.readActiveCalories(applicationContext, session.startTime, session.endTime)
                    val caloriesKcal = caloriesList.sumOf { it.energy.inKilocalories }

                    val durationMinutes = ChronoUnit.MINUTES.between(session.startTime, session.endTime).toInt().coerceAtLeast(1)

                    val payload = JSONObject().apply {
                        put("recordId", session.metadata.id)
                        put("activityType", activityType)
                        put("distanceKm", distanceMeters / 1000.0)
                        put("steps", stepsCount)
                        put("calories", caloriesKcal)
                        put("durationMinutes", durationMinutes)
                        put("occurredAt", session.endTime.toString())
                    }

                    Log.i("HealthConnectWorker", "Uploading exercise session: ${session.metadata.id} ($activityType, ${distanceMeters / 1000.0} km)")
                    try {
                        http.request("POST", "health", payload.toString(), session.metadata.id)
                        syncedSessions.add(session.metadata.id)
                        sharedPrefs.edit().putStringSet("synced_session_ids", syncedSessions).apply()
                    } catch (e: Exception) {
                        Log.e("HealthConnectWorker", "Failed to upload session: ${session.metadata.id}", e)
                        return Result.retry() // Retry on connection issues
                    }
                }
            }

            // 2. Sync Incremental Daily Steps (to log non-session steps)
            val zoneId = ZoneId.systemDefault()
            val todayStart = LocalDate.now(zoneId).atStartOfDay(zoneId).toInstant()
            
            val stepsTodayList = HealthConnectManager.readSteps(applicationContext, todayStart, now)
            val stepsToday = stepsTodayList.sumOf { it.count }

            val distanceTodayList = HealthConnectManager.readDistance(applicationContext, todayStart, now)
            val distanceToday = distanceTodayList.sumOf { it.distance.inMeters }

            val lastSyncedSteps = sharedPrefs.getLong("last_synced_steps_today", 0L)
            val lastSyncedDistance = sharedPrefs.getFloat("last_synced_distance_today", 0.0f).toDouble()

            val incrementalSteps = stepsToday - lastSyncedSteps
            var incrementalDistance = distanceToday - lastSyncedDistance

            if (incrementalDistance <= 0.0 && incrementalSteps > 0) {
                incrementalDistance = incrementalSteps * 0.75
            }

            if (incrementalSteps >= 1000) {
                val dateString = LocalDate.now(zoneId).format(DateTimeFormatter.ISO_LOCAL_DATE)
                val incrementRecordId = "steps_increment_${dateString}_${lastSyncedSteps}_to_${stepsToday}"

                val payload = JSONObject().apply {
                    put("recordId", incrementRecordId)
                    put("activityType", "walking")
                    put("distanceKm", incrementalDistance / 1000.0)
                    put("steps", incrementalSteps)
                    put("durationMinutes", (incrementalSteps / 100).coerceAtLeast(1))
                    put("occurredAt", now.toString())
                }

                Log.i("HealthConnectWorker", "Uploading daily steps increment: $incrementRecordId ($incrementalSteps steps)")
                try {
                    http.request("POST", "health", payload.toString(), incrementRecordId)
                    sharedPrefs.edit().apply {
                        putLong("last_synced_steps_today", stepsToday)
                        putFloat("last_synced_distance_today", distanceToday.toFloat())
                    }.apply()
                } catch (e: Exception) {
                    Log.e("HealthConnectWorker", "Failed to upload steps increment", e)
                    return Result.retry()
                }
            }

            // Save sync checkpoint
            sharedPrefs.edit().putString("last_sync_time", now.toString()).apply()
            Log.i("HealthConnectWorker", "Sync completed successfully at $now")
            return Result.success()

        } catch (e: Exception) {
            Log.e("HealthConnectWorker", "Error running Health Connect sync", e)
            return Result.retry()
        }
    }
}
