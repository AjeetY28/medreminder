package com.example.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.*
import com.example.ui.theme.*
import com.example.ui.viewmodel.AuthUiState
import com.example.ui.viewmodel.MediReminderViewModel
import com.example.ui.viewmodel.OcrUiState
import com.example.ui.viewmodel.OtpSendUiState
import java.io.InputStream
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun MediReminderAppLayout(
    viewModel: MediReminderViewModel,
    modifier: Modifier = Modifier
) {
    val currentScreen by viewModel.currentScreen.collectAsState()
    val authState by viewModel.authState.collectAsState()
    val adminConfig by viewModel.adminState.collectAsState()
    val isDarkTheme by viewModel.isDarkMode.collectAsState()
    
    MyApplicationTheme(darkTheme = isDarkTheme) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.statusBars)
                .navigationBarsPadding(),
            color = MaterialTheme.colorScheme.background
        ) {
            when {
                adminConfig.isMaintenanceMode -> {
                    MaintenanceScreen(adminConfig)
                }
                adminConfig.isUserBlocked && authState is AuthUiState.Authenticated -> {
                    UserBlockedScreen(adminConfig, viewModel)
                }
                else -> {
                    Box(modifier = Modifier.fillMaxSize()) {
                        Column(modifier = Modifier.fillMaxSize()) {
                            adminConfig.adminBroadcastMessage?.let { msg ->
                                if (msg.isNotEmpty()) {
                                    AdminBroadcastBanner(message = msg)
                                }
                            }

                            Box(modifier = Modifier.weight(1f)) {
                                when (currentScreen) {
                                    "login" -> LoginScreen(viewModel)
                                    "name_entry" -> NameEntryScreen(viewModel)
                                    "dashboard" -> DashboardScreen(viewModel)
                                    "scanner" -> PrescriptionScannerScreen(viewModel)
                                    "medicine_manager" -> MedicineManagerScreen(viewModel)
                                    "manual_entry" -> ManualEntryScreen(viewModel)
                                    "pro_page" -> ProUpgradeScreen(viewModel)
                                    "family_page" -> FamilyManagementScreen(viewModel)
                                    "calendar_page" -> CalendarComplianceScreen(viewModel)
                                    "settings_page" -> SettingsScreen(viewModel)
                                    else -> DashboardScreen(viewModel)
                                }
                            }

                            if (authState is AuthUiState.Authenticated && currentScreen != "name_entry") {
                                BottomNavBar(
                                    currentRoute = currentScreen,
                                    onRouteSelected = { viewModel.navigateTo(it) },
                                    isPro = (authState as? AuthUiState.Authenticated)?.profile?.isPro == true
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ======================== SUB SCREENS ========================

@Composable
fun AdminBroadcastBanner(message: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        colors = CardDefaults.cardColors(containerColor = WarningAmber),
        shape = RoundedCornerShape(8.dp),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Campaign,
                contentDescription = "Alert",
                tint = Color.Black,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "System Broadcast from Admin",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black.copy(0.7f)
                )
                Text(
                    text = message,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Black
                )
            }
        }
    }
}

@Composable
fun MaintenanceScreen(config: AdminConfig) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(CardSlate),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Construction,
                contentDescription = "Maintenance",
                tint = WarningAmber,
                modifier = Modifier.size(64.dp)
            )
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "Under Maintenance",
            color = TextWhite,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.SansSerif
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Our administrative systems are undergoing live sync. We will reload shortly.",
            color = TextMuted,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(24.dp))
        Card(
            colors = CardDefaults.cardColors(containerColor = CardSlate),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, SoftBorder)
        ) {
            Text(
                text = "Live Admin Message: " + (config.adminBroadcastMessage ?: "Adjusting database sync schedules"),
                color = WarningAmber,
                fontSize = 12.sp,
                modifier = Modifier.padding(16.dp),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun UserBlockedScreen(config: AdminConfig, viewModel: MediReminderViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(DangerRed.copy(0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.GppBad,
                contentDescription = "Access Blocked",
                tint = DangerRed,
                modifier = Modifier.size(64.dp)
            )
        }
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = "Profile Access Blocked",
            color = TextWhite,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.SansSerif
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Your access to MediReminder AI has been blocked instantly by the admin dashboard for safety guidelines.",
            color = TextMuted,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp
        )
        Spacer(modifier = Modifier.height(32.dp))
        Button(
            onClick = { viewModel.logout() },
            colors = ButtonDefaults.buttonColors(containerColor = DangerRed)
        ) {
            Icon(imageVector = Icons.Default.Logout, contentDescription = "Log Out")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Switch User Profile", color = TextWhite)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(viewModel: MediReminderViewModel) {
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    val authState by viewModel.authState.collectAsState()
    val otpSendState by viewModel.otpSendState.collectAsState()

    // Get Activity reference for Firebase Phone Auth (reCAPTCHA needs it)
    val context = LocalContext.current
    val activity = context as? android.app.Activity

    // Derive otpSent from the actual Firebase state
    val otpSent = otpSendState is OtpSendUiState.Sent
    val otpSending = otpSendState is OtpSendUiState.Sending

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(SlateBlack, DeepCharcoal)
                )
            )
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = Icons.Default.Medication,
                contentDescription = "Logo",
                tint = AccentTeal,
                modifier = Modifier.size(72.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "MediReminder AI",
                color = TextWhite,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
            Text(
                text = "Precision Healthcare Organizer",
                color = TextMuted,
                fontSize = 13.sp
            )
            
            Spacer(modifier = Modifier.height(40.dp))

            when (authState) {
                is AuthUiState.Loading -> {
                    CircularProgressIndicator(color = AccentTeal)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Securing Authentication Stream...", color = TextMuted, fontSize = 13.sp)
                }
                else -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = CardSlate),
                        border = BorderStroke(1.dp, SoftBorder),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                text = if (!otpSent) "Secure OTP Verification" else "Enter 6-Digit Pin",
                                color = TextWhite,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedTextField(
                                value = phone,
                                onValueChange = { phone = it },
                                label = { Text("Phone Number", color = TextMuted) },
                                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = "Phone", tint = AccentTeal) },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = AccentTeal,
                                    unfocusedBorderColor = SoftBorder,
                                    focusedLabelColor = AccentTeal,
                                    focusedTextColor = TextWhite,
                                    unfocusedTextColor = TextWhite
                                ),
                                singleLine = true,
                                enabled = !otpSent && !otpSending,
                                modifier = Modifier.fillMaxWidth()
                            )

                            if (otpSent) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "✅ OTP sent to $phone",
                                    color = MintGreen,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium
                                )

                                Spacer(modifier = Modifier.height(12.dp))
                                OutlinedTextField(
                                    value = otp,
                                    onValueChange = { otp = it },
                                    label = { Text("Enter OTP", color = TextMuted) },
                                    leadingIcon = { Icon(Icons.Default.Password, contentDescription = "Password", tint = MintGreen) },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = MintGreen,
                                        unfocusedBorderColor = SoftBorder,
                                        focusedTextColor = TextWhite,
                                        unfocusedTextColor = TextWhite
                                    ),
                                    singleLine = true,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))

                            // Helper text for phone format
                            if (!otpSent) {
                                Text(
                                    text = "Enter with country code (e.g. +91 9876543210)",
                                    color = TextMuted,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(top = 4.dp, bottom = 4.dp)
                                )
                            }

                            Button(
                                onClick = {
                                    if (!otpSent) {
                                        if (phone.isNotEmpty() && activity != null) {
                                            // Ensure phone number has country code prefix
                                            val formattedPhone = phone.trim().let { p ->
                                                when {
                                                    p.startsWith("+") -> p  // Already has country code
                                                    p.startsWith("91") && p.length > 10 -> "+$p"
                                                    p.length == 10 -> "+91$p"  // Indian 10-digit number
                                                    else -> "+91$p"  // Default to India
                                                }
                                            }
                                            // Send OTP via Firebase Phone Auth
                                            viewModel.sendOtp(formattedPhone, activity)
                                        }
                                    } else {
                                        // Verify OTP via Firebase + exchange for backend JWT
                                        viewModel.verifyOtp(phone, otp)
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentTeal),
                                shape = RoundedCornerShape(10.dp),
                                enabled = !otpSending
                            ) {
                                if (otpSending) {
                                    CircularProgressIndicator(
                                        color = Color.Black,
                                        modifier = Modifier.size(20.dp),
                                        strokeWidth = 2.dp
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Sending OTP...",
                                        color = Color.Black,
                                        fontWeight = FontWeight.Bold
                                    )
                                } else {
                                    Text(
                                        text = if (!otpSent) "Request Phone OTP" else "Verify & Sign In",
                                        color = Color.Black,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            // Show OTP send error
                            if (otpSendState is OtpSendUiState.Error) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = (otpSendState as OtpSendUiState.Error).message,
                                    color = DangerRed,
                                    fontSize = 12.sp,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    Text("ALTERNATIVE SECURE LOGINS", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = { viewModel.loginWithSocial("Google") },
                            modifier = Modifier.weight(1f).height(44.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = CardSlate),
                            border = BorderStroke(1.dp, SoftBorder),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.AccountCircle, contentDescription = "Google", tint = TextWhite)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Google", color = TextWhite, fontSize = 12.sp)
                        }

                        Button(
                            onClick = { viewModel.loginWithSocial("Apple") },
                            modifier = Modifier.weight(1f).height(44.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = CardSlate),
                            border = BorderStroke(1.dp, SoftBorder),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Fingerprint, contentDescription = "Biometrics", tint = TextWhite)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Apple ID", color = TextWhite, fontSize = 12.sp)
                        }
                    }

                    if (authState is AuthUiState.Error) {
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = (authState as AuthUiState.Error).message,
                            color = DangerRed,
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NameEntryScreen(viewModel: MediReminderViewModel) {
    var userName by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(SlateBlack, DeepCharcoal)
                )
            )
            .padding(24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Welcome icon
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(AccentTeal.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.PersonAdd,
                    contentDescription = "Welcome",
                    tint = AccentTeal,
                    modifier = Modifier.size(40.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Welcome to MediReminder!",
                color = TextWhite,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Let's personalize your experience",
                color = TextMuted,
                fontSize = 14.sp
            )

            Spacer(modifier = Modifier.height(36.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardSlate),
                border = BorderStroke(1.dp, SoftBorder),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "What should we call you?",
                        color = TextWhite,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "This name will appear on your dashboard",
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = userName,
                        onValueChange = { userName = it },
                        label = { Text("Your Name", color = TextMuted) },
                        placeholder = { Text("e.g. Ajeet Yadav", color = TextMuted.copy(alpha = 0.5f)) },
                        leadingIcon = {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = "Name",
                                tint = AccentTeal
                            )
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = AccentTeal,
                            unfocusedBorderColor = SoftBorder,
                            focusedLabelColor = AccentTeal,
                            focusedTextColor = TextWhite,
                            unfocusedTextColor = TextWhite
                        ),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            if (userName.isNotBlank()) {
                                isSaving = true
                                viewModel.submitUserName(userName.trim())
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentTeal),
                        shape = RoundedCornerShape(12.dp),
                        enabled = userName.isNotBlank() && !isSaving
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(
                                color = Color.Black,
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Setting up...", color = Color.Black, fontWeight = FontWeight.Bold)
                        } else {
                            Icon(
                                Icons.Default.ArrowForward,
                                contentDescription = "Continue",
                                tint = Color.Black
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Continue to Dashboard",
                                color = Color.Black,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(
                onClick = { viewModel.submitUserName("User") }
            ) {
                Text(
                    text = "Skip for now",
                    color = TextMuted,
                    fontSize = 13.sp
                )
            }
        }
    }
}

@Composable
fun DashboardScreen(viewModel: MediReminderViewModel) {
    val medicines by viewModel.medicines.collectAsState()
    val todayReminders by viewModel.todayReminders.collectAsState()
    val complianceRate by viewModel.compliancePercentage.collectAsState()
    val authState by viewModel.authState.collectAsState()
    val adminConfig by viewModel.adminState.collectAsState()
    
    val profile = (authState as? AuthUiState.Authenticated)?.profile

    var showAdminHUD by remember { mutableStateOf(false) }

    var simPrice by remember { mutableStateOf(adminConfig.pricePerDay.toString()) }
    var simBlocked by remember { mutableStateOf(adminConfig.isUserBlocked) }
    var simMaint by remember { mutableStateOf(adminConfig.isMaintenanceMode) }
    var simBroadcast by remember { mutableStateOf(adminConfig.adminBroadcastMessage ?: "") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Hello, ${profile?.name ?: "User"}",
                        color = TextWhite,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Your Compliance Cabinet",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                }
                
                IconButton(
                    onClick = { showAdminHUD = !showAdminHUD },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = if (showAdminHUD) WarningAmber else CardSlate
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.AdminPanelSettings,
                        contentDescription = "Simulate Admin Panel",
                        tint = if (showAdminHUD) Color.Black else TextWhite
                    )
                }
            }
        }

        if (showAdminHUD) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = CardSlate),
                    border = BorderStroke(1.dp, WarningAmber)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Admin Simulation Overlay",
                                color = WarningAmber,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Instant Sync Mock Server",
                                color = TextMuted,
                                fontSize = 11.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Block This User Profile", color = TextWhite, fontSize = 13.sp)
                            Switch(
                                checked = simBlocked,
                                onCheckedChange = {
                                    simBlocked = it
                                    viewModel.simulateAdminTweak(simPrice.toDoubleOrNull() ?: 1.5, it, simMaint, simBroadcast)
                                },
                                colors = SwitchDefaults.colors(checkedThumbColor = DangerRed)
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Set App Under Maintenance", color = TextWhite, fontSize = 13.sp)
                            Switch(
                                checked = simMaint,
                                onCheckedChange = {
                                    simMaint = it
                                    viewModel.simulateAdminTweak(simPrice.toDoubleOrNull() ?: 1.5, simBlocked, it, simBroadcast)
                                }
                            )
                        }

                        OutlinedTextField(
                            value = simPrice,
                            onValueChange = {
                                simPrice = it
                                it.toDoubleOrNull()?.let { p ->
                                    viewModel.simulateAdminTweak(p, simBlocked, simMaint, simBroadcast)
                                }
                            },
                            label = { Text("Admin Price Per Day (USD)", color = WarningAmber) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextWhite,
                                unfocusedTextColor = TextWhite,
                                focusedBorderColor = WarningAmber
                            ),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        OutlinedTextField(
                            value = simBroadcast,
                            onValueChange = {
                                simBroadcast = it
                                viewModel.simulateAdminTweak(simPrice.toDoubleOrNull() ?: 1.5, simBlocked, simMaint, it)
                            },
                            label = { Text("Broadcast Push Notification Msg", color = WarningAmber) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextWhite,
                                unfocusedTextColor = TextWhite,
                                focusedBorderColor = WarningAmber
                            ),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth().height(56.dp)
                        )
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DeepCharcoal),
                border = BorderStroke(1.dp, SoftBorder),
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .padding(4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            drawArc(
                                color = SoftBorder,
                                startAngle = 0f,
                                sweepAngle = 360f,
                                useCenter = false,
                                style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                            )
                            drawArc(
                                color = MintGreen,
                                startAngle = -90f,
                                sweepAngle = (complianceRate.toFloat() / 100f) * 360f,
                                useCenter = false,
                                style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                            )
                        }
                        Text(
                            text = "${complianceRate.toInt()}%",
                            color = TextWhite,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.width(20.dp))

                    Column {
                        Text(
                            text = "Daily Compliance Rate",
                            color = TextWhite,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "A perfect compliance keeps you sound.",
                            color = TextMuted,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(MintGreen)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${medicines.size} Active Cabinet Drugs",
                                fontSize = 11.sp,
                                color = AccentTeal,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        item {
            Button(
                onClick = { viewModel.navigateTo("scanner") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AccentTeal),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.CameraAlt,
                    contentDescription = "Scan",
                    tint = Color.Black
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "Upload Prescription (Gemini OCR)",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Today's Schedule Progress",
                    color = TextWhite,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                TextButton(onClick = { viewModel.navigateTo("calendar_page") }) {
                    Text("Compliance Logs", color = AccentTeal, fontSize = 13.sp)
                }
            }
        }

        if (todayReminders.isEmpty()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    colors = CardDefaults.cardColors(containerColor = CardSlate.copy(0.5f)),
                    border = BorderStroke(1.dp, SoftBorder)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.EventNote,
                            contentDescription = "No tasks",
                            tint = TextMuted,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "No medications scheduled today.",
                            color = TextWhite,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Tap below or scan prescription to register medicines.",
                            color = TextMuted,
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        } else {
            items(todayReminders) { reminder ->
                ReminderItemCard(reminder = reminder, onAction = { action ->
                    viewModel.setReminderStatus(reminder.id, action)
                })
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Medication Stock Cabinet",
                    color = TextWhite,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                Button(
                    onClick = { viewModel.navigateTo("manual_entry") },
                    colors = ButtonDefaults.buttonColors(containerColor = CardSlate),
                    contentPadding = PaddingValues(horizontal = 12.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add", tint = AccentTeal, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add Manual", color = AccentTeal, fontSize = 12.sp)
                }
            }
        }

        if (medicines.isEmpty()) {
            item {
                Text(
                    text = "Cabinet is empty. No remedies registered.",
                    color = TextMuted,
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
                )
            }
        } else {
            items(medicines) { medication ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = CardSlate.copy(0.6f)),
                    border = BorderStroke(1.dp, SoftBorder)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.MedicalServices,
                                contentDescription = "Medicine",
                                tint = AccentTeal,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = medication.medicineName,
                                    color = TextWhite,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(
                                    text = "${medication.strength}  |  ${medication.durationDays} Days Duration",
                                    color = TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }
                        IconButton(onClick = { viewModel.deleteMedicine(medication.id) }) {
                            Icon(
                                imageVector = Icons.Default.DeleteOutline,
                                contentDescription = "Delete",
                                tint = DangerRed
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ReminderItemCard(reminder: ReminderItem, onAction: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardSlate),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(
            width = 1.dp,
            color = when (reminder.status) {
                "Taken" -> MintGreen.copy(0.4f)
                "Skipped" -> DangerRed.copy(0.4f)
                "Snoozed" -> WarningAmber.copy(0.4f)
                else -> SoftBorder
            }
        )
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val statusColor = when (reminder.status) {
                        "Taken" -> MintGreen
                        "Skipped" -> DangerRed
                        "Snoozed" -> WarningAmber
                        else -> TextMuted
                    }
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(statusColor)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = reminder.medicineName,
                        color = TextWhite,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }

                Card(
                    colors = CardDefaults.cardColors(containerColor = DeepCharcoal),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = reminder.scheduledTime,
                        color = TextBlueMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Dosage: ${reminder.strength}",
                color = TextMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(start = 20.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { onAction("Taken") },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (reminder.status == "Taken") MintGreen else SoftBorder
                    ),
                    modifier = Modifier.weight(1f).height(36.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Icon(Icons.Default.Check, contentDescription = "Taken", modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Taken", fontSize = 11.sp, color = if (reminder.status == "Taken") Color.Black else TextWhite)
                }

                Button(
                    onClick = { onAction("Skipped") },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (reminder.status == "Skipped") DangerRed else SoftBorder
                    ),
                    modifier = Modifier.weight(1f).height(36.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Icon(Icons.Default.Cancel, contentDescription = "Skip", modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Skip", fontSize = 11.sp, color = TextWhite)
                }

                Button(
                    onClick = { onAction("Snoozed") },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (reminder.status == "Snoozed") WarningAmber else SoftBorder
                    ),
                    modifier = Modifier.weight(1f).height(36.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Icon(Icons.Default.Snooze, contentDescription = "Snooze", modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Snooze", fontSize = 11.sp, color = if (reminder.status == "Snoozed") Color.Black else TextWhite)
                }
            }
        }
    }
}

@Composable
fun PrescriptionScannerScreen(viewModel: MediReminderViewModel) {
    val ocrState by viewModel.ocrState.collectAsState()
    val context = LocalContext.current
    
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            try {
                val stream: InputStream? = context.contentResolver.openInputStream(it)
                val b = BitmapFactory.decodeStream(stream)
                b?.let { bmp ->
                    viewModel.uploadPrescriptionPic(bmp)
                }
            } catch (e: Exception) {
                // Ignore errors
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { viewModel.navigateTo("dashboard") }) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextWhite)
            }
            Text(
                text = "Prescription OCR Scan",
                color = TextWhite,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Text(
            text = "Select a prescription image to extract details automatically with Gemini AI, or add your medications manually.",
            color = TextMuted,
            fontSize = 13.sp
        )

        when (val state = ocrState) {
            is OcrUiState.Idle -> {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .clickable {
                            galleryLauncher.launch("image/*")
                        },
                    colors = CardDefaults.cardColors(containerColor = CardSlate),
                    border = BorderStroke(2.dp, Brush.sweepGradient(listOf(AccentTeal, MintGreen))),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudUpload,
                            contentDescription = "Upload",
                            tint = AccentTeal,
                            modifier = Modifier.size(44.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Upload Prescription Image", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Select image to extract medicines automatically", color = TextMuted, fontSize = 11.sp)
                    }
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .clickable {
                            viewModel.navigateTo("manual_entry")
                        },
                    colors = CardDefaults.cardColors(containerColor = CardSlate),
                    border = BorderStroke(1.dp, SoftBorder),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.EditNote,
                            contentDescription = "Manual Entry",
                            tint = MintGreen,
                            modifier = Modifier.size(44.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Manual Medication Entry", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Add medicines and set schedule manually", color = TextMuted, fontSize = 11.sp)
                    }
                }
            }
            is OcrUiState.Running -> {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(color = MintGreen)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Analyzing with Gemini Flash OCR...",
                        color = TextWhite,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            is OcrUiState.Finished -> {
                val extraction = state.data
                
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = DeepCharcoal),
                    border = BorderStroke(1.dp, MintGreen)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Extracted Medicine Verification", color = MintGreen, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            IconButton(onClick = { viewModel.resetOcr() }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Reset", tint = TextWhite)
                            }
                        }
                        
                        Divider(modifier = Modifier.padding(vertical = 10.dp), color = SoftBorder)

                        Card(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                            colors = CardDefaults.cardColors(containerColor = DangerRed.copy(0.12f)),
                            border = BorderStroke(1.dp, DangerRed)
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Warning, contentDescription = "Caution", tint = DangerRed, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = "Please verify medicine details with your doctor or pharmacist before proceeding.",
                                    color = TextWhite,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        extraction.medicines.forEach { med ->
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                colors = CardDefaults.cardColors(containerColor = CardSlate)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(med.medicineName, color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text(med.strength, color = AccentTeal, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("Frequency: ${med.frequency} (${med.durationDays} days)", color = TextMuted, fontSize = 11.sp)
                                    
                                    if (med.instructions.isNotEmpty()) {
                                        Text("Rules: ${med.instructions}", color = WarningAmber, fontSize = 11.sp)
                                    }

                                    Spacer(modifier = Modifier.height(6.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        if (med.morning) BadgeTag("Morning")
                                        if (med.afternoon) BadgeTag("Afternoon")
                                        if (med.evening) BadgeTag("Evening")
                                        if (med.night) BadgeTag("Night")
                                        if (med.beforeFood) BadgeTag("Before Food")
                                        if (med.afterFood) BadgeTag("After Food")
                                    }
                                }
                            }
                        }

                        extraction.interactionWarning?.let { warning ->
                            if (warning.isNotEmpty()) {
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                                    colors = CardDefaults.cardColors(containerColor = WarningAmber.copy(0.15f)),
                                    border = BorderStroke(1.dp, WarningAmber)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text("AI Safety Warning", color = WarningAmber, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        Text(warning, color = TextWhite, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = {
                                val medsToEdit = extraction.medicines.map {
                                    Medicine(
                                        medicineName = it.medicineName,
                                        strength = it.strength,
                                        frequency = it.frequency,
                                        durationDays = it.durationDays,
                                        morning = it.morning,
                                        afternoon = it.afternoon,
                                        evening = it.evening,
                                        night = it.night,
                                        beforeFood = it.beforeFood,
                                        afterFood = it.afterFood,
                                        instructions = it.instructions
                                    )
                                }
                                viewModel.setEditableMedicines(medsToEdit)
                                viewModel.navigateTo("medicine_manager")
                            },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MintGreen)
                        ) {
                            Text("Review & Edit Medicines", color = Color.Black, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            is OcrUiState.Error -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = DangerRed.copy(alpha = 0.1f)),
                    border = BorderStroke(1.dp, DangerRed.copy(alpha = 0.4f)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.ErrorOutline,
                                contentDescription = null,
                                tint = DangerRed,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Extraction Failed",
                                color = DangerRed,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                        Text(
                            state.message,
                            color = TextMuted,
                            fontSize = 13.sp
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { viewModel.resetOcr() },
                                modifier = Modifier.weight(1f),
                                border = BorderStroke(1.dp, SoftBorder),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Retake Photo", color = TextWhite, fontSize = 12.sp)
                            }
                            Button(
                                onClick = { viewModel.navigateTo("manual_entry") },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = AccentTeal),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Add Manually", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            else -> {}
        }
    }
}

@Composable
fun BadgeTag(text: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = CardSlate.copy(0.7f)),
        shape = RoundedCornerShape(4.dp),
        border = BorderStroke(1.dp, SoftBorder)
    ) {
        Text(
            text = text,
            color = AccentTeal,
            fontSize = 9.sp,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManualEntryScreen(viewModel: MediReminderViewModel) {
    var name by remember { mutableStateOf("") }
    var dosage by remember { mutableStateOf("") }
    var durationField by remember { mutableStateOf("7") }
    var frequency by remember { mutableStateOf("Daily") }
    
    var morning by remember { mutableStateOf(false) }
    var afternoon by remember { mutableStateOf(false) }
    var evening by remember { mutableStateOf(false) }
    var night by remember { mutableStateOf(false) }
    
    var beforeFood by remember { mutableStateOf(false) }
    var afterFood by remember { mutableStateOf(false) }

    var instructions by remember { mutableStateOf("") }
    val safetyWarning by viewModel.safetyWarning.collectAsState()
    val duplicateWarning by viewModel.duplicateWarning.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { 
                viewModel.clearSafetyNotices()
                viewModel.navigateTo("dashboard") 
            }) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextWhite)
            }
            Text(
                text = "Add Medication Cabinet",
                color = TextWhite,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }

        duplicateWarning?.let { dup ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DangerRed.copy(0.15f)),
                border = BorderStroke(1.dp, DangerRed)
            ) {
                Text(dup, color = TextWhite, modifier = Modifier.padding(12.dp), fontSize = 12.sp)
            }
        }

        safetyWarning?.let { safety ->
            Card(
                colors = CardDefaults.cardColors(containerColor = WarningAmber.copy(0.15f)),
                border = BorderStroke(1.dp, WarningAmber)
            ) {
                Text(safety, color = TextWhite, modifier = Modifier.padding(12.dp), fontSize = 12.sp)
            }
        }

        OutlinedTextField(
            value = name,
            onValueChange = { 
                name = it
                if (it.length > 3) {
                    viewModel.checkDrugHazards(it)
                }
            },
            label = { Text("Medication Name", color = TextMuted) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextWhite,
                unfocusedTextColor = TextWhite,
                focusedBorderColor = AccentTeal
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = dosage,
            onValueChange = { dosage = it },
            label = { Text("Dosage Size (e.g. 500mg, 1 Tablet...)", color = TextMuted) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextWhite,
                unfocusedTextColor = TextWhite,
                focusedBorderColor = AccentTeal
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = durationField,
                onValueChange = { durationField = it },
                label = { Text("Duration Days", color = TextMuted) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = AccentTeal
                ),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )

            OutlinedTextField(
                value = frequency,
                onValueChange = { frequency = it },
                label = { Text("Frequency", color = TextMuted) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = AccentTeal
                ),
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
        }

        Text("Timings Schedules", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Card(
            colors = CardDefaults.cardColors(containerColor = CardSlate),
            border = BorderStroke(1.dp, SoftBorder)
        ) {
            Column(modifier = Modifier.padding(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Morning (08:00 AM)", color = TextMuted, modifier = Modifier.padding(8.dp), fontSize = 13.sp)
                    Checkbox(checked = morning, onCheckedChange = { morning = it })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Afternoon (01:00 PM)", color = TextMuted, modifier = Modifier.padding(8.dp), fontSize = 13.sp)
                    Checkbox(checked = afternoon, onCheckedChange = { afternoon = it })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Evening (05:00 PM)", color = TextMuted, modifier = Modifier.padding(8.dp), fontSize = 13.sp)
                    Checkbox(checked = evening, onCheckedChange = { evening = it })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Night (09:00 PM)", color = TextMuted, modifier = Modifier.padding(8.dp), fontSize = 13.sp)
                    Checkbox(checked = night, onCheckedChange = { night = it })
                }
            }
        }

        Text("Food Constants", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = beforeFood, onCheckedChange = { 
                    beforeFood = it; if (it) afterFood = false 
                })
                Text("Before Food", color = TextMuted, fontSize = 13.sp)
            }
            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = afterFood, onCheckedChange = { 
                    afterFood = it; if (it) beforeFood = false 
                })
                Text("After Food", color = TextMuted, fontSize = 13.sp)
            }
        }

        OutlinedTextField(
            value = instructions,
            onValueChange = { instructions = it },
            label = { Text("Special Instructions", color = TextMuted) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextWhite,
                focusedBorderColor = AccentTeal,
                unfocusedTextColor = TextWhite
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = {
                if (name.isNotEmpty()) {
                    viewModel.submitManualMedicine(
                        name = name,
                        dosage = dosage,
                        frequency = frequency,
                        durationDays = durationField.toIntOrNull() ?: 7,
                        morning = morning,
                        afternoon = afternoon,
                        evening = evening,
                        night = night,
                        beforeFood = beforeFood,
                        afterFood = afterFood,
                        instructions = instructions
                    )
                    viewModel.navigateTo("dashboard")
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = MintGreen),
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(10.dp)
        ) {
            Text("Register Cabinets", color = Color.Black, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun ProUpgradeScreen(viewModel: MediReminderViewModel) {
    val adminConfig by viewModel.adminState.collectAsState()
    
    var premiumDays by remember { mutableStateOf(30) }
    var selectedMethod by remember { mutableStateOf("UPI") }
    var customNumber by remember { mutableStateOf("") }
    
    var isRecordingSim by remember { mutableStateOf(false) }

    val cost = premiumDays * adminConfig.pricePerDay

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Go Pro with MediReminder AI", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text("Unlock premium features instantly.", color = TextMuted, fontSize = 13.sp)

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = DeepCharcoal),
            border = BorderStroke(1.dp, Brush.horizontalGradient(listOf(AccentTeal, MintGreen)))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("🔥 PRO ACCESS CHANNELS", color = MintGreen, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(10.dp))
                ProBenefitRow(Icons.Default.RecordVoiceOver, "Custom Voice Alarms (Record instructions safely)")
                ProBenefitRow(Icons.Default.Message, "WhatsApp Reminders triggered instantly")
                ProBenefitRow(Icons.Default.Group, "Family WhatsApp Alerts & Real-Time remote logs")
                ProBenefitRow(Icons.Default.Dashboard, "Family Monitoring compliance panel")
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardSlate),
            border = BorderStroke(1.dp, SoftBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Subscription (Pay Per Day)", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(5, 15, 30, 60).forEach { days ->
                        Button(
                            onClick = { premiumDays = days },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (premiumDays == days) AccentTeal else CardSlate
                            ),
                            modifier = Modifier.weight(1f).height(38.dp),
                            contentPadding = PaddingValues(0.dp)
                        ) {
                            Text("${days}d", color = if (premiumDays == days) Color.Black else TextWhite, fontSize = 12.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Rate Per Day: $${adminConfig.pricePerDay}", color = TextMuted, fontSize = 12.sp)
                        Text("Formula: days x price", color = TextMuted, fontSize = 11.sp)
                    }
                    Text("Total: $${"%.2f".format(cost)}", color = MintGreen, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
            }
        }

        Text("Payment Gateway via PayU", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardSlate),
            border = BorderStroke(1.dp, SoftBorder)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("UPI", "Cards", "Net Banking").forEach { method ->
                    Button(
                        onClick = { selectedMethod = method },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selectedMethod == method) MintGreen else DeepCharcoal
                        ),
                        modifier = Modifier.weight(1f).height(40.dp),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        Text(method, color = if (selectedMethod == method) Color.Black else TextWhite, fontSize = 11.sp)
                    }
                }
            }
        }

        Text("Pro Configurations", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        
        OutlinedTextField(
            value = customNumber,
            onValueChange = { customNumber = it },
            label = { Text("WhatsApp Number (+91...)", color = TextMuted) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextWhite,
                focusedBorderColor = AccentTeal,
                unfocusedTextColor = TextWhite
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = DeepCharcoal)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Custom Voice Pill Alarms", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text(
                        if (isRecordingSim) "🔴 RECORDING..." else "Tap to record alarm audio stream",
                        color = if (isRecordingSim) DangerRed else TextMuted,
                        fontSize = 11.sp
                    )
                }
                Button(
                    onClick = { isRecordingSim = !isRecordingSim },
                    colors = ButtonDefaults.buttonColors(containerColor = if (isRecordingSim) DangerRed else SoftBorder)
                ) {
                    Icon(
                        imageVector = if (isRecordingSim) Icons.Default.Stop else Icons.Default.Mic,
                        contentDescription = "Mic"
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        var paymentResponse by remember { mutableStateOf<String?>(null) }

        Button(
            onClick = {
                viewModel.upgradeSubscription(premiumDays, selectedMethod) { msg ->
                    paymentResponse = msg
                }
            },
            colors = ButtonDefaults.buttonColors(containerColor = MintGreen),
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(10.dp)
        ) {
            Icon(Icons.Default.Lock, contentDescription = "Lock", tint = Color.Black)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Secure Checkout via PayU", color = Color.Black, fontWeight = FontWeight.Bold)
        }

        paymentResponse?.let { msg ->
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = CardSlate),
                border = BorderStroke(1.dp, MintGreen)
            ) {
                Text(msg, color = TextWhite, modifier = Modifier.padding(12.dp), fontSize = 13.sp)
            }
        }
    }
}

@Composable
fun ProBenefitRow(icon: ImageVector, text: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(imageVector = icon, contentDescription = "Perk", tint = AccentTeal, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Text(text = text, color = TextWhite, fontSize = 12.sp)
    }
}

@Composable
fun FamilyManagementScreen(viewModel: MediReminderViewModel) {
    val familyMembers by viewModel.familyMembers.collectAsState()
    
    var name by remember { mutableStateOf("") }
    var relation by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var gender by remember { mutableStateOf("Male") }
    var contact by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Family Members Register", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text("Link profiles of family members to track compliance thresholds remotely.", color = TextMuted, fontSize = 13.sp)

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = CardSlate),
            border = BorderStroke(1.dp, SoftBorder)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Register New Member", color = AccentTeal, fontWeight = FontWeight.Bold, fontSize = 14.sp)

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Name", color = TextMuted) },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite, focusedBorderColor = AccentTeal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = relation,
                    onValueChange = { relation = it },
                    label = { Text("Relation (e.g. Father, Wife, Son)", color = TextMuted) },
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite, focusedBorderColor = AccentTeal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = age,
                        onValueChange = { age = it },
                        label = { Text("Age", color = TextMuted) },
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite, focusedBorderColor = AccentTeal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )

                    OutlinedTextField(
                        value = contact,
                        onValueChange = { contact = it },
                        label = { Text("Emergency Phone", color = TextMuted) },
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite, focusedBorderColor = AccentTeal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }

                Button(
                    onClick = {
                        if (name.isNotEmpty() && relation.isNotEmpty()) {
                            viewModel.addFamily(
                                name = name,
                                relation = relation,
                                age = age.toIntOrNull() ?: 50,
                                gender = gender,
                                contact = contact
                            )
                            name = ""
                            relation = ""
                            age = ""
                            contact = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MintGreen),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Add Member Family ID", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            }
        }

        Text("Registered Members", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        if (familyMembers.isEmpty()) {
            Text("No members registered. Connect family members to trigger automatic Pro WhatsApp alerts.", color = TextMuted, fontSize = 12.sp)
        } else {
            familyMembers.forEach { member ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = DeepCharcoal),
                    border = BorderStroke(1.dp, SoftBorder)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AccountCircle, contentDescription = "User", tint = AccentTeal, modifier = Modifier.size(36.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(member.name, color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text("${member.relation}  |  Age: ${member.age}", color = TextMuted, fontSize = 12.sp)
                            }
                        }
                        
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CardSlate)
                        ) {
                            Text(
                                text = "Compliance: 96%",
                                color = MintGreen,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CalendarComplianceScreen(viewModel: MediReminderViewModel) {
    val selectedDate by viewModel.selectedDate.collectAsState()
    val todayReminders by viewModel.todayReminders.collectAsState()
    
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    val formatSDFDayCard = SimpleDateFormat("dd", Locale.getDefault())
    val formatSDFMonthDay = SimpleDateFormat("EEE", Locale.getDefault())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(16.dp)
    ) {
        Text("Medicine Compliance Map", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text("Track historical medication intakes across calendars.", color = TextMuted, fontSize = 13.sp)

        Spacer(modifier = Modifier.height(16.dp))

        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items((0 until 30).toList()) { idx ->
                val loopCal = Calendar.getInstance()
                loopCal.add(Calendar.DAY_OF_YEAR, idx - 15)
                
                val dateStr = formatter.format(loopCal.time)
                val isSelected = dateStr == selectedDate

                Card(
                     modifier = Modifier
                        .width(56.dp)
                        .height(72.dp)
                        .clickable { viewModel.setDate(dateStr) },
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) AccentTeal else CardSlate
                    ),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, if (isSelected) MintGreen else SoftBorder)
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = formatSDFMonthDay.format(loopCal.time).uppercase(),
                            color = if (isSelected) Color.Black else TextMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = formatSDFDayCard.format(loopCal.time),
                            color = if (isSelected) Color.Black else TextWhite,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text("Schedule Logs for $selectedDate", color = AccentTeal, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (todayReminders.isEmpty()) {
                item {
                    Text(
                        "No meds registered for this day.",
                        color = TextMuted,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(top = 24.dp)
                    )
                }
            } else {
                items(todayReminders) { reminder ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DeepCharcoal)
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(reminder.medicineName, color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("Scheduled: ${reminder.scheduledTime}", color = TextMuted, fontSize = 12.sp)
                            }
                            
                            val textState = if (reminder.status == "Pending") "Scheduled" else reminder.status
                            val colorState = when(reminder.status) {
                                "Taken" -> MintGreen
                                "Skipped" -> DangerRed
                                "Snoozed" -> WarningAmber
                                else -> AccentTeal
                            }
                            Text(
                                text = textState,
                                color = colorState,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(viewModel: MediReminderViewModel) {
    val isDark by viewModel.isDarkMode.collectAsState()
    val notificationOn by viewModel.notificationsEnabled.collectAsState()
    val language by viewModel.selectedLanguage.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBlack)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("Application Settings", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 22.sp)
        Text("Personalize user configs, alarms, and local metadata.", color = TextMuted, fontSize = 13.sp)

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = DeepCharcoal)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Dark Display Theme", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Activates neon high-contrast presentation mode.", color = TextMuted, fontSize = 11.sp)
                    }
                    Switch(checked = isDark, onCheckedChange = { viewModel.isDarkMode.value = it })
                }

                Divider(color = SoftBorder)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Push Alarms Enabled", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Configures mobile push systems via FCM", color = TextMuted, fontSize = 11.sp)
                    }
                    Switch(checked = notificationOn, onCheckedChange = { viewModel.notificationsEnabled.value = it })
                }

                Divider(color = SoftBorder)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Selected Language", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Sets context for system messaging translations", color = TextMuted, fontSize = 11.sp)
                    }
                    Text(language, color = AccentTeal, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        Button(
            onClick = { viewModel.logout() },
            colors = ButtonDefaults.buttonColors(containerColor = DangerRed),
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(10.dp)
        ) {
            Icon(Icons.Default.Logout, contentDescription = "Sign Out", tint = TextWhite)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Logout Session", color = TextWhite, fontWeight = FontWeight.Bold)
        }
    }
}

// ======================== GLOBAL UTILS ========================

@Composable
fun BottomNavBar(
    currentRoute: String,
    onRouteSelected: (String) -> Unit,
    isPro: Boolean
) {
    NavigationBar(
        containerColor = DeepCharcoal,
        tonalElevation = 8.dp,
        modifier = Modifier.windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        NavigationBarItem(
            selected = currentRoute == "dashboard",
            onClick = { onRouteSelected("dashboard") },
            icon = { Icon(Icons.Default.Dashboard, contentDescription = "Cabinet") },
            label = { Text("Cabinet") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AccentTeal,
                selectedTextColor = AccentTeal,
                unselectedIconColor = TextMuted,
                unselectedTextColor = TextMuted,
                indicatorColor = AccentTeal.copy(0.12f)
            )
        )

        NavigationBarItem(
            selected = currentRoute == "calendar_page",
            onClick = { onRouteSelected("calendar_page") },
            icon = { Icon(Icons.Default.CalendarMonth, contentDescription = "Calendar") },
            label = { Text("Logs") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AccentTeal,
                selectedTextColor = AccentTeal,
                unselectedIconColor = TextMuted,
                unselectedTextColor = TextMuted,
                indicatorColor = AccentTeal.copy(0.12f)
            )
        )

        NavigationBarItem(
            selected = currentRoute == "family_page",
            onClick = { onRouteSelected("family_page") },
            icon = { Icon(Icons.Default.Group, contentDescription = "Family") },
            label = { Text("Family") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AccentTeal,
                selectedTextColor = AccentTeal,
                unselectedIconColor = TextMuted,
                unselectedTextColor = TextMuted,
                indicatorColor = AccentTeal.copy(0.12f)
            )
        )

        NavigationBarItem(
            selected = currentRoute == "pro_page",
            onClick = { onRouteSelected("pro_page") },
            icon = { 
                Box {
                    Icon(Icons.Default.WorkspacePremium, contentDescription = "Go Pro")
                    if (!isPro) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(WarningAmber)
                                .align(Alignment.TopEnd)
                        )
                    }
                }
            },
            label = { Text("Upgrade") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AccentTeal,
                selectedTextColor = AccentTeal,
                unselectedIconColor = TextMuted,
                unselectedTextColor = TextMuted,
                indicatorColor = AccentTeal.copy(0.12f)
            )
        )

        NavigationBarItem(
            selected = currentRoute == "settings_page",
            onClick = { onRouteSelected("settings_page") },
            icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
            label = { Text("Settings") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AccentTeal,
                selectedTextColor = AccentTeal,
                unselectedIconColor = TextMuted,
                unselectedTextColor = TextMuted,
                indicatorColor = AccentTeal.copy(0.12f)
            )
        )
    }
}
