package com.example.data.api

import com.example.data.model.*
import okhttp3.MultipartBody
import retrofit2.http.*

interface MediReminderApiService {

    // ======================== Firebase Phone Auth ========================

    /** Exchange Firebase ID token for our backend JWT */
    @POST("api/auth/firebase/phone")
    suspend fun firebasePhoneAuth(@Body request: FirebasePhoneAuthRequest): BackendAuthResponse

    // ======================== Social Auth ========================

    @POST("api/auth/google")
    suspend fun googleLogin(@Body request: GoogleLoginRequest): BackendAuthResponse

    @POST("api/auth/apple")
    suspend fun appleLogin(@Body request: AppleLoginRequest): BackendAuthResponse

    // ======================== Auth Profile ========================

    @GET("api/auth/me")
    suspend fun getMe(@Header("Authorization") token: String): BackendUser

    @PUT("api/auth/profile")
    suspend fun updateProfile(
        @Header("Authorization") token: String,
        @Body request: UpdateProfileRequest
    ): UpdateProfileResponse

    @PUT("api/auth/fcm")
    suspend fun updateFcmToken(
        @Header("Authorization") token: String,
        @Body body: Map<String, String>
    ): Map<String, Any>

    // ======================== Medicines ========================

    @GET("api/medicines")
    suspend fun getMedicines(@Header("Authorization") token: String): List<Medicine>

    @POST("api/medicines")
    suspend fun addMedicine(
        @Header("Authorization") token: String,
        @Body medicine: Medicine
    ): Medicine

    @DELETE("api/medicines/{id}")
    suspend fun deleteMedicine(
        @Header("Authorization") token: String,
        @Path("id") id: Int
    ): Map<String, Boolean>

    // ======================== Reminders ========================

    @GET("api/reminders")
    suspend fun getReminders(
        @Header("Authorization") token: String,
        @Query("date") date: String
    ): List<ReminderItem>

    @PUT("api/reminders/{id}")
    suspend fun updateReminder(
        @Header("Authorization") token: String,
        @Path("id") id: Int,
        @Query("status") status: String,
        @Query("actionTimeMs") actionTimeMs: Long
    ): ReminderItem

    // ======================== Payments ========================

    @POST("api/payments/payu/initiate")
    suspend fun initiatePayment(
        @Header("Authorization") token: String,
        @Body request: PayUInitiateRequest
    ): PayUResponse

    // ======================== Family Members ========================

    @GET("api/family-members")
    suspend fun getFamilyMembers(@Header("Authorization") token: String): List<FamilyMember>

    @POST("api/family-members")
    suspend fun addFamilyMember(
        @Header("Authorization") token: String,
        @Body member: FamilyMember
    ): FamilyMember

    // ======================== Admin Configurations ========================

    @GET("api/admin/config")
    suspend fun getAdminConfig(): AdminConfig

    // ======================== Prescriptions ========================

    @Multipart
    @POST("api/prescriptions/upload")
    suspend fun uploadPrescription(
        @Header("Authorization") token: String,
        @Part file: MultipartBody.Part
    ): PrescriptionUploadResponse
}
