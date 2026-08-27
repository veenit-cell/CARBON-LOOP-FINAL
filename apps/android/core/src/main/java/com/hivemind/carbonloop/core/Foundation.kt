package com.hivemind.carbonloop.core

enum class AppDestination(val label: String) { Missions("Missions"), Progress("Progress"), Rewards("Rewards"), Profile("Profile") }
class WelcomeViewModel { val initialDestination = AppDestination.Missions }
interface PlayerRepository
