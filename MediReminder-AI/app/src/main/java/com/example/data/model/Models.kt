package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
@Entity(tableName = "medicines")
data class Medicine(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val medicineName: String,
    val strength: String, // e.g., "500mg" or "1 tablet"
    val frequency: String, // e.g., "Daily", "Alternate Days", "Weekly", "Monthly", "Every X Days"
    val durationDays: Int,
    val morning: Boolean = false,
    val afternoon: Boolean = false,
    val evening: Boolean = false,
    val night: Boolean = false,
    val beforeFood: Boolean = false,
    val afterFood: Boolean = false,
    val withFood: Boolean = false,
    val emptyStomach: Boolean = false,
    val instructions: String = "",
    val reminderType: String = "Standard", // Standard, WhatsApp, Custom Voice
    val customVoicePath: String? = null,
    val dateAdded: Long = System.currentTimeMillis(),
    // Editable management fields
    val startDate: Long = System.currentTimeMillis(),
    val endDate: Long? = null,
    val continueUntilStopped: Boolean = false,
    val morningTime: String = "08:00",
    val afternoonTime: String = "13:00",
    val eveningTime: String = "18:00",
    val nightTime: String = "21:00",
    val weeklyDay: Int = -1,          // 1=Mon..7=Sun, -1=not set
    val monthlyDate: Int = -1,        // 1-31, -1=not set
    val customIntervalDays: Int = -1, // e.g. every 2 days, -1=not set
    val weeklyDays: String = "",       // Multi-day: "1,4" = Mon+Thu
    val customDates: String = "",      // Epoch timestamps: "1749100800000,1749705600000"
    val notes: String = ""
)

@JsonClass(generateAdapter = true)
@Entity(tableName = "reminders")
data class ReminderItem(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val medicineId: Int,
    val medicineName: String,
    val strength: String,
    val scheduledTime: String, // e.g. "08:00 AM", "01:00 PM", "08:00 PM"
    val scheduledTimeMs: Long, // trigger timestamp tonight/today
    val status: String = "Pending", // Pending, Taken, Skipped, Snoozed
    val actionTimeMs: Long = 0L,
    val dateDayString: String // e.g., "2026-05-31" inside calendar view
)

@JsonClass(generateAdapter = true)
@Entity(tableName = "family_members")
data class FamilyMember(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val name: String,
    val relation: String,
    val age: Int,
    val gender: String,
    val emergencyContact: String
)

@JsonClass(generateAdapter = true)
data class UserProfile(
    val name: String = "User",
    val age: Int = 0,
    val gender: String = "",
    val email: String = "",
    val emergencyContact: String = "",
    val isPro: Boolean = false,
    val dynamicPricePerDay: Double = 1.5 // controlled on backend
)

@JsonClass(generateAdapter = true)
data class AdminConfig(
    val pricePerDay: Double = 2.0, // Rest API dynamic pricing
    val isUserBlocked: Boolean = false,
    val isMaintenanceMode: Boolean = false,
    val adminBroadcastMessage: String? = null
)

// ======================== Firebase Phone Auth ========================

/** Request body for POST /api/auth/firebase/phone */
@JsonClass(generateAdapter = true)
data class FirebasePhoneAuthRequest(
    val firebaseIdToken: String
)

/** Backend user object as returned from auth endpoints */
@JsonClass(generateAdapter = true)
data class BackendUser(
    val id: String,
    val name: String? = null,
    val phone: String? = null,
    val email: String? = null,
    @Json(name = "google_id") val googleId: String? = null,
    @Json(name = "apple_id") val appleId: String? = null,
    val role: String = "USER",
    val status: String = "ACTIVE",
    @Json(name = "fcm_token") val fcmToken: String? = null,
    @Json(name = "created_at") val createdAt: String? = null
)

/** The `data` object inside OTP verify / social login response */
@JsonClass(generateAdapter = true)
data class AuthDataPayload(
    val user: BackendUser,
    val token: String
)

/** Full response from POST /api/auth/otp/verify, /api/auth/google, /api/auth/apple */
@JsonClass(generateAdapter = true)
data class BackendAuthResponse(
    val success: Boolean,
    val message: String,
    val data: AuthDataPayload
)

// ======================== Social Auth Models ========================

/** Request body for POST /api/auth/google */
@JsonClass(generateAdapter = true)
data class GoogleLoginRequest(
    val idToken: String
)

/** Request body for POST /api/auth/apple */
@JsonClass(generateAdapter = true)
data class AppleLoginRequest(
    val identityToken: String
)

// ======================== Legacy Models (kept for local app use) ========================

@JsonClass(generateAdapter = true)
data class AuthRequest(
    val phone: String? = null,
    val otp: String? = null,
    val idToken: String? = null,
    val provider: String = "OTP" // OTP, Google, Apple
)

@JsonClass(generateAdapter = true)
data class AuthResponse(
    val token: String,
    val userProfile: UserProfile,
    val status: String
)

@JsonClass(generateAdapter = true)
data class PrescriptionExtractionResponse(
    val success: Boolean,
    val medicines: List<ExtractedMedicine>,
    val interactionWarning: String? = null,
    val duplicateMedicinesDetected: List<String>? = null,
    val errorMessage: String? = null
)

@JsonClass(generateAdapter = true)
data class ExtractedMedicine(
    val medicineName: String,
    val strength: String,
    val frequency: String,
    val durationDays: Int,
    val morning: Boolean = false,
    val afternoon: Boolean = false,
    val evening: Boolean = false,
    val night: Boolean = false,
    val beforeFood: Boolean = false,
    val afterFood: Boolean = false,
    val instructions: String = ""
)

@JsonClass(generateAdapter = true)
data class PayUInitiateRequest(
    val days: Int,
    val amount: Double,
    val email: String,
    val phone: String,
    val paymentMode: String // UPI, Card, Net Banking
)

@JsonClass(generateAdapter = true)
data class PayUResponse(
    val transactionId: String,
    val paymentUrl: String,
    val status: String, // SUCCESS, FAILED
    val message: String
)

// ======================== Profile Update ========================

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    val name: String
)

@JsonClass(generateAdapter = true)
data class UpdateProfileResponse(
    val success: Boolean,
    val message: String,
    val data: BackendUser? = null
)

// ======================== Prescription Upload (Backend OCR) ========================

@JsonClass(generateAdapter = true)
data class PrescriptionUploadResponse(
    val success: Boolean,
    val message: String? = null,
    val data: PrescriptionUploadData? = null
)

@JsonClass(generateAdapter = true)
data class PrescriptionUploadData(
    val prescriptionId: String? = null,
    val fileUrl: String? = null,
    val extractedMedicines: List<BackendExtractedMedicine> = emptyList(),
    val warnings: List<InteractionWarning> = emptyList(),
    val createdAt: String? = null
)

@JsonClass(generateAdapter = true)
data class BackendExtractedMedicine(
    val medicineName: String,
    val strength: String = "",
    val dosagePattern: String = "",
    val form: String = "",
    val frequency: String = "",
    @Json(name = "durationDays") val durationDays: Int = 0,
    val rawText: String = "",
    val confidence: Double = 0.7,
    @Json(name = "is_duplicate") val isDuplicate: Boolean = false,
    @Json(name = "duplicate_warning") val duplicateWarning: String? = null
)

@JsonClass(generateAdapter = true)
data class InteractionWarning(
    @Json(name = "medicine_a") val medicineA: String = "",
    @Json(name = "medicine_b") val medicineB: String = "",
    val severity: String = "",
    val description: String = ""
)
