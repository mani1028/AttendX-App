# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Jitsi SDK
-keep class org.jitsi.** { *; }
-keep interface org.jitsi.** { *; }
-dontwarn org.jitsi.**

# Keep BuildConfig
-keep class **.BuildConfig { *; }
-keep class **.R { *; }
-keep class **.R$* { *; }

# Keep Dropbox SDK
-keep class com.dropbox.** { *; }
-dontwarn com.dropbox.**

# Giphy SDK & Kotlin Parcelize Fix
-keep class kotlinx.parcelize.** { *; }
-keep class com.giphy.sdk.** { *; }
-dontwarn kotlinx.parcelize.**
-keep @kotlinx.parcelize.Parcelize class * { *; }
-keep class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# React Native & Common Libraries
-keep class com.facebook.react.** { *; }
-dontwarn com.facebook.react.**
-keep class com.visys.attendx.** { *; }
-dontwarn com.facebook.common.internal.**

