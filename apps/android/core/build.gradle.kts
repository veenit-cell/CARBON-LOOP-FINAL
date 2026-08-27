plugins { id("com.android.library"); }
android { namespace = "com.hivemind.carbonloop.core"; compileSdk { version = release(36) { minorApiLevel = 1 } }; defaultConfig { minSdk = 26 } }
dependencies { testImplementation(libs.junit) }
