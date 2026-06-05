package com.example.ui.viewmodel

import android.app.Activity
import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.ai.GeminiService
import com.example.data.model.*
import com.example.data.repository.MedicineRepository
import com.google.firebase.FirebaseException
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MediReminderViewModel(
    val repository: MedicineRepository
) : ViewModel() {

    private val TAG = "MediReminderVM"
    private val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    
    // UI State variables
    private val _selectedDate = MutableStateFlow(sdf.format(Date()))
    val selectedDate: StateFlow<String> = _selectedDate.asStateFlow()

    private val _currentScreen = MutableStateFlow("login")
    val currentScreen: StateFlow<String> = _currentScreen.asStateFlow()

    private val _authState = MutableStateFlow<AuthUiState>(AuthUiState.LoggedOut)
    val authState: StateFlow<AuthUiState> = _authState.asStateFlow()

    private val _otpSendState = MutableStateFlow<OtpSendUiState>(OtpSendUiState.Idle)
    val otpSendState: StateFlow<OtpSendUiState> = _otpSendState.asStateFlow()

    // Medicines Flow
    val medicines: StateFlow<List<Medicine>> = repository.allMedicines
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val todayReminders: StateFlow<List<ReminderItem>> = _selectedDate
        .flatMapLatest { day -> repository.getRemindersForDay(day) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val compliancePercentage: StateFlow<Double> = repository.allReminders
        .map { reminders ->
            val total = reminders.size
            if (total == 0) 100.0 else {
                val taken = reminders.count { it.status == "Taken" }
                (taken.toDouble() / total.toDouble()) * 100
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 100.0)

    val familyMembers: StateFlow<List<FamilyMember>> = repository.allFamilyMembers
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _adminState = MutableStateFlow(AdminConfig())
    val adminState: StateFlow<AdminConfig> = _adminState.asStateFlow()

    private val _ocrState = MutableStateFlow<OcrUiState>(OcrUiState.Idle)
    val ocrState: StateFlow<OcrUiState> = _ocrState.asStateFlow()

    private val _safetyWarning = MutableStateFlow<String?>(null)
    val safetyWarning: StateFlow<String?> = _safetyWarning.asStateFlow()

    private val _duplicateWarning = MutableStateFlow<String?>(null)
    val duplicateWarning: StateFlow<String?> = _duplicateWarning.asStateFlow()

    val isDarkMode = MutableStateFlow(true)
    val selectedLanguage = MutableStateFlow("English")
    val notificationsEnabled = MutableStateFlow(true)

    init {
        pollAdminConfigurations()
    }

    fun setDate(dateStr: String) { _selectedDate.value = dateStr }
    fun navigateTo(screen: String) { _currentScreen.value = screen }

    // ======================== Firebase Phone Auth ========================

    /**
     * Step 1: Send OTP via Firebase Phone Auth.
     * Firebase handles SMS delivery automatically.
     * Requires an Activity reference for reCAPTCHA verification.
     */
    fun sendOtp(phone: String, activity: Activity) {
        Log.d(TAG, "sendOtp called with phone: $phone")
        _otpSendState.value = OtpSendUiState.Sending

        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                // Auto-verification (Google Play Services auto-reads SMS)
                Log.d(TAG, "Firebase auto-verified phone number: $phone")
                _otpSendState.value = OtpSendUiState.Sent(message = "Auto-verified!")
                _authState.value = AuthUiState.Loading
                
                viewModelScope.launch {
                    try {
                        val res = repository.signInWithFirebaseCredential(credential)
                        _authState.value = AuthUiState.Authenticated(res.userProfile)
                        // If user has no real name yet, go to name entry; else dashboard
                        _currentScreen.value = if (isNameMissing(res.userProfile.name)) "name_entry" else "dashboard"
                    } catch (e: Exception) {
                        Log.e(TAG, "Auto-verification sign-in failed", e)
                        _authState.value = AuthUiState.Error("Auto-verification failed: ${e.localizedMessage}")
                    }
                }
            }

            override fun onVerificationFailed(e: FirebaseException) {
                Log.e(TAG, "Firebase OTP verification failed for phone: $phone", e)
                val errorMsg = when {
                    e.message?.contains("BILLING_NOT_ENABLED") == true ->
                        "Firebase billing not enabled. Enable Blaze plan for Phone Auth."
                    e.message?.contains("TOO_MANY_REQUESTS") == true ->
                        "Too many OTP requests. Wait a few minutes and try again."
                    e.message?.contains("INVALID_PHONE_NUMBER") == true ->
                        "Invalid phone number format. Use +91XXXXXXXXXX format."
                    e.message?.contains("quota") == true ->
                        "SMS quota exceeded. Try again later or check Firebase plan."
                    e.message?.contains("app not authorized") == true ->
                        "App not authorized. Check SHA-1 fingerprint in Firebase Console."
                    else -> e.localizedMessage ?: "Failed to send OTP. Check phone number format (+91XXXXXXXXXX)."
                }
                _otpSendState.value = OtpSendUiState.Error(errorMsg)
            }

            override fun onCodeSent(verificationId: String, token: PhoneAuthProvider.ForceResendingToken) {
                Log.d(TAG, "Firebase OTP sent successfully to: $phone")
                repository.storedVerificationId = verificationId
                _otpSendState.value = OtpSendUiState.Sent(message = "OTP sent to your phone")
            }
        }

        repository.sendFirebaseOtp(phone, activity, callbacks)
    }

    /**
     * Step 2: Verify OTP code entered by the user.
     * Creates Firebase credential → signs in → exchanges for backend JWT.
     */
    fun verifyOtp(phone: String, otp: String) {
        _authState.value = AuthUiState.Loading
        viewModelScope.launch {
            try {
                val res = repository.verifyFirebaseOtp(otp)
                _authState.value = AuthUiState.Authenticated(res.userProfile)
                // If user has no real name yet, go to name entry; else dashboard
                _currentScreen.value = if (isNameMissing(res.userProfile.name)) "name_entry" else "dashboard"
            } catch (e: Exception) {
                _authState.value = AuthUiState.Error(
                    "Verification failed: ${e.localizedMessage ?: "Invalid OTP"}"
                )
            }
        }
    }

    /**
     * Step 3: Save user's display name after OTP verification.
     */
    fun submitUserName(name: String) {
        viewModelScope.launch {
            try {
                repository.updateUserName(name)
                val currentAuth = _authState.value
                if (currentAuth is AuthUiState.Authenticated) {
                    _authState.value = AuthUiState.Authenticated(
                        currentAuth.profile.copy(name = name)
                    )
                }
                _currentScreen.value = "dashboard"
            } catch (e: Exception) {
                Log.e(TAG, "Failed to save user name", e)
                // Still proceed to dashboard even if name save fails
                _currentScreen.value = "dashboard"
            }
        }
    }

    fun loginWithSocial(provider: String) {
        _authState.value = AuthUiState.Loading
        viewModelScope.launch {
            try {
                val res = repository.loginWithSocial(provider)
                _authState.value = AuthUiState.Authenticated(res.userProfile)
                _currentScreen.value = "dashboard"
            } catch (e: Exception) {
                _authState.value = AuthUiState.Error("Social authentication failed: ${e.localizedMessage}")
            }
        }
    }

    /**
     * Checks whether a profile name is missing/placeholder.
     * Returns true if the name is blank, "User", or looks like a phone number.
     */
    private fun isNameMissing(name: String): Boolean {
        if (name.isBlank() || name == "User") return true
        // Phone numbers start with '+' or are all digits
        val trimmed = name.trim()
        if (trimmed.startsWith("+") || trimmed.all { it.isDigit() }) return true
        return false
    }

    fun logout() {
        repository.userToken = null
        repository.storedVerificationId = null
        repository.firebaseAuth.signOut()
        _authState.value = AuthUiState.LoggedOut
        _otpSendState.value = OtpSendUiState.Idle
        _currentScreen.value = "login"
    }

    // --- Medicine Management ---
    fun submitManualMedicine(
        name: String, dosage: String, frequency: String, durationDays: Int,
        morning: Boolean, afternoon: Boolean, evening: Boolean, night: Boolean,
        beforeFood: Boolean, afterFood: Boolean, instructions: String,
        reminderType: String = "Standard"
    ) {
        val medicine = Medicine(
            medicineName = name, strength = dosage, frequency = frequency, durationDays = durationDays,
            morning = morning, afternoon = afternoon, evening = evening, night = night,
            beforeFood = beforeFood, afterFood = afterFood, instructions = instructions,
            reminderType = reminderType
        )
        viewModelScope.launch {
            repository.addMedicine(medicine)
            checkDrugHazards(name)
        }
    }

    fun checkDrugHazards(medName: String) {
        _safetyWarning.value = null
        _duplicateWarning.value = null
        viewModelScope.launch {
            val safetyResult = repository.runInteractionSafetyCheck(medName)
            if (safetyResult.first.isNotEmpty()) {
                _duplicateWarning.value = "Overlap Warning: Similar substance or pharmacological class overlap detected!"
            }
            if (safetyResult.second != null) _safetyWarning.value = safetyResult.second
        }
    }

    fun deleteMedicine(id: Int) { viewModelScope.launch { repository.deleteMedicine(id) } }
    fun clearSafetyNotices() { _safetyWarning.value = null; _duplicateWarning.value = null }

    fun setReminderStatus(id: Int, status: String) {
        viewModelScope.launch { repository.updateReminderStatus(id, status) }
    }

    fun addFamily(name: String, relation: String, age: Int, gender: String, contact: String) {
        viewModelScope.launch {
            repository.addFamilyMember(FamilyMember(name = name, relation = relation, age = age, gender = gender, emergencyContact = contact))
        }
    }

    fun uploadPrescriptionPic(bitmap: Bitmap) {
        _ocrState.value = OcrUiState.Running
        viewModelScope.launch {
            try {
                val extracted = repository.uploadPrescriptionViaBackend(bitmap)
                if (!extracted.success) {
                    _ocrState.value = OcrUiState.Error(
                        extracted.errorMessage ?: "Unable to analyze prescription. Please try again."
                    )
                } else if (extracted.medicines.isEmpty()) {
                    _ocrState.value = OcrUiState.Error(
                        "No medicines detected in the prescription. Please retake the photo or add medicines manually."
                    )
                } else {
                    _ocrState.value = OcrUiState.Finished(extracted)
                }
            } catch (e: Exception) {
                _ocrState.value = OcrUiState.Error("Extraction failed: " + e.localizedMessage)
            }
        }
    }

    fun confirmExtractedMedicines(list: List<Medicine>) {
        viewModelScope.launch {
            for (med in list) repository.addMedicine(med)
            _ocrState.value = OcrUiState.Idle
            navigateTo("dashboard")
        }
    }

    fun resetOcr() { _ocrState.value = OcrUiState.Idle }

    // ======================== Editable Medicine Management ========================

    private val _editableMedicines = MutableStateFlow<List<Medicine>>(emptyList())
    val editableMedicines: StateFlow<List<Medicine>> = _editableMedicines.asStateFlow()

    fun setEditableMedicines(list: List<Medicine>) {
        _editableMedicines.value = list
    }

    fun updateEditableMedicine(index: Int, medicine: Medicine) {
        val current = _editableMedicines.value.toMutableList()
        if (index in current.indices) {
            current[index] = medicine
            _editableMedicines.value = current
        }
    }

    fun removeEditableMedicine(index: Int) {
        val current = _editableMedicines.value.toMutableList()
        if (index in current.indices) {
            current.removeAt(index)
            _editableMedicines.value = current
        }
    }

    fun addEditableMedicine(medicine: Medicine) {
        _editableMedicines.value = _editableMedicines.value + medicine
    }

    fun confirmAndSaveAllMedicines() {
        viewModelScope.launch {
            for (med in _editableMedicines.value) {
                repository.addMedicine(med)
            }
            _editableMedicines.value = emptyList()
            _ocrState.value = OcrUiState.Idle
            navigateTo("dashboard")
        }
    }

    fun updateMedicine(medicine: Medicine) {
        viewModelScope.launch { repository.updateMedicine(medicine) }
    }

    fun upgradeSubscription(daysCount: Int, mechanism: String, onComplete: (String) -> Unit) {
        viewModelScope.launch {
            val response = repository.initiatePayUPayment(daysCount, mechanism)
            if (response.status == "SUCCESS") {
                repository.currentUserProfile = repository.currentUserProfile.copy(isPro = true)
                val authed = _authState.value
                if (authed is AuthUiState.Authenticated) {
                    _authState.value = AuthUiState.Authenticated(authed.profile.copy(isPro = true))
                }
            }
            onComplete(response.message)
        }
    }

    private fun pollAdminConfigurations() {
        viewModelScope.launch {
            while (true) {
                try { _adminState.value = repository.fetchAdminConfig() } catch (_: Exception) {}
                kotlinx.coroutines.delay(10000)
            }
        }
    }

    fun simulateAdminTweak(newPrice: Double, blockUserField: Boolean, maintenanceModeField: Boolean, broadcastMessageField: String?) {
        repository.applyAdminLocalSimulatedChanges(newPrice, blockUserField, maintenanceModeField, broadcastMessageField)
        _adminState.value = repository.adminConfig
    }
}

sealed interface AuthUiState {
    object LoggedOut : AuthUiState
    object Loading : AuthUiState
    data class Authenticated(val profile: UserProfile) : AuthUiState
    data class Error(val message: String) : AuthUiState
}

sealed interface OtpSendUiState {
    object Idle : OtpSendUiState
    object Sending : OtpSendUiState
    data class Sent(val message: String) : OtpSendUiState
    data class Error(val message: String) : OtpSendUiState
}

sealed interface OcrUiState {
    object Idle : OcrUiState
    object Running : OcrUiState
    data class Finished(val data: PrescriptionExtractionResponse) : OcrUiState
    data class Error(val message: String) : OcrUiState
}
