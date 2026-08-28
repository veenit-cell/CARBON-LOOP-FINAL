package com.hivemind.carbonloop

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

private class FakeHttp(private val reply: String = "{\"truthLabels\":[\"SIMULATED_DEMO_ONLY\"]}") : DemoHttp {
    val calls = mutableListOf<List<String>>()
    override fun request(method: String, path: String, body: String?, key: String?): String { calls += listOf(method, path, body ?: "", key ?: ""); return reply }
}

class DemoApiTest {
    @Test fun repository_uses_contract_routes_and_unique_idempotency_keys() { val http = FakeHttp(); val repo = DemoRepository(http); repo.quests(); repo.startQuest("SIMULATED_DEMO_ONLY_walk_quest"); repo.startQuest("SIMULATED_DEMO_ONLY_walk_quest"); repo.completeQuest("run_1", "2.5"); repo.shuttle(); repo.progress(); repo.ledger(); repo.rewards(); repo.redeem(); assertEquals("quests", http.calls[0][1]); assertEquals("quest-runs", http.calls[1][1]); assertTrue(http.calls[1][3].isNotBlank()); assertTrue(http.calls[1][3] != http.calls[2][3]); assertEquals("quest-runs/run_1/complete", http.calls[3][1]); assertEquals("evidence/shuttle-checkin", http.calls[4][1]); assertEquals("rewards/redemptions", http.calls.last()[1]) }
    @Test fun preserves_simulated_and_mock_truth_labels() { val simulated = DemoRepository(FakeHttp("{\"truthLabels\":[\"SIMULATED_DEMO_ONLY\",\"SYNTHETIC_TEST_ONLY\",\"MOCK_DEMO_ONLY\"]}")).quests(); assertTrue(simulated.contains("SIMULATED_DEMO_ONLY")); assertTrue(simulated.contains("SYNTHETIC_TEST_ONLY")); assertTrue(simulated.contains("MOCK_DEMO_ONLY")) }
    @Test fun state_controller_covers_loading_success_empty_error_and_retry() { val controller = DemoStateController { it() }; controller.load { "ok" }; assertTrue(controller.state is DemoState.Success); controller.load { "" }; assertEquals(DemoState.Empty, controller.state); controller.load { throw IllegalStateException("safe") }; assertTrue(controller.state is DemoState.Error); controller.retry { "retry" }; assertTrue(controller.state is DemoState.Success) }
}
