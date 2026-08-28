package com.hivemind.carbonloop

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        setContent { MaterialTheme { DemoScreen() } }
    }
}

@Composable
fun DemoScreen() {
    var state by remember { mutableStateOf<DemoState>(DemoState.Empty) }
    val repository = remember { DemoRepository() }
    val executor = remember { Executors.newSingleThreadExecutor() }
    fun load(action: () -> String) {
        state = DemoState.Loading
        executor.execute {
            state = try { DemoState.Success(action()) } catch (_: Exception) { DemoState.Error("Demo API request could not be completed. Please retry.") }
        }
    }
    Scaffold { padding ->
        Column(modifier = androidx.compose.ui.Modifier.padding(padding)) {
            Text("CarbonLoop · Hackathon demo data")
            Text("SIMULATED_DEMO_ONLY · SYNTHETIC_TEST_ONLY · MOCK_DEMO_ONLY")
            Button(onClick = { load { repository.quests() } }) { Text("Missions") }
            Button(onClick = { load { repository.progress() + "\n" + repository.ledger() } }) { Text("Progress") }
            Button(onClick = { load { repository.rewards() } }) { Text("Rewards") }
            Button(onClick = { load { repository.shuttle() } }) { Text("Shuttle demo check-in") }
            when (val value = state) {
                DemoState.Loading -> CircularProgressIndicator()
                DemoState.Empty -> Text("No demo data yet. Retry a screen.")
                is DemoState.Success -> Text(value.text.replace("VERIFIED", "VERIFIED (shuttle only)"))
                is DemoState.Error -> Text("Safe error: ${value.message}")
            }
        }
    }
}