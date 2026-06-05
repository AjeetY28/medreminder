package com.example.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Update
import com.example.data.model.FamilyMember
import com.example.data.model.Medicine
import com.example.data.model.ReminderItem
import kotlinx.coroutines.flow.Flow

@Dao
interface MedicineDao {
    @Query("SELECT * FROM medicines ORDER BY dateAdded DESC")
    fun getAllMedicines(): Flow<List<Medicine>>

    @Query("SELECT * FROM medicines WHERE id = :id")
    suspend fun getMedicineById(id: Int): Medicine?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMedicine(medicine: Medicine): Long

    @Update
    suspend fun updateMedicine(medicine: Medicine)

    @Query("DELETE FROM medicines WHERE id = :id")
    suspend fun deleteMedicineById(id: Int)

    @Query("DELETE FROM medicines")
    suspend fun clearAllMedicines()
}

@Dao
interface ReminderDao {
    @Query("SELECT * FROM reminders ORDER BY scheduledTimeMs ASC")
    fun getAllReminders(): Flow<List<ReminderItem>>

    @Query("SELECT * FROM reminders WHERE dateDayString = :day ORDER BY scheduledTimeMs ASC")
    fun getRemindersForDay(day: String): Flow<List<ReminderItem>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReminder(reminder: ReminderItem)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAllReminders(reminders: List<ReminderItem>)

    @Query("UPDATE reminders SET status = :status, actionTimeMs = :actionTimeMs WHERE id = :id")
    suspend fun updateReminderStatus(id: Int, status: String, actionTimeMs: Long)

    @Query("DELETE FROM reminders WHERE medicineId = :medicineId")
    suspend fun deleteRemindersForMedicine(medicineId: Int)

    @Query("DELETE FROM reminders")
    suspend fun clearAllReminders()
}

@Dao
interface FamilyMemberDao {
    @Query("SELECT * FROM family_members ORDER BY id DESC")
    fun getAllFamilyMembers(): Flow<List<FamilyMember>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertFamilyMember(member: FamilyMember): Long

    @Query("DELETE FROM family_members WHERE id = :id")
    suspend fun deleteFamilyMemberById(id: Int)
}

@Database(entities = [Medicine::class, ReminderItem::class, FamilyMember::class], version = 3, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun medicineDao(): MedicineDao
    abstract fun reminderDao(): ReminderDao
    abstract fun familyMemberDao(): FamilyMemberDao
}
