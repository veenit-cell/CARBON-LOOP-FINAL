package com.hivemind.carbonloop

class DemoStateController(private val run: ((() -> Unit) -> Unit)) {
    var state: DemoState = DemoState.Empty
        private set

    fun load(action: () -> String) {
        state = DemoState.Loading
        run {
            try {
                val result = action()
                state = if (result.isBlank()) DemoState.Empty else DemoState.Success(result)
            } catch (_: Exception) {
                state = DemoState.Error("Demo API request could not be completed. Please retry.")
            }
        }
    }

    fun retry(action: () -> String) = load(action)
}