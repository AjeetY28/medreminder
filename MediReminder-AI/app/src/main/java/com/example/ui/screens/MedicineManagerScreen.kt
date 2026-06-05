package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Medicine
import com.example.ui.theme.*
import com.example.ui.viewmodel.MediReminderViewModel
import java.text.SimpleDateFormat
import java.util.*

// ======================== Medicine Manager Screen ========================

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun MedicineManagerScreen(viewModel: MediReminderViewModel) {
    val editableMedicines by viewModel.editableMedicines.collectAsState()
    var showAddSheet by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = SlateBlack,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "Medicine Manager",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            "${editableMedicines.size} medicine${if (editableMedicines.size != 1) "s" else ""}",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateTo("scanner") }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DeepCharcoal,
                    titleContentColor = TextWhite
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddSheet = true },
                containerColor = AccentTeal,
                contentColor = Color.Black,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Medicine")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add Medicine", fontWeight = FontWeight.Bold)
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (editableMedicines.isEmpty()) {
                // Empty state
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(AccentTeal.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.MedicalServices,
                            contentDescription = null,
                            tint = AccentTeal,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No Medicines Added",
                        color = TextWhite,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Tap the + button to add your medicines",
                        color = TextMuted,
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    itemsIndexed(editableMedicines) { index, medicine ->
                        EditableMedicineCard(
                            medicine = medicine,
                            onUpdate = { updated -> viewModel.updateEditableMedicine(index, updated) },
                            onDelete = { viewModel.removeEditableMedicine(index) }
                        )
                    }

                    // Bottom spacer for FAB clearance
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }

                // Confirm all button
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = DeepCharcoal),
                    border = BorderStroke(1.dp, MintGreen.copy(alpha = 0.3f)),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Button(
                        onClick = { viewModel.confirmAndSaveAllMedicines() },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp)
                            .height(52.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MintGreen),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color.Black
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Confirm & Save All Medicines",
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                    }
                }
            }
        }
    }

    // Add Medicine Bottom Sheet
    if (showAddSheet) {
        AddMedicineBottomSheet(
            onDismiss = { showAddSheet = false },
            onAdd = { medicine ->
                viewModel.addEditableMedicine(medicine)
                showAddSheet = false
            }
        )
    }
}

// ======================== Editable Medicine Card ========================

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EditableMedicineCard(
    medicine: Medicine,
    onUpdate: (Medicine) -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }
    var isEditingName by remember { mutableStateOf(false) }
    var isEditingDosage by remember { mutableStateOf(false) }
    var editedName by remember(medicine.medicineName) { mutableStateOf(medicine.medicineName) }
    var editedDosage by remember(medicine.strength) { mutableStateOf(medicine.strength) }
    var editedNotes by remember(medicine.notes) { mutableStateOf(medicine.notes) }
    var isExpanded by remember { mutableStateOf(true) }

    // Frequency state
    val frequencyOptions = listOf("Daily", "Alternate Days", "Weekly", "X Times/Week", "Monthly", "Every X Days", "Custom Dates")
    var selectedFrequency by remember(medicine.frequency) { mutableStateOf(medicine.frequency) }

    // Dates
    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }
    var showStartDatePicker by remember { mutableStateOf(false) }
    var showEndDatePicker by remember { mutableStateOf(false) }
    var startDateMs by remember(medicine.startDate) { mutableStateOf(medicine.startDate) }
    var endDateMs by remember(medicine.endDate) { mutableStateOf(medicine.endDate) }
    var continueUntilStopped by remember(medicine.continueUntilStopped) { mutableStateOf(medicine.continueUntilStopped) }

    // Time slots
    var isMorning by remember(medicine.morning) { mutableStateOf(medicine.morning) }
    var isAfternoon by remember(medicine.afternoon) { mutableStateOf(medicine.afternoon) }
    var isEvening by remember(medicine.evening) { mutableStateOf(medicine.evening) }
    var isNight by remember(medicine.night) { mutableStateOf(medicine.night) }

    // Custom times
    var morningTime by remember(medicine.morningTime) { mutableStateOf(medicine.morningTime) }
    var afternoonTime by remember(medicine.afternoonTime) { mutableStateOf(medicine.afternoonTime) }
    var eveningTime by remember(medicine.eveningTime) { mutableStateOf(medicine.eveningTime) }
    var nightTime by remember(medicine.nightTime) { mutableStateOf(medicine.nightTime) }
    var showTimePicker by remember { mutableStateOf<String?>(null) }

    // Meal timing
    var beforeFood by remember(medicine.beforeFood) { mutableStateOf(medicine.beforeFood) }
    var afterFood by remember(medicine.afterFood) { mutableStateOf(medicine.afterFood) }
    var withFood by remember(medicine.withFood) { mutableStateOf(medicine.withFood) }
    var emptyStomach by remember(medicine.emptyStomach) { mutableStateOf(medicine.emptyStomach) }

    // Weekly / Monthly / Custom
    var weeklyDay by remember(medicine.weeklyDay) { mutableStateOf(medicine.weeklyDay) }
    var monthlyDate by remember(medicine.monthlyDate) { mutableStateOf(medicine.monthlyDate) }
    var customIntervalDays by remember(medicine.customIntervalDays) { mutableStateOf(medicine.customIntervalDays) }
    var customIntervalText by remember(medicine.customIntervalDays) {
        mutableStateOf(if (medicine.customIntervalDays > 0) medicine.customIntervalDays.toString() else "")
    }
    var monthlyDateText by remember(medicine.monthlyDate) {
        mutableStateOf(if (medicine.monthlyDate > 0) medicine.monthlyDate.toString() else "")
    }

    // X Times/Week — multi-select days
    var weeklyDaysSet by remember(medicine.weeklyDays) {
        mutableStateOf(
            if (medicine.weeklyDays.isNotEmpty())
                medicine.weeklyDays.split(",").mapNotNull { it.trim().toIntOrNull() }.toSet()
            else emptySet()
        )
    }

    // Custom Dates — arbitrary dates
    var customDatesSet by remember(medicine.customDates) {
        mutableStateOf(
            if (medicine.customDates.isNotEmpty())
                medicine.customDates.split(",").mapNotNull { it.trim().toLongOrNull() }.toSet()
            else emptySet()
        )
    }
    var showCustomDatePicker by remember { mutableStateOf(false) }

    // Sync changes back to parent
    fun emitUpdate() {
        onUpdate(
            medicine.copy(
                medicineName = editedName,
                strength = editedDosage,
                frequency = selectedFrequency,
                morning = isMorning,
                afternoon = isAfternoon,
                evening = isEvening,
                night = isNight,
                beforeFood = beforeFood,
                afterFood = afterFood,
                withFood = withFood,
                emptyStomach = emptyStomach,
                startDate = startDateMs,
                endDate = endDateMs,
                continueUntilStopped = continueUntilStopped,
                morningTime = morningTime,
                afternoonTime = afternoonTime,
                eveningTime = eveningTime,
                nightTime = nightTime,
                weeklyDay = weeklyDay,
                monthlyDate = monthlyDate,
                customIntervalDays = customIntervalDays,
                weeklyDays = weeklyDaysSet.sorted().joinToString(","),
                customDates = customDatesSet.sorted().joinToString(","),
                notes = editedNotes
            )
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = CardSlate),
        border = BorderStroke(
            1.dp,
            Brush.linearGradient(listOf(AccentTeal.copy(alpha = 0.4f), MintGreen.copy(alpha = 0.2f)))
        ),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {

            // ===== Header: Name + Dosage + Edit/Delete =====
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    // Medicine Name
                    if (isEditingName) {
                        OutlinedTextField(
                            value = editedName,
                            onValueChange = { editedName = it },
                            label = { Text("Medicine Name", color = TextMuted) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextWhite,
                                unfocusedTextColor = TextWhite,
                                focusedBorderColor = AccentTeal,
                                unfocusedBorderColor = SoftBorder
                            ),
                            singleLine = true,
                            trailingIcon = {
                                IconButton(onClick = {
                                    isEditingName = false
                                    emitUpdate()
                                }) {
                                    Icon(Icons.Default.Check, "Confirm", tint = MintGreen)
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Medication,
                                contentDescription = null,
                                tint = AccentTeal,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                editedName,
                                color = TextWhite,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f)
                            )
                            IconButton(
                                onClick = { isEditingName = true },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    Icons.Default.Edit,
                                    contentDescription = "Edit Name",
                                    tint = AccentTeal,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Dosage
                    if (isEditingDosage) {
                        OutlinedTextField(
                            value = editedDosage,
                            onValueChange = { editedDosage = it },
                            label = { Text("Dosage", color = TextMuted) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextWhite,
                                unfocusedTextColor = TextWhite,
                                focusedBorderColor = AccentTeal,
                                unfocusedBorderColor = SoftBorder
                            ),
                            singleLine = true,
                            trailingIcon = {
                                IconButton(onClick = {
                                    isEditingDosage = false
                                    emitUpdate()
                                }) {
                                    Icon(Icons.Default.Check, "Confirm", tint = MintGreen)
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                editedDosage.ifEmpty { "No dosage set" },
                                color = if (editedDosage.isEmpty()) TextMuted else AccentTeal,
                                fontWeight = FontWeight.Medium,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(
                                onClick = { isEditingDosage = true },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    Icons.Default.Edit,
                                    contentDescription = "Edit Dosage",
                                    tint = TextMuted,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }

                // Delete button
                IconButton(
                    onClick = { showDeleteDialog = true },
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(DangerRed.copy(alpha = 0.15f))
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Delete",
                        tint = DangerRed,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // Expand / Collapse toggle
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = SoftBorder)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { isExpanded = !isExpanded }
                    .padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    if (isExpanded) "Hide Details" else "Show Details",
                    color = TextMuted,
                    fontSize = 12.sp
                )
                Icon(
                    if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                    tint = TextMuted,
                    modifier = Modifier.size(18.dp)
                )
            }

            // ===== Expandable body =====
            AnimatedVisibility(visible = isExpanded) {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {

                    // --- 1. Frequency Selection ---
                    SectionHeader("Frequency")
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        frequencyOptions.forEach { option ->
                            FilterChip(
                                selected = selectedFrequency == option,
                                onClick = {
                                    selectedFrequency = option
                                    emitUpdate()
                                },
                                label = { Text(option, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AccentTeal.copy(alpha = 0.2f),
                                    selectedLabelColor = AccentTeal,
                                    containerColor = DeepCharcoal,
                                    labelColor = TextMuted
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = selectedFrequency == option,
                                    borderColor = SoftBorder,
                                    selectedBorderColor = AccentTeal
                                )
                            )
                        }
                    }

                    // --- Conditional: Weekly Day Picker ---
                    if (selectedFrequency == "Weekly") {
                        SectionHeader("Select Day of Week")
                        val days = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            days.forEachIndexed { idx, day ->
                                val dayNum = idx + 1
                                FilterChip(
                                    selected = weeklyDay == dayNum,
                                    onClick = {
                                        weeklyDay = dayNum
                                        emitUpdate()
                                    },
                                    label = { Text(day, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MintGreen.copy(alpha = 0.2f),
                                        selectedLabelColor = MintGreen,
                                        containerColor = DeepCharcoal,
                                        labelColor = TextMuted
                                    ),
                                    border = FilterChipDefaults.filterChipBorder(
                                        enabled = true,
                                        selected = weeklyDay == dayNum,
                                        borderColor = SoftBorder,
                                        selectedBorderColor = MintGreen
                                    )
                                )
                            }
                        }
                    }

                    // --- Conditional: Monthly Date Picker ---
                    if (selectedFrequency == "Monthly") {
                        SectionHeader("Select Date of Month")
                        OutlinedTextField(
                            value = monthlyDateText,
                            onValueChange = { input ->
                                monthlyDateText = input
                                val parsed = input.toIntOrNull()
                                if (parsed != null && parsed in 1..31) {
                                    monthlyDate = parsed
                                    emitUpdate()
                                }
                            },
                            label = { Text("Day (1-31)", color = TextMuted) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextWhite,
                                unfocusedTextColor = TextWhite,
                                focusedBorderColor = MintGreen,
                                unfocusedBorderColor = SoftBorder
                            ),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(0.4f)
                        )
                        if (monthlyDate > 0) {
                            Text(
                                "Take on ${ordinal(monthlyDate)} of every month",
                                color = MintGreen,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // --- Conditional: Custom Interval ---
                    if (selectedFrequency == "Every X Days") {
                        SectionHeader("Repeat Interval")
                        OutlinedTextField(
                            value = customIntervalText,
                            onValueChange = { input ->
                                customIntervalText = input
                                val parsed = input.toIntOrNull()
                                if (parsed != null && parsed > 0) {
                                    customIntervalDays = parsed
                                    emitUpdate()
                                }
                            },
                            label = { Text("Every __ days", color = TextMuted) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextWhite,
                                unfocusedTextColor = TextWhite,
                                focusedBorderColor = AccentTeal,
                                unfocusedBorderColor = SoftBorder
                            ),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(0.4f)
                        )
                        if (customIntervalDays > 0) {
                            Text(
                                "Every $customIntervalDays day${if (customIntervalDays > 1) "s" else ""}",
                                color = AccentTeal,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // --- Conditional: X Times/Week Multi-Day Picker ---
                    if (selectedFrequency == "X Times/Week") {
                        SectionHeader("Select Days of Week")
                        val days = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            days.forEachIndexed { idx, day ->
                                val dayNum = idx + 1
                                val isSelected = weeklyDaysSet.contains(dayNum)
                                FilterChip(
                                    selected = isSelected,
                                    onClick = {
                                        weeklyDaysSet = if (isSelected) {
                                            weeklyDaysSet - dayNum
                                        } else {
                                            weeklyDaysSet + dayNum
                                        }
                                        emitUpdate()
                                    },
                                    label = { Text(day, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Color(0xFF7C4DFF).copy(alpha = 0.25f),
                                        selectedLabelColor = Color(0xFFB388FF),
                                        containerColor = DeepCharcoal,
                                        labelColor = TextMuted
                                    ),
                                    border = FilterChipDefaults.filterChipBorder(
                                        enabled = true,
                                        selected = isSelected,
                                        borderColor = SoftBorder,
                                        selectedBorderColor = Color(0xFFB388FF)
                                    )
                                )
                            }
                        }
                        if (weeklyDaysSet.isNotEmpty()) {
                            val dayNames = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
                            val selectedNames = weeklyDaysSet.sorted().map { dayNames[it - 1] }
                            Text(
                                "${weeklyDaysSet.size}x per week: ${selectedNames.joinToString(", ")}",
                                color = Color(0xFFB388FF),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // --- Conditional: Custom Dates Picker ---
                    if (selectedFrequency == "Custom Dates") {
                        SectionHeader("Select Dates")
                        OutlinedButton(
                            onClick = { showCustomDatePicker = true },
                            border = BorderStroke(1.dp, AccentTeal),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Icon(
                                Icons.Default.CalendarMonth,
                                contentDescription = "Add date",
                                tint = AccentTeal,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("Add Date", color = AccentTeal, fontSize = 13.sp)
                        }

                        if (customDatesSet.isNotEmpty()) {
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                customDatesSet.sorted().forEach { dateMs ->
                                    InputChip(
                                        selected = true,
                                        onClick = {
                                            customDatesSet = customDatesSet - dateMs
                                            emitUpdate()
                                        },
                                        label = {
                                            Text(
                                                dateFormatter.format(Date(dateMs)),
                                                fontSize = 11.sp
                                            )
                                        },
                                        trailingIcon = {
                                            Icon(
                                                Icons.Default.Close,
                                                contentDescription = "Remove",
                                                modifier = Modifier.size(14.dp),
                                                tint = DangerRed
                                            )
                                        },
                                        colors = InputChipDefaults.inputChipColors(
                                            selectedContainerColor = AccentTeal.copy(alpha = 0.15f),
                                            selectedLabelColor = AccentTeal
                                        ),
                                        border = InputChipDefaults.inputChipBorder(
                                            enabled = true,
                                            selected = true,
                                            borderColor = SoftBorder,
                                            selectedBorderColor = AccentTeal
                                        )
                                    )
                                }
                            }
                            Text(
                                "${customDatesSet.size} date${if (customDatesSet.size > 1) "s" else ""} selected",
                                color = AccentTeal,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // --- 2. Start Date ---
                    SectionHeader("Start Date")
                    DateChipButton(
                        label = dateFormatter.format(Date(startDateMs)),
                        onClick = { showStartDatePicker = true }
                    )

                    // --- 3. End Date ---
                    SectionHeader("End Date")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (!continueUntilStopped) {
                            DateChipButton(
                                label = if (endDateMs != null) dateFormatter.format(Date(endDateMs!!)) else "Select End Date",
                                onClick = { showEndDatePicker = true }
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Until Stopped", color = TextMuted, fontSize = 12.sp)
                            Spacer(modifier = Modifier.width(4.dp))
                            Switch(
                                checked = continueUntilStopped,
                                onCheckedChange = {
                                    continueUntilStopped = it
                                    if (it) endDateMs = null
                                    emitUpdate()
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = MintGreen,
                                    checkedTrackColor = MintGreen.copy(alpha = 0.3f)
                                )
                            )
                        }
                    }

                    // --- 4. Meal Timing ---
                    SectionHeader("Meal Timing")
                    val mealOptions = listOf(
                        "Before Food" to beforeFood,
                        "After Food" to afterFood,
                        "With Food" to withFood,
                        "Empty Stomach" to emptyStomach
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        mealOptions.forEach { (label, isSelected) ->
                            FilterChip(
                                selected = isSelected,
                                onClick = {
                                    when (label) {
                                        "Before Food" -> beforeFood = !beforeFood
                                        "After Food" -> afterFood = !afterFood
                                        "With Food" -> withFood = !withFood
                                        "Empty Stomach" -> emptyStomach = !emptyStomach
                                    }
                                    emitUpdate()
                                },
                                label = { Text(label, fontSize = 12.sp) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = WarningAmber.copy(alpha = 0.2f),
                                    selectedLabelColor = WarningAmber,
                                    containerColor = DeepCharcoal,
                                    labelColor = TextMuted
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = isSelected,
                                    borderColor = SoftBorder,
                                    selectedBorderColor = WarningAmber
                                )
                            )
                        }
                    }

                    // --- 5. Dose Time Slots ---
                    SectionHeader("Dose Time Slots")
                    val timeSlots = listOf(
                        Triple("☀️ Morning", isMorning, morningTime),
                        Triple("🌤️ Afternoon", isAfternoon, afternoonTime),
                        Triple("🌙 Evening", isEvening, eveningTime),
                        Triple("🌃 Night", isNight, nightTime)
                    )

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        timeSlots.forEach { (label, isSelected, time) ->
                            val slotKey = label.substringAfter(" ").trim()
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(
                                        if (isSelected) AccentTeal.copy(alpha = 0.08f) else Color.Transparent
                                    )
                                    .border(
                                        1.dp,
                                        if (isSelected) AccentTeal.copy(alpha = 0.3f) else SoftBorder.copy(alpha = 0.3f),
                                        RoundedCornerShape(10.dp)
                                    )
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(
                                        checked = isSelected,
                                        onCheckedChange = { checked ->
                                            when (slotKey) {
                                                "Morning" -> isMorning = checked
                                                "Afternoon" -> isAfternoon = checked
                                                "Evening" -> isEvening = checked
                                                "Night" -> isNight = checked
                                            }
                                            emitUpdate()
                                        },
                                        colors = CheckboxDefaults.colors(
                                            checkedColor = AccentTeal,
                                            uncheckedColor = SoftBorder
                                        )
                                    )
                                    Text(label, color = TextWhite, fontSize = 13.sp)
                                }

                                if (isSelected) {
                                    TextButton(onClick = { showTimePicker = slotKey }) {
                                        Text(
                                            formatTimeDisplay(time),
                                            color = AccentTeal,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Icon(
                                            Icons.Default.Schedule,
                                            contentDescription = "Pick Time",
                                            tint = AccentTeal,
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // --- 6. Notes ---
                    SectionHeader("Notes")
                    OutlinedTextField(
                        value = editedNotes,
                        onValueChange = {
                            editedNotes = it
                            emitUpdate()
                        },
                        placeholder = { Text("e.g. Take with warm water, avoid alcohol...", color = TextMuted.copy(alpha = 0.5f)) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextWhite,
                            unfocusedTextColor = TextWhite,
                            focusedBorderColor = AccentTeal,
                            unfocusedBorderColor = SoftBorder
                        ),
                        minLines = 2,
                        maxLines = 4,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }

    // Delete confirmation dialog
    if (showDeleteDialog) {
        RemoveMedicineDialog(
            onConfirm = {
                showDeleteDialog = false
                onDelete()
            },
            onDismiss = { showDeleteDialog = false }
        )
    }

    // Start Date Picker
    if (showStartDatePicker) {
        val datePickerState = rememberDatePickerState(initialSelectedDateMillis = startDateMs)
        DatePickerDialog(
            onDismissRequest = { showStartDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let {
                        startDateMs = it
                        emitUpdate()
                    }
                    showStartDatePicker = false
                }) { Text("OK", color = AccentTeal) }
            },
            dismissButton = {
                TextButton(onClick = { showStartDatePicker = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            colors = DatePickerDefaults.colors(containerColor = DeepCharcoal)
        ) {
            DatePicker(
                state = datePickerState,
                colors = DatePickerDefaults.colors(
                    containerColor = DeepCharcoal,
                    titleContentColor = TextWhite,
                    headlineContentColor = TextWhite,
                    weekdayContentColor = TextMuted,
                    yearContentColor = TextWhite,
                    currentYearContentColor = AccentTeal,
                    selectedYearContainerColor = AccentTeal,
                    dayContentColor = TextWhite,
                    selectedDayContainerColor = AccentTeal,
                    todayContentColor = AccentTeal,
                    todayDateBorderColor = AccentTeal
                )
            )
        }
    }

    // End Date Picker
    if (showEndDatePicker) {
        val datePickerState = rememberDatePickerState(initialSelectedDateMillis = endDateMs ?: System.currentTimeMillis())
        DatePickerDialog(
            onDismissRequest = { showEndDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let {
                        endDateMs = it
                        continueUntilStopped = false
                        emitUpdate()
                    }
                    showEndDatePicker = false
                }) { Text("OK", color = AccentTeal) }
            },
            dismissButton = {
                TextButton(onClick = { showEndDatePicker = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            colors = DatePickerDefaults.colors(containerColor = DeepCharcoal)
        ) {
            DatePicker(
                state = datePickerState,
                colors = DatePickerDefaults.colors(
                    containerColor = DeepCharcoal,
                    titleContentColor = TextWhite,
                    headlineContentColor = TextWhite,
                    weekdayContentColor = TextMuted,
                    yearContentColor = TextWhite,
                    currentYearContentColor = AccentTeal,
                    selectedYearContainerColor = AccentTeal,
                    dayContentColor = TextWhite,
                    selectedDayContainerColor = AccentTeal,
                    todayContentColor = AccentTeal,
                    todayDateBorderColor = AccentTeal
                )
            )
        }
    }

    // Custom Dates Picker
    if (showCustomDatePicker) {
        val datePickerState = rememberDatePickerState(initialSelectedDateMillis = System.currentTimeMillis())
        DatePickerDialog(
            onDismissRequest = { showCustomDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { selectedMs ->
                        customDatesSet = customDatesSet + selectedMs
                        emitUpdate()
                    }
                    showCustomDatePicker = false
                }) { Text("Add", color = AccentTeal) }
            },
            dismissButton = {
                TextButton(onClick = { showCustomDatePicker = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            colors = DatePickerDefaults.colors(containerColor = DeepCharcoal)
        ) {
            DatePicker(
                state = datePickerState,
                colors = DatePickerDefaults.colors(
                    containerColor = DeepCharcoal,
                    titleContentColor = TextWhite,
                    headlineContentColor = TextWhite,
                    weekdayContentColor = TextMuted,
                    yearContentColor = TextWhite,
                    currentYearContentColor = AccentTeal,
                    selectedYearContainerColor = AccentTeal,
                    dayContentColor = TextWhite,
                    selectedDayContainerColor = AccentTeal,
                    todayContentColor = AccentTeal,
                    todayDateBorderColor = AccentTeal
                )
            )
        }
    }

    // Time Picker Dialog
    showTimePicker?.let { slot ->
        val currentTime = when (slot) {
            "Morning" -> morningTime
            "Afternoon" -> afternoonTime
            "Evening" -> eveningTime
            "Night" -> nightTime
            else -> "08:00"
        }
        val parts = currentTime.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: 8
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
        val timePickerState = rememberTimePickerState(initialHour = hour, initialMinute = minute)

        AlertDialog(
            onDismissRequest = { showTimePicker = null },
            title = { Text("Set $slot Time", color = TextWhite) },
            text = {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    TimePicker(
                        state = timePickerState,
                        colors = TimePickerDefaults.colors(
                            clockDialColor = DeepCharcoal,
                            selectorColor = AccentTeal,
                            containerColor = CardSlate,
                            periodSelectorSelectedContainerColor = AccentTeal.copy(alpha = 0.2f),
                            timeSelectorSelectedContainerColor = AccentTeal.copy(alpha = 0.2f),
                            timeSelectorUnselectedContainerColor = DeepCharcoal
                        )
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val newTime = String.format("%02d:%02d", timePickerState.hour, timePickerState.minute)
                    when (slot) {
                        "Morning" -> morningTime = newTime
                        "Afternoon" -> afternoonTime = newTime
                        "Evening" -> eveningTime = newTime
                        "Night" -> nightTime = newTime
                    }
                    showTimePicker = null
                    emitUpdate()
                }) { Text("OK", color = AccentTeal) }
            },
            dismissButton = {
                TextButton(onClick = { showTimePicker = null }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            containerColor = CardSlate
        )
    }
}

// ======================== Remove Medicine Dialog ========================

@Composable
fun RemoveMedicineDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(DangerRed.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.DeleteForever,
                    contentDescription = null,
                    tint = DangerRed,
                    modifier = Modifier.size(28.dp)
                )
            }
        },
        title = {
            Text(
                "Remove Medicine?",
                color = TextWhite,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        },
        text = {
            Text(
                "Are you sure you want to remove this medicine? This action cannot be undone.",
                color = TextMuted,
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = DangerRed),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Remove", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            OutlinedButton(
                onClick = onDismiss,
                border = BorderStroke(1.dp, SoftBorder),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Cancel", color = TextMuted)
            }
        },
        containerColor = CardSlate,
        shape = RoundedCornerShape(20.dp)
    )
}

// ======================== Add Medicine Bottom Sheet ========================

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun AddMedicineBottomSheet(
    onDismiss: () -> Unit,
    onAdd: (Medicine) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var name by remember { mutableStateOf("") }
    var dosage by remember { mutableStateOf("") }
    var frequency by remember { mutableStateOf("Daily") }
    var notes by remember { mutableStateOf("") }

    var morning by remember { mutableStateOf(true) }
    var afternoon by remember { mutableStateOf(false) }
    var evening by remember { mutableStateOf(false) }
    var night by remember { mutableStateOf(false) }

    var beforeFood by remember { mutableStateOf(false) }
    var afterFood by remember { mutableStateOf(true) }
    var withFood by remember { mutableStateOf(false) }
    var emptyStomach by remember { mutableStateOf(false) }

    var startDateMs by remember { mutableStateOf(System.currentTimeMillis()) }
    var continueUntilStopped by remember { mutableStateOf(true) }

    val dateFormatter = remember { SimpleDateFormat("dd MMM yyyy", Locale.getDefault()) }
    var showStartDatePicker by remember { mutableStateOf(false) }

    val frequencyOptions = listOf("Daily", "Alternate Days", "Weekly", "Monthly", "Every X Days")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = DeepCharcoal,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        dragHandle = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 12.dp)
            ) {
                Box(
                    modifier = Modifier
                        .width(40.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(SoftBorder)
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Add New Medicine",
                    color = TextWhite,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Fill in the details below",
                    color = TextMuted,
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = SoftBorder)
            }
        }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Medicine Name
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Medicine Name *", color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Medication, null, tint = AccentTeal) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = AccentTeal,
                    unfocusedBorderColor = SoftBorder
                ),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Dosage
            OutlinedTextField(
                value = dosage,
                onValueChange = { dosage = it },
                label = { Text("Dosage (e.g. 500mg, 1 Tablet)", color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Scale, null, tint = AccentTeal) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = AccentTeal,
                    unfocusedBorderColor = SoftBorder
                ),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            // Frequency
            SectionHeader("Frequency")
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                frequencyOptions.forEach { option ->
                    FilterChip(
                        selected = frequency == option,
                        onClick = { frequency = option },
                        label = { Text(option, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AccentTeal.copy(alpha = 0.2f),
                            selectedLabelColor = AccentTeal,
                            containerColor = CardSlate,
                            labelColor = TextMuted
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = frequency == option,
                            borderColor = SoftBorder,
                            selectedBorderColor = AccentTeal
                        )
                    )
                }
            }

            // Start Date
            SectionHeader("Start Date")
            DateChipButton(
                label = dateFormatter.format(Date(startDateMs)),
                onClick = { showStartDatePicker = true }
            )

            // Continue until stopped
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Continue Until Stopped", color = TextMuted, fontSize = 13.sp)
                Switch(
                    checked = continueUntilStopped,
                    onCheckedChange = { continueUntilStopped = it },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = MintGreen,
                        checkedTrackColor = MintGreen.copy(alpha = 0.3f)
                    )
                )
            }

            // Meal Timing
            SectionHeader("Meal Timing")
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    "Before Food" to beforeFood,
                    "After Food" to afterFood,
                    "With Food" to withFood,
                    "Empty Stomach" to emptyStomach
                ).forEach { (label, sel) ->
                    FilterChip(
                        selected = sel,
                        onClick = {
                            when (label) {
                                "Before Food" -> beforeFood = !beforeFood
                                "After Food" -> afterFood = !afterFood
                                "With Food" -> withFood = !withFood
                                "Empty Stomach" -> emptyStomach = !emptyStomach
                            }
                        },
                        label = { Text(label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = WarningAmber.copy(alpha = 0.2f),
                            selectedLabelColor = WarningAmber,
                            containerColor = CardSlate,
                            labelColor = TextMuted
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = sel,
                            borderColor = SoftBorder,
                            selectedBorderColor = WarningAmber
                        )
                    )
                }
            }

            // Time Slots
            SectionHeader("Time Slots")
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf(
                    "☀️ Morning" to morning,
                    "🌤️ Afternoon" to afternoon,
                    "🌙 Evening" to evening,
                    "🌃 Night" to night
                ).forEach { (label, sel) ->
                    FilterChip(
                        selected = sel,
                        onClick = {
                            val slot = label.substringAfter(" ").trim()
                            when (slot) {
                                "Morning" -> morning = !morning
                                "Afternoon" -> afternoon = !afternoon
                                "Evening" -> evening = !evening
                                "Night" -> night = !night
                            }
                        },
                        label = { Text(label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = AccentTeal.copy(alpha = 0.2f),
                            selectedLabelColor = AccentTeal,
                            containerColor = CardSlate,
                            labelColor = TextMuted
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = sel,
                            borderColor = SoftBorder,
                            selectedBorderColor = AccentTeal
                        )
                    )
                }
            }

            // Notes
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes (optional)", color = TextMuted) },
                placeholder = { Text("e.g. Take with warm water", color = TextMuted.copy(alpha = 0.5f)) },
                leadingIcon = { Icon(Icons.Default.Notes, null, tint = AccentTeal) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextWhite,
                    unfocusedTextColor = TextWhite,
                    focusedBorderColor = AccentTeal,
                    unfocusedBorderColor = SoftBorder
                ),
                minLines = 2,
                maxLines = 3,
                modifier = Modifier.fillMaxWidth()
            )

            // Add Button
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        onAdd(
                            Medicine(
                                medicineName = name.trim(),
                                strength = dosage.trim(),
                                frequency = frequency,
                                durationDays = 30,
                                morning = morning,
                                afternoon = afternoon,
                                evening = evening,
                                night = night,
                                beforeFood = beforeFood,
                                afterFood = afterFood,
                                withFood = withFood,
                                emptyStomach = emptyStomach,
                                startDate = startDateMs,
                                continueUntilStopped = continueUntilStopped,
                                notes = notes.trim()
                            )
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MintGreen,
                    disabledContainerColor = MintGreen.copy(alpha = 0.3f)
                ),
                shape = RoundedCornerShape(12.dp),
                enabled = name.isNotBlank()
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = Color.Black)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Add Medicine",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
            }

            // Bottom padding for keyboard/nav
            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    // Start Date Picker for Add Sheet
    if (showStartDatePicker) {
        val datePickerState = rememberDatePickerState(initialSelectedDateMillis = startDateMs)
        DatePickerDialog(
            onDismissRequest = { showStartDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { startDateMs = it }
                    showStartDatePicker = false
                }) { Text("OK", color = AccentTeal) }
            },
            dismissButton = {
                TextButton(onClick = { showStartDatePicker = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            colors = DatePickerDefaults.colors(containerColor = DeepCharcoal)
        ) {
            DatePicker(
                state = datePickerState,
                colors = DatePickerDefaults.colors(
                    containerColor = DeepCharcoal,
                    titleContentColor = TextWhite,
                    headlineContentColor = TextWhite,
                    weekdayContentColor = TextMuted,
                    yearContentColor = TextWhite,
                    currentYearContentColor = AccentTeal,
                    selectedYearContainerColor = AccentTeal,
                    dayContentColor = TextWhite,
                    selectedDayContainerColor = AccentTeal,
                    todayContentColor = AccentTeal,
                    todayDateBorderColor = AccentTeal
                )
            )
        }
    }
}

// ======================== Helper Composables ========================

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        color = TextWhite,
        fontWeight = FontWeight.Bold,
        fontSize = 13.sp,
        letterSpacing = 0.5.sp
    )
}

@Composable
fun DateChipButton(label: String, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        border = BorderStroke(1.dp, SoftBorder),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = DeepCharcoal)
    ) {
        Icon(
            Icons.Default.CalendarToday,
            contentDescription = null,
            tint = AccentTeal,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(label, color = TextWhite, fontSize = 13.sp)
    }
}

// ======================== Utility Functions ========================

private fun formatTimeDisplay(time24: String): String {
    return try {
        val parts = time24.split(":")
        val hour = parts[0].toInt()
        val minute = parts[1].toInt()
        val amPm = if (hour < 12) "AM" else "PM"
        val hour12 = when {
            hour == 0 -> 12
            hour > 12 -> hour - 12
            else -> hour
        }
        String.format("%02d:%02d %s", hour12, minute, amPm)
    } catch (e: Exception) {
        time24
    }
}

private fun ordinal(n: Int): String {
    val suffix = when {
        n % 100 in 11..13 -> "th"
        n % 10 == 1 -> "st"
        n % 10 == 2 -> "nd"
        n % 10 == 3 -> "rd"
        else -> "th"
    }
    return "$n$suffix"
}
