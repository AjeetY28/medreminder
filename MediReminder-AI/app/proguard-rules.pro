# Retrofit 2 rules
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Moshi rules to prevent serialization issues
-keep class com.example.data.model.** { *; }
-keep @com.squareup.moshi.JsonQualifier public @interface *
-keepclassmembers class * {
    @com.squareup.moshi.Json <fields>;
}
-dontwarn com.squareup.moshi.**

# Room Database rules
-keep class * extends androidx.room.RoomDatabase
-keep class * implements androidx.room.RoomDatabase$Callback
-dontwarn androidx.room.paging.**

# Keep platform models
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
