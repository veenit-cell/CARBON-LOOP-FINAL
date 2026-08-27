package com.hivemind.carbonloop.core

import org.junit.Assert.assertEquals
import org.junit.Test
class WelcomeViewModelTest { @Test fun startsOnMissions() { assertEquals(AppDestination.Missions, WelcomeViewModel().initialDestination) } }
