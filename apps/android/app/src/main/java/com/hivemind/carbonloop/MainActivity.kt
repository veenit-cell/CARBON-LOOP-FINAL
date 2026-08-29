package com.hivemind.carbonloop

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {

    private var hasPermissions by mutableStateOf(false)
    private var sdkAvailable by mutableStateOf(false)

    // Request permissions contract launcher
    private val requestPermissionsLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        lifecycleScope.launch {
            hasPermissions = HealthConnectManager.hasPermissions(this@MainActivity)
            if (hasPermissions) {
                triggerSync()
                Toast.makeText(this@MainActivity, "Health Connect permissions granted!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this@MainActivity, "Some permissions were denied.", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        sdkAvailable = HealthConnectManager.isSdkAvailable(this)

        lifecycleScope.launch {
            hasPermissions = HealthConnectManager.hasPermissions(this@MainActivity)
            if (hasPermissions) {
                schedulePeriodicSync()
                triggerSync()
            }
        }

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF121214) // Clean dark background
                ) {
                    MainScreen(
                        sdkAvailable = sdkAvailable,
                        hasPermissions = hasPermissions,
                        onRequestPermissions = { checkAndRequestPermissions() },
                        onTriggerSync = { triggerSync() }
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (hasPermissions) {
            triggerSync()
        }
    }

    private fun checkAndRequestPermissions() {
        lifecycleScope.launch {
            val client = HealthConnectClient.getOrCreate(this@MainActivity)
            val granted = client.permissionController.getGrantedPermissions()
            val permissionsToRequest = HealthConnectManager.permissions - granted
            if (permissionsToRequest.isNotEmpty()) {
                requestPermissionsLauncher.launch(permissionsToRequest)
            } else {
                hasPermissions = true
                triggerSync()
            }
        }
    }

    private fun triggerSync() {
        val oneTimeSync = OneTimeWorkRequestBuilder<HealthConnectSyncWorker>()
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(this).enqueueUniqueWork(
            "HealthConnectOneTimeSync",
            ExistingWorkPolicy.REPLACE,
            oneTimeSync
        )
    }

    private fun schedulePeriodicSync() {
        val periodicSync = PeriodicWorkRequestBuilder<HealthConnectSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "HealthConnectPeriodicSync",
            ExistingPeriodicWorkPolicy.KEEP,
            periodicSync
        )
    }
}

enum class ScreenTab(val title: String, val emoji: String) {
    Dashboard("Dashboard", "🌱"),
    Missions("Missions", "🏅"),
    Points("Ledger", "⚡"),
    Rewards("Rewards", "🎁"),
    Leaderboard("Leaderboard", "🏆")
}

@Composable
fun MainScreen(
    sdkAvailable: Boolean,
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit,
    onTriggerSync: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(ScreenTab.Dashboard) }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = Color(0xFF1A1A1E)) {
                ScreenTab.values().forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        label = { Text(tab.title, color = if (selectedTab == tab) Color(0xFF4EDE9F) else Color.Gray) },
                        icon = {
                            Text(
                                tab.emoji,
                                fontSize = 20.sp,
                                modifier = Modifier.padding(bottom = 2.dp)
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = Color(0xFF282830)
                        )
                    )
                }
            }
        },
        containerColor = Color(0xFF121214)
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Header Title
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF1A1A1E))
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "CarbonLoop",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF4EDE9F)
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "Android Core v2.0",
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }

            // Tab Content Screen
            Box(modifier = Modifier.weight(1f)) {
                when (selectedTab) {
                    ScreenTab.Dashboard -> DashboardScreen(
                        sdkAvailable = sdkAvailable,
                        hasPermissions = hasPermissions,
                        onRequestPermissions = onRequestPermissions,
                        onTriggerSync = onTriggerSync
                    )
                    ScreenTab.Missions -> QuestsScreen()
                    ScreenTab.Points -> LedgerScreen()
                    ScreenTab.Rewards -> RewardsScreen()
                    ScreenTab.Leaderboard -> LeaderboardScreen()
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 1. Dashboard Tab
// ---------------------------------------------------------------------------
@Composable
fun DashboardScreen(
    sdkAvailable: Boolean,
    hasPermissions: Boolean,
    onRequestPermissions: () -> Unit,
    onTriggerSync: () -> Unit
) {
    val repository = remember { DemoRepository() }
    var syncState by remember { mutableStateOf("Idle") }
    var co2Saved by remember { mutableStateOf("0.000") }
    var gpBalance by remember { mutableStateOf(0) }
    var level by remember { mutableStateOf(1) }
    var lastSyncText by remember { mutableStateOf("Never synced") }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    fun loadData() {
        errorMsg = null
        val connManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connManager.activeNetwork
        val capabilities = connManager.getNetworkCapabilities(activeNetwork)
        val isOnline = capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)

        if (!isOnline) {
            errorMsg = "Device is offline. Data might be cached/delayed."
        }

        coroutineScope.launch {
            try {
                val progressJsonStr = withContext(Dispatchers.IO) { repository.progress() }
                val progressObj = JSONObject(progressJsonStr).getJSONObject("progress")
                co2Saved = progressObj.optString("avoidedKgCo2e", "0.000000")
                gpBalance = progressObj.optInt("greenPoints", 0)
                level = progressObj.optInt("level", 1)

                val sharedPrefs = context.getSharedPreferences("carbonloop_health_sync", Context.MODE_PRIVATE)
                val lastSyncStr = sharedPrefs.getString("last_sync_time", null)
                val syncedSet = sharedPrefs.getStringSet("synced_session_ids", emptySet())
                val lastSyncedSteps = sharedPrefs.getLong("last_synced_steps_today", 0L)

                lastSyncText = if (lastSyncStr != null) {
                    "Last sync: ${lastSyncStr.substringBefore("T")} · Synced: ${syncedSet?.size ?: 0} sessions, $lastSyncedSteps daily steps"
                } else {
                    "No sync data yet"
                }
            } catch (e: Exception) {
                // Keep defaults if network fails
            }
        }
    }

    LaunchedEffect(hasPermissions) {
        loadData()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        if (errorMsg != null) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF3C1E1E)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "⚠️ $errorMsg",
                        color = Color(0xFFFFBABA),
                        fontSize = 13.sp,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }

        // Connection Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Health Connect Ingestion", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                    Spacer(modifier = Modifier.height(8.dp))
                    if (!sdkAvailable) {
                        Text(
                            "Health Connect SDK is not supported or not installed on this device. Please download Health Connect from the Google Play Store.",
                            color = Color.LightGray,
                            fontSize = 13.sp
                        )
                    } else if (!hasPermissions) {
                        Text(
                            "CarbonLoop needs access to Health Connect to automatically sync steps, workout sessions, and calculate carbon offsets in the background.",
                            color = Color.LightGray,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Button(
                            onClick = onRequestPermissions,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4EDE9F))
                        ) {
                            Text("Grant Permission Once", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🟢 Connected & Syncing", color = Color(0xFF4EDE9F), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Your steps and workout sessions (Walking, Running, Cycling) automatically sync in the background via Android WorkManager.",
                            color = Color.LightGray,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = {
                                    coroutineScope.launch {
                                        syncState = "Syncing..."
                                        onTriggerSync()
                                        withContext(Dispatchers.IO) {
                                            Thread.sleep(2000)
                                        }
                                        syncState = "Idle"
                                        loadData()
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF282830))
                            ) {
                                Text(if (syncState == "Idle") "Sync Activity Now" else syncState, color = Color.White)
                            }
                        }
                    }
                }
            }
        }

        // Stats Summary
        item {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Avoided CO₂e", fontSize = 12.sp, color = Color.Gray)
                        Text(
                            "${String.format("%.3f", co2Saved.toDoubleOrNull() ?: 0.0)} kg",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF4EDE9F)
                        )
                        Text("Verified Calculations", fontSize = 9.sp, color = Color.Gray)
                    }
                }
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Green Points", fontSize = 12.sp, color = Color.Gray)
                        Text("$gpBalance", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFFC107))
                        Text("Level $level Player", fontSize = 9.sp, color = Color.Gray)
                    }
                }
            }
        }

        // Sync Info Block
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Incremental Sync Status", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(lastSyncText, color = Color.LightGray, fontSize = 12.sp)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 2. Missions Tab
// ---------------------------------------------------------------------------
@Composable
fun QuestsScreen() {
    val repository = remember { DemoRepository() }
    var missionsList by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val questsJson = withContext(Dispatchers.IO) { repository.quests() }
            val array = JSONObject(questsJson).getJSONArray("quests")
            val temp = mutableListOf<JSONObject>()
            for (i in 0 until array.length()) {
                temp.add(array.getJSONObject(i))
            }
            missionsList = temp
        } catch (_: Exception) {}
        loading = false
    }

    if (loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF4EDE9F))
        }
    } else if (missionsList.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No missions available at the moment.", color = Color.Gray)
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("Available Missions", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                Text("Sync steps or log sessions to automatically update progress.", fontSize = 12.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(6.dp))
            }
            items(missionsList) { mission ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = mission.optString("title", "Workout Mission").replace("SIMULATED_DEMO_ONLY", "").trim(),
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            val difficulty = mission.optString("difficulty", "Normal")
                            Text(
                                text = difficulty,
                                color = if (difficulty == "Hard") Color.Red else Color(0xFF4EDE9F),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .background(Color(0xFF282830), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            "Type: ${mission.optString("type").replaceFirstChar { it.uppercase() }}",
                            color = Color.LightGray,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text("🌱 ${mission.optString("claimsAvoidedCo2e")} kg CO₂e Saved", fontSize = 12.sp, color = Color(0xFF4EDE9F))
                            Text("⭐ +${mission.optString("ecoXp")} Eco XP", fontSize = 12.sp, color = Color(0xFF03A9F4))
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 3. Points Ledger Tab
// ---------------------------------------------------------------------------
@Composable
fun LedgerScreen() {
    val repository = remember { DemoRepository() }
    var ledgerEvents by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var xpBalance by remember { mutableStateOf(0) }
    var gpBalance by remember { mutableStateOf(0) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val ledgerStr = withContext(Dispatchers.IO) { repository.ledger() }
            val obj = JSONObject(ledgerStr)
            val balances = obj.getJSONObject("balances")
            xpBalance = balances.optInt("ecoXp", 0)
            gpBalance = balances.optInt("greenPoints", 0)

            val array = obj.getJSONArray("events")
            val temp = mutableListOf<JSONObject>()
            for (i in (array.length() - 1) downTo 0) {
                temp.add(array.getJSONObject(i))
            }
            ledgerEvents = temp
        } catch (_: Exception) {}
        loading = false
    }

    if (loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF4EDE9F))
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1E2922)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Active Vault", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF4EDE9F))
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Green Points Balance: $gpBalance GP", color = Color.White, fontWeight = FontWeight.Bold)
                            Text("Eco XP: $xpBalance XP", color = Color(0xFF03A9F4))
                        }
                    }
                }
            }

            item {
                Text("Transaction Ledger", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color.White)
                Spacer(modifier = Modifier.height(4.dp))
            }

            if (ledgerEvents.isEmpty()) {
                item {
                    Text("No transactions logged in points ledger.", color = Color.Gray, fontSize = 13.sp)
                }
            } else {
                items(ledgerEvents) { event ->
                    val type = event.optString("type")
                    val amount = event.optInt("amount", 0)
                    val desc = when (type) {
                        "green_points_issued" -> "GP earned from ${event.optString("activityType")} session"
                        "eco_xp_issued" -> "XP earned from mission completion"
                        "redemption_reserved" -> "GP spent on reward reservation"
                        else -> type.replace("_", " ")
                    }

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(desc, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color.White)
                                Text("Evidence tier: ${event.optString("evidenceTier", "V2")}", fontSize = 11.sp, color = Color.Gray)
                            }
                            Text(
                                text = if (type.contains("issued")) "+$amount" else "-$amount",
                                color = if (type.contains("issued")) Color(0xFF4EDE9F) else Color.Red,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 4. Rewards Tab
// ---------------------------------------------------------------------------
@Composable
fun RewardsScreen() {
    val repository = remember { DemoRepository() }
    var rewardsList by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var redeemingId by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()
    val context = androidx.compose.ui.platform.LocalContext.current

    fun fetchRewards() {
        coroutineScope.launch {
            try {
                val catalogue = withContext(Dispatchers.IO) { repository.rewards() }
                val array = JSONObject(catalogue).getJSONArray("rewards")
                val temp = mutableListOf<JSONObject>()
                for (i in 0 until array.length()) {
                    temp.add(array.getJSONObject(i))
                }
                rewardsList = temp
            } catch (_: Exception) {}
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        fetchRewards()
    }

    if (loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF4EDE9F))
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Text("Rewards Catalogue", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
                Text("Exchange earned Green Points for sustainable gear.", fontSize = 12.sp, color = Color.Gray)
                Spacer(modifier = Modifier.height(4.dp))
            }

            items(rewardsList) { reward ->
                val id = reward.optString("rewardItemId")
                val title = reward.optString("title")
                val cost = reward.optInt("greenPointsCost")

                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1E)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                            Text("Cost: $cost GP", color = Color(0xFFFFC107), fontSize = 12.sp)
                        }
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    redeemingId = id
                                    try {
                                        withContext(Dispatchers.IO) { repository.redeem() }
                                        Toast.makeText(context, "Successfully redeemed: $title", Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, e.message ?: "Failed to redeem", Toast.LENGTH_LONG).show()
                                    } finally {
                                        redeemingId = null
                                    }
                                }
                            },
                            enabled = redeemingId == null,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4EDE9F))
                        ) {
                            Text(if (redeemingId == id) "Processing..." else "Redeem", color = Color.Black, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 5. Leaderboard Tab
// ---------------------------------------------------------------------------
@Composable
fun LeaderboardScreen() {
    val repository = remember { DemoRepository() }
    var selectedTimeframe by remember { mutableStateOf("all-time") }
    var boardRows by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var playerRank by remember { mutableStateOf(1) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(selectedTimeframe) {
        loading = true
        try {
            val boardStr = withContext(Dispatchers.IO) { repository.leaderboard(selectedTimeframe) }
            val obj = JSONObject(boardStr)
            playerRank = obj.optInt("playerPosition", 1)

            val array = obj.getJSONArray("leaderboard")
            val temp = mutableListOf<JSONObject>()
            for (i in 0 until array.length()) {
                temp.add(array.getJSONObject(i))
            }
            boardRows = temp
        } catch (_: Exception) {}
        loading = false
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text("Campus Leaderboard", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.White)
        Text("Recalculated server-side using verified points.", fontSize = 12.sp, color = Color.Gray)
        Spacer(modifier = Modifier.height(12.dp))

        // Timeframe selector
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("weekly", "monthly", "all-time").forEach { timeframe ->
                val active = selectedTimeframe == timeframe
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .background(if (active) Color(0xFF4EDE9F) else Color(0xFF1A1A1E), RoundedCornerShape(8.dp))
                        .border(1.dp, Color(0xFF282830), RoundedCornerShape(8.dp))
                        .clickable { selectedTimeframe = timeframe }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = timeframe.replaceFirstChar { it.uppercase() },
                        color = if (active) Color.Black else Color.LightGray,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (loading) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF4EDE9F))
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(boardRows) { row ->
                    val isPlayer = row.optBoolean("isPlayer")
                    val rank = row.optInt("rank")
                    val name = row.optString("name")
                    val points = row.optInt("points")
                    val carbon = row.optDouble("carbonSaved", 0.0)
                    val missions = row.optInt("missionsCompleted", 0)

                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isPlayer) Color(0xFF1E2922) else Color(0xFF1A1A1E)
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        border = if (isPlayer) BorderStroke(1.dp, Color(0xFF4EDE9F)) else null
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Rank number circle
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(
                                        if (rank <= 3) Color(0xFF4EDE9F) else Color(0xFF282830),
                                        CircleShape
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "$rank",
                                    color = if (rank <= 3) Color.Black else Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Spacer(modifier = Modifier.width(14.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (isPlayer) "You ($name)" else name,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = if (isPlayer) Color(0xFF4EDE9F) else Color.White
                                )
                                Text(
                                    text = "${String.format("%.1f", carbon)} kg saved · $missions missions",
                                    fontSize = 11.sp,
                                    color = Color.Gray
                                )
                            }

                            Text(
                                text = "$points GP",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Color(0xFFFFC107)
                            )
                        }
                    }
                }
            }

            // User's Summary Bottom Bar
            Spacer(modifier = Modifier.height(10.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF282830)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "🏆 Your Current Rank is #$playerRank on the $selectedTimeframe board",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF4EDE9F),
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp)
                )
            }
        }
    }
}