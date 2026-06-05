package com.example.data.repository

import android.app.Activity
import android.util.Log
import com.example.data.ai.GeminiService
import com.example.data.api.MediReminderApiService
import com.example.data.local.FamilyMemberDao
import com.example.data.local.MedicineDao
import com.example.data.local.ReminderDao
import com.example.data.model.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.tasks.await
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class MedicineRepository(
    private val medicineDao: MedicineDao,
    private val reminderDao: ReminderDao,
    private val familyMemberDao: FamilyMemberDao
) {
    private val TAG = "MedicineRepository"
    
    // Firebase Auth instance
    val firebaseAuth: FirebaseAuth = FirebaseAuth.getInstance()
    
    // Remote API Service — 90s timeout for Gemini OCR pipeline (takes 20-30s)
    private val httpClient = okhttp3.OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl("http://10.0.2.2:3000/")
        .client(httpClient)
        .addConverterFactory(MoshiConverterFactory.create())
        .build()
        
    private val apiService = retrofit.create(MediReminderApiService::class.java)

    // Current session
    var userToken: String? = null
    var currentUserProfile = UserProfile(isPro = false)
    var adminConfig = AdminConfig()

    // Stored verification ID from Firebase Phone Auth
    var storedVerificationId: String? = null

    // Database Flows
    val allMedicines: Flow<List<Medicine>> = medicineDao.getAllMedicines()
    val allReminders: Flow<List<ReminderItem>> = reminderDao.getAllReminders()
    val allFamilyMembers: Flow<List<FamilyMember>> = familyMemberDao.getAllFamilyMembers()

    fun getRemindersForDay(day: String): Flow<List<ReminderItem>> {
        return reminderDao.getRemindersForDay(day)
    }

    // ======================== Firebase Phone Auth ========================

    /**
     * Step 1: Send OTP via Firebase Phone Auth.
     * Firebase handles SMS delivery — no third-party SMS API needed.
     * The verificationId is stored for later use in verifyOtp().
     */
    fun sendFirebaseOtp(
        phone: String,
        activity: Activity,
        callbacks: PhoneAuthProvider.OnVerificationStateChangedCallbacks
    ) {
        val options = PhoneAuthOptions.newBuilder(firebaseAuth)
            .setPhoneNumber(phone)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
            .build()
        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    /**
     * Step 2: Verify OTP code entered by user.
     * Creates a PhoneAuthCredential and signs in with Firebase.
     * Then exchanges the Firebase ID token with our backend for a JWT.
     */
    suspend fun verifyFirebaseOtp(otp: String): AuthResponse {
        val verificationId = storedVerificationId
            ?: throw Exception("Verification ID not found. Please request OTP again.")
        
        val credential = PhoneAuthProvider.getCredential(verificationId, otp)
        return signInWithFirebaseCredential(credential)
    }

    /**
     * Sign in with a Firebase credential (auto-verify or manual code).
     * After Firebase auth succeeds, we get an ID token and send it
     * to our backend to create/find the user and get our own JWT.
     */
    suspend fun signInWithFirebaseCredential(credential: PhoneAuthCredential): AuthResponse {
        // Sign in with Firebase
        val authResult = firebaseAuth.signInWithCredential(credential).await()
        val firebaseUser = authResult.user
            ?: throw Exception("Firebase sign-in succeeded but user is null")
        
        // Get Firebase ID token
        val tokenResult = firebaseUser.getIdToken(true).await()
        val firebaseIdToken = tokenResult.token
            ?: throw Exception("Failed to get Firebase ID token")
        
        Log.d(TAG, "Firebase sign-in successful. UID: ${firebaseUser.uid}, Phone: ${firebaseUser.phoneNumber}")
        
        // Exchange Firebase ID token with our backend for our JWT
        val response = apiService.firebasePhoneAuth(
            FirebasePhoneAuthRequest(firebaseIdToken = firebaseIdToken)
        )
        
        // Store the real JWT token from our backend
        userToken = response.data.token
        
        // Map backend user to local UserProfile
        val backendUser = response.data.user
        // Use backend name if available (saved from name_entry screen),
        // otherwise fall back to phone number
        val displayName = when {
            !backendUser.name.isNullOrBlank() -> backendUser.name
            !firebaseUser.phoneNumber.isNullOrBlank() -> firebaseUser.phoneNumber!!
            else -> "User"
        }
        currentUserProfile = UserProfile(
            name = displayName,
            email = backendUser.email ?: "",
            emergencyContact = firebaseUser.phoneNumber ?: "",
            isPro = currentUserProfile.isPro
        )
        
        return AuthResponse(
            token = response.data.token,
            userProfile = currentUserProfile,
            status = "Success"
        )
    }

    /**
     * Update user's display name on the backend after OTP verification.
     */
    suspend fun updateUserName(name: String) {
        val token = userToken ?: throw Exception("Not authenticated")
        try {
            apiService.updateProfile("Bearer $token", UpdateProfileRequest(name = name))
            currentUserProfile = currentUserProfile.copy(name = name)
            Log.d(TAG, "User name updated to: $name")
        } catch (e: Exception) {
            Log.w(TAG, "Could not update name on backend: ${e.message}. Saved locally.")
            // Still update locally even if backend call fails
            currentUserProfile = currentUserProfile.copy(name = name)
        }
    }

    /**
     * Social login via Google or Apple.
     */
    suspend fun loginWithSocial(provider: String): AuthResponse {
        return try {
            val response = if (provider == "Google") {
                apiService.googleLogin(GoogleLoginRequest(idToken = "mock-testuser"))
            } else {
                apiService.appleLogin(AppleLoginRequest(identityToken = "mock-testuser"))
            }
            
            userToken = response.data.token
            
            val backendUser = response.data.user
            val displayName = when {
                !backendUser.name.isNullOrBlank() -> backendUser.name
                !backendUser.email.isNullOrBlank() -> backendUser.email!!.substringBefore("@")
                else -> "User"
            }
            currentUserProfile = UserProfile(
                name = displayName,
                email = backendUser.email ?: "",
                emergencyContact = backendUser.phone ?: "",
                isPro = currentUserProfile.isPro
            )
            
            AuthResponse(
                token = response.data.token,
                userProfile = currentUserProfile,
                status = "Success"
            )
        } catch (e: Exception) {
            Log.e(TAG, "Social login failed: ${e.message}", e)
            throw e
        }
    }

    /**
     * Fetch active medicines. Attempt REST, sync with Room, fallback to cache.
     */
    suspend fun syncMedicines() {
        val token = userToken ?: return
        try {
            val remoteList = apiService.getMedicines("Bearer $token")
            medicineDao.clearAllMedicines()
            for (med in remoteList) {
                medicineDao.insertMedicine(med)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not fetch remote medicines: ${e.message}. Reading from local Cache.")
        }
    }

    suspend fun addMedicine(medicine: Medicine) {
        val token = userToken
        if (token != null) {
            try {
                apiService.addMedicine("Bearer $token", medicine)
            } catch (e: Exception) {
                Log.w(TAG, "Could not send new medicine to backend API: ${e.message}. Saved locally.")
            }
        }
        
        val id = medicineDao.insertMedicine(medicine).toInt()
        generateRemindersForMedicine(id, medicine)
    }

    suspend fun deleteMedicine(id: Int) {
        val token = userToken
        if (token != null) {
            try {
                apiService.deleteMedicine("Bearer $token", id)
            } catch (e: Exception) {
                Log.w(TAG, "Could not sync deletion with API server. Running locally.")
            }
        }
        medicineDao.deleteMedicineById(id)
        reminderDao.deleteRemindersForMedicine(id)
    }

    suspend fun updateMedicine(medicine: Medicine) {
        medicineDao.updateMedicine(medicine)
        // Regenerate reminders for the updated medicine
        reminderDao.deleteRemindersForMedicine(medicine.id)
        generateRemindersForMedicine(medicine.id, medicine)
    }

    /**
     * Upload prescription image to backend for OCR processing via Gemini on server-side.
     * Returns a PrescriptionExtractionResponse for UI compatibility.
     */
    suspend fun uploadPrescriptionViaBackend(bitmap: android.graphics.Bitmap): PrescriptionExtractionResponse {
        val token = userToken ?: return PrescriptionExtractionResponse(
            success = false,
            medicines = emptyList(),
            errorMessage = "Not authenticated. Please login first."
        )

        return try {
            // Convert bitmap to JPEG bytes
            val stream = java.io.ByteArrayOutputStream()
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 95, stream)
            val bytes = stream.toByteArray()

            val requestBody = bytes.toRequestBody("image/jpeg".toMediaType())
            val filePart = okhttp3.MultipartBody.Part.createFormData("file", "prescription.jpg", requestBody)

            val response = apiService.uploadPrescription("Bearer $token", filePart)

            if (response.success && response.data != null) {
                val extractedMedicines = response.data.extractedMedicines.map { med ->
                    val dosageLower = med.dosagePattern.lowercase()
                    val freqLower = med.frequency.lowercase()
                    ExtractedMedicine(
                        medicineName = med.medicineName,
                        strength = med.strength,
                        frequency = med.frequency.ifEmpty { "Once daily" },
                        durationDays = if (med.durationDays > 0) med.durationDays else 7,
                        morning = dosageLower.startsWith("1") || freqLower.contains("morning") || freqLower.contains("thrice") || freqLower.contains("twice"),
                        afternoon = dosageLower.contains("-1-") || freqLower.contains("thrice") || freqLower.contains("afternoon"),
                        evening = false,
                        night = dosageLower.endsWith("1") || freqLower.contains("night") || freqLower.contains("bedtime"),
                        beforeFood = dosageLower.contains("before"),
                        afterFood = dosageLower.contains("after"),
                        instructions = med.dosagePattern
                    )
                }

                // Build interaction warning string from warnings list
                val warningText = response.data.warnings
                    .filter { it.severity == "HIGH" || it.severity == "MEDIUM" }
                    .joinToString("; ") { "${it.severity}: ${it.medicineA} + ${it.medicineB} — ${it.description}" }
                    .ifEmpty { null }

                // Build duplicate list
                val duplicates = response.data.extractedMedicines
                    .filter { it.isDuplicate }
                    .map { "${it.medicineName}: ${it.duplicateWarning ?: "Duplicate detected"}" }

                PrescriptionExtractionResponse(
                    success = true,
                    medicines = extractedMedicines,
                    interactionWarning = warningText,
                    duplicateMedicinesDetected = duplicates
                )
            } else {
                PrescriptionExtractionResponse(
                    success = false,
                    medicines = emptyList(),
                    errorMessage = response.message ?: "Backend could not process the prescription."
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Backend prescription upload failed: ${e.javaClass.simpleName}: ${e.message}", e)
            PrescriptionExtractionResponse(
                success = false,
                medicines = emptyList(),
                errorMessage = "Backend error: ${e.message}"
            )
        }
    }

    suspend fun runInteractionSafetyCheck(newMedName: String): Triple<List<String>, String?, String?> {
        val currentNames = allMedicines.firstOrNull()?.map { it.medicineName } ?: emptyList()
        return GeminiService.checkDrugInteractions(currentNames, newMedName)
    }

    private suspend fun generateRemindersForMedicine(medicineId: Int, medicine: Medicine) {
        val remindersToInsert = mutableListOf<ReminderItem>()
        
        val times = mutableListOf<Pair<String, Long>>()
        if (medicine.morning) times.add("Morning" to 8 * 3600 * 1000L)
        if (medicine.afternoon) times.add("Afternoon" to 13 * 3600 * 1000L)
        if (medicine.evening) times.add("Evening" to 17 * 3600 * 1000L)
        if (medicine.night) times.add("Night" to 21 * 3600 * 1000L)
        if (times.isEmpty()) times.add("General" to 9 * 3600 * 1000L)

        val baseCal = Calendar.getInstance()
        baseCal.set(Calendar.HOUR_OF_DAY, 0)
        baseCal.set(Calendar.MINUTE, 0)
        baseCal.set(Calendar.SECOND, 0)
        baseCal.set(Calendar.MILLISECOND, 0)
        val baseMs = baseCal.timeInMillis
        val dayFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

        for (dayIdx in 0 until medicine.durationDays) {
            val currentDayMs = baseMs + (dayIdx * 24 * 3600 * 1000L)
            val calDay = Calendar.getInstance()
            calDay.timeInMillis = currentDayMs
            val dayStr = dayFormatter.format(calDay.time)

            for ((part, offset) in times) {
                val triggerTs = currentDayMs + offset
                remindersToInsert.add(
                    ReminderItem(
                        medicineId = medicineId,
                        medicineName = medicine.medicineName,
                        strength = medicine.strength,
                        scheduledTime = getPartTitle(part),
                        scheduledTimeMs = triggerTs,
                        status = "Pending",
                        dateDayString = dayStr
                    )
                )
            }
        }
        reminderDao.insertAllReminders(remindersToInsert)
    }

    private fun getPartTitle(part: String): String {
        return when(part) {
            "Morning" -> "08:00 AM"
            "Afternoon" -> "01:00 PM"
            "Evening" -> "05:00 PM"
            "Night" -> "09:00 PM"
            else -> "09:00 AM"
        }
    }

    suspend fun updateReminderStatus(id: Int, status: String) {
        val timestamp = System.currentTimeMillis()
        val token = userToken
        if (token != null) {
            try {
                apiService.updateReminder("Bearer $token", id, status, timestamp)
            } catch (e: Exception) {
                Log.w(TAG, "Could not update status to remote api service: ${e.message}. Updating locally.")
            }
        }
        reminderDao.updateReminderStatus(id, status, timestamp)
    }

    suspend fun initiatePayUPayment(days: Int, paymentMode: String): PayUResponse {
        val cost = days * adminConfig.pricePerDay
        val token = userToken
        val req = PayUInitiateRequest(
            days = days, amount = cost,
            email = currentUserProfile.email,
            phone = currentUserProfile.emergencyContact,
            paymentMode = paymentMode
        )
        return try {
            if (token != null) {
                val res = apiService.initiatePayment("Bearer $token", req)
                if (res.status == "SUCCESS") currentUserProfile = currentUserProfile.copy(isPro = true)
                res
            } else throw Exception("Not authenticated")
        } catch (e: Exception) {
            Log.e(TAG, "PayU API failed. Simulating local PayU redirect.", e)
            currentUserProfile = currentUserProfile.copy(isPro = true)
            PayUResponse(
                transactionId = "TXN_PAYU_" + UUID.randomUUID().toString().take(8).uppercase(),
                paymentUrl = "https://checkout.payu.in/simulated-portal-gateway",
                status = "SUCCESS",
                message = "Simulated payment of ₹${cost} accomplished successfully!"
            )
        }
    }

    suspend fun addFamilyMember(member: FamilyMember) {
        val token = userToken
        if (token != null) {
            try { apiService.addFamilyMember("Bearer $token", member) }
            catch (e: Exception) { Log.w(TAG, "Could not save family member in API server: ${e.message}") }
        }
        familyMemberDao.insertFamilyMember(member)
    }

    suspend fun fetchAdminConfig(): AdminConfig {
        return try {
            val config = apiService.getAdminConfig()
            adminConfig = config
            config
        } catch (e: Exception) { adminConfig }
    }

    fun applyAdminLocalSimulatedChanges(price: Double, isBlocked: Boolean, isMaintenance: Boolean, notification: String?) {
        adminConfig = AdminConfig(pricePerDay = price, isUserBlocked = isBlocked, isMaintenanceMode = isMaintenance, adminBroadcastMessage = notification)
    }
}
