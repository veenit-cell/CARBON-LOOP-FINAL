plugins { id("com.android.library"); }
android { namespace = "com.hivemind.carbonloop.tracking"; compileSdk { version = release(36) { minorApiLevel = 1 } }; defaultConfig { minSdk = 26 } }
dependencies { implementation(project(":core")); testImplementation(libs.junit) }
