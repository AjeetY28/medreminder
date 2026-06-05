package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.ui.Modifier
import androidx.room.Room
import com.example.data.local.AppDatabase
import com.example.data.repository.MedicineRepository
import com.example.ui.screens.MediReminderAppLayout
import com.example.ui.viewmodel.MediReminderViewModel

class MainActivity : ComponentActivity() {

    private lateinit var database: AppDatabase
    private lateinit var repository: MedicineRepository
    private lateinit var viewModel: MediReminderViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Edge-to-Edge full content rendering
        enableEdgeToEdge()

        // Room Database Setup
        database = Room.databaseBuilder(
            applicationContext,
            AppDatabase::class.java,
            "medireminder_database"
        ).fallbackToDestructiveMigration().build()

        // Repository & ViewModel instantiation
        repository = MedicineRepository(
            medicineDao = database.medicineDao(),
            reminderDao = database.reminderDao(),
            familyMemberDao = database.familyMemberDao()
        )
        
        viewModel = MediReminderViewModel(repository)

        setContent {
            Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                MediReminderAppLayout(
                    viewModel = viewModel,
                    modifier = Modifier.padding(innerPadding)
                )
            }
        }
    }
}
