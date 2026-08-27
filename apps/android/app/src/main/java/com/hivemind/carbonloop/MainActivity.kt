package com.hivemind.carbonloop

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.hivemind.carbonloop.core.AppDestination

class MainActivity : ComponentActivity() { override fun onCreate(state: Bundle?) { super.onCreate(state); setContent { MaterialTheme { CarbonLoopApp() } } } }
@Composable fun CarbonLoopApp() { var current by remember { mutableStateOf(AppDestination.Missions) }; Scaffold { Text("Welcome to CarbonLoop — ${current.label}") } }
