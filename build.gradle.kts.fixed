plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("expo-module-gradle-plugin")
}

group = "com.obsidian_north"
version = "2.1.1"

android {
    namespace = "expo.modules.mediastore"
    compileSdk = 36

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(
            org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
        )
    }
}

dependencies {
    implementation(project(":expo-modules-core"))
    implementation("androidx.exifinterface:exifinterface:1.3.7")
}
