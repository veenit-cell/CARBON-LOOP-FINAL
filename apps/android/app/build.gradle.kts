plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.hivemind.carbonloop"
    compileSdk { version = release(36) { minorApiLevel = 1 } }

    defaultConfig {
        applicationId = "com.hivemind.carbonloop" // Final publishing application ID: NEEDS_VERIFICATION.
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures { compose = true; buildConfig = true }
    buildTypes { getByName("debug") { buildConfigField("String", "DEMO_API_BASE_URL", "\"http://10.0.2.2:3000/api/v1/\"") } }
}

dependencies {
    implementation(project(":core")); implementation(project(":feature-quests")); implementation(project(":feature-tracking")); implementation(project(":feature-progress")); implementation(project(":feature-rewards"))
    implementation(libs.androidx.core.ktx); implementation(libs.androidx.lifecycle.runtime.ktx); implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom)); implementation(libs.androidx.compose.ui); implementation(libs.androidx.compose.material3); implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.health.connect); implementation(libs.androidx.work.runtime)
    debugImplementation(libs.androidx.compose.ui.tooling); testImplementation(libs.junit); testImplementation("org.json:json:20240303")
}
