package com.example.data.ai

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import com.example.BuildConfig
import com.example.data.model.ExtractedMedicine
import com.example.data.model.PrescriptionExtractionResponse
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit

object GeminiService {
    private const val TAG = "GeminiService"
    private const val BASE_API = "https://generativelanguage.googleapis.com/v1beta/models"
    // Model fallback chain: primary → progressively simpler models
    private val MODEL_CHAIN = listOf("gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite")

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val adapter = moshi.adapter(PrescriptionExtractionResponse::class.java)

    /**
     * Converts a Bitmap image into Base64 format for inline API transmission.
     */
    private fun Bitmap.toBase64(): String {
        val outputStream = ByteArrayOutputStream()
        this.compress(Bitmap.CompressFormat.JPEG, 95, outputStream)
        return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
    }

    /**
     * Extracts medicines from prescription image using Gemini OCR capabilities.
     *
     * HEALTHCARE SAFETY: This function NEVER returns fake/hardcoded medicines.
     * If extraction fails for any reason, it returns an explicit failure response
     * with zero medicines. The UI must handle this gracefully.
     */
    suspend fun extractPrescription(bitmap: Bitmap): PrescriptionExtractionResponse = withContext(Dispatchers.IO) {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            Log.e(TAG, "CRITICAL: Gemini API key is not configured. Cannot extract prescription.")
            return@withContext PrescriptionExtractionResponse(
                success = false,
                medicines = emptyList(),
                interactionWarning = null,
                duplicateMedicinesDetected = emptyList(),
                errorMessage = "Gemini API key is not configured. Please set up your API key."
            )
        }

        val base64Image = bitmap.toBase64()
        Log.d(TAG, "Image encoded to Base64. Size: ${base64Image.length} chars")

        val prompt = """
            You are a Medical Prescription OCR Engine.

            GOAL:
            Extract EVERY medicine from the prescription image. Missing a medicine is a critical failure.

            PASS 1 — INITIAL EXTRACTION

            Scan the entire prescription image carefully:
            - Main prescription body
            - Numbered medicine lists
            - Non-numbered medicines
            - Left margin
            - Right margin
            - Top notes
            - Bottom notes
            - Circled text
            - Handwritten additions

            Create a complete medicine list.

            PASS 2 — VERIFICATION SCAN

            Perform a second independent scan of the entire image.
            Compare the second scan against the first scan.

            Check specifically for:
            - Missed numbered medicines
            - Medicines written at the bottom
            - Medicines written in margins
            - Consecutive medicines that may have been merged
            - Partially readable medicine names
            - Handwritten additions

            If a medicine appears in the second scan but not the first, add it.

            EXTRACTION RULES:
            - Every numbered medicine is a separate entry.
            - Never merge medicines.
            - Never skip partially readable medicines.
            - Use best reading if handwriting is unclear.
            - Preserve original medicine spelling whenever possible.
            - Extract strength separately (5mg, 10mg, 500mg, etc.).
            - Extract dosage pattern separately (1-0-1, 0-1-0, 1-1-1, etc.).
            - Extract frequency separately when available.
            - Decode shorthand: Tab=Tablet, Cap=Capsule, Cr=Cream, Oint=Ointment, Sol=Solution, Syp=Syrup, Inj=Injection
            - Decode frequency: OD=Once daily, BD=Twice daily, TDS=Thrice daily, SOS=As needed, HS=Bedtime
            - Decode timing: 1-0-1=Morning+Night, 1-1-1=Morning+Afternoon+Night, Alt day=Alternate days
            - Convert duration: 1 week=7, 1 month=30, 3 months=90. Use 0 if not stated.
            - Never invent medicines not present in the image.

            CONFIDENCE SCALE:
            1.0 = very clear, 0.8 = readable, 0.6 = partially readable, 0.4 = difficult to read, 0.2 = highly uncertain

            OUTPUT FORMAT — Return ONLY this JSON (no markdown):
            {
              "success": true,
              "totalMedicinesFound": 0,
              "medicines": [
                {
                  "name": "string",
                  "dosage": "string",
                  "frequency": "string",
                  "durationDays": 0,
                  "morning": false,
                  "afternoon": false,
                  "evening": false,
                  "night": false,
                  "beforeFood": false,
                  "afterFood": false,
                  "instructions": "string"
                }
              ],
              "interactionWarning": null,
              "duplicateMedicinesDetected": []
            }

            FINAL VALIDATION:
            1. Count all extracted medicines.
            2. Set totalMedicinesFound equal to the final count.
            3. Verify medicines.length equals totalMedicinesFound.
            4. Recheck all numbered items.
            5. Recheck margins and bottom notes.

            Return ONLY valid JSON.
        """.trimIndent()

        val requestBodyJson = JSONObject().apply {
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply {
                            put("text", prompt)
                        })
                        put(JSONObject().apply {
                            put("inlineData", JSONObject().apply {
                                put("mimeType", "image/jpeg")
                                put("data", base64Image)
                            })
                        })
                    })
                })
            })
            // Request structured JSON response
            put("generationConfig", JSONObject().apply {
                put("responseMimeType", "application/json")
                put("temperature", 0.1) // Low temperature for strict factual extraction
                put("maxOutputTokens", 8192) // Ensure full response for prescriptions with many medicines
            })
        }

        var lastError: Exception? = null
        for (modelName in MODEL_CHAIN) {
            try {
                Log.d(TAG, "Sending request to Gemini API with model $modelName...")
                val requestUrl = "$BASE_API/$modelName:generateContent?key=$apiKey"

                val request = Request.Builder()
                    .url(requestUrl)
                    .post(requestBodyJson.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        val errorBody = response.body?.string() ?: "No error body"
                        Log.e(TAG, "Gemini API HTTP error with model $modelName: ${response.code} ${response.message}. Body: $errorBody")
                        throw Exception("HTTP ${response.code}: $errorBody")
                    }

                    val responseBody = response.body?.string() ?: ""
                    Log.d(TAG, "GEMINI RAW RESPONSE ($modelName): $responseBody")

                    if (responseBody.isBlank()) {
                        throw Exception("Empty response body")
                    }

                    val jsonResponse = JSONObject(responseBody)
                    val textResponse = jsonResponse
                        .getJSONArray("candidates")
                        .getJSONObject(0)
                        .getJSONObject("content")
                        .getJSONArray("parts")
                        .getJSONObject(0)
                        .getString("text")

                    Log.d(TAG, "GEMINI EXTRACTED TEXT ($modelName): $textResponse")

                    val parsed = adapter.fromJson(textResponse)
                    if (parsed == null) {
                        throw Exception("Moshi failed to parse Gemini response into PrescriptionExtractionResponse")
                    }

                    // Log parsed medicines for debugging
                    Log.d(TAG, "PARSED MEDICINES COUNT: ${parsed.medicines.size}")
                    parsed.medicines.forEachIndexed { index, med ->
                        Log.d(TAG, "  MEDICINE[$index]: name=${med.medicineName}, dosage=${med.strength}, freq=${med.frequency}")
                    }

                    return@withContext parsed
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error during extraction with model $modelName: ${e.message}", e)
                lastError = e
            }
        }

        // ─── Gemini chain exhausted → Fallback to OpenAI (ChatGPT GPT-4o) ───
        Log.w(TAG, "All Gemini models failed. Attempting OpenAI GPT-4o fallback...")
        val openaiResult = tryOpenAIExtraction(base64Image, prompt)
        if (openaiResult != null) {
            return@withContext openaiResult
        }

        return@withContext PrescriptionExtractionResponse(
            success = false,
            medicines = emptyList(),
            interactionWarning = null,
            duplicateMedicinesDetected = emptyList(),
            errorMessage = "Extraction failed on all providers (Gemini + OpenAI). Last error: ${lastError?.localizedMessage ?: "Unknown error"}"
        )
    }

    /**
     * OpenAI GPT-4o fallback for prescription extraction.
     * Uses the same prompt, sends image as base64 data URL.
     * Returns null if OpenAI key is missing or call fails.
     */
    private fun tryOpenAIExtraction(base64Image: String, prompt: String): PrescriptionExtractionResponse? {
        val openaiKey = try { BuildConfig.OPENAI_API_KEY } catch (_: Exception) { "" }
        if (openaiKey.isEmpty() || openaiKey == "your_openai_api_key_here") {
            Log.w(TAG, "OpenAI API key not configured. Skipping ChatGPT fallback.")
            return null
        }

        try {
            Log.d(TAG, "Sending request to OpenAI GPT-4o...")

            val requestBody = JSONObject().apply {
                put("model", "gpt-4o")
                put("temperature", 0.1)
                put("max_tokens", 4096)
                put("response_format", JSONObject().put("type", "json_object"))
                put("messages", JSONArray().apply {
                    put(JSONObject().apply {
                        put("role", "user")
                        put("content", JSONArray().apply {
                            put(JSONObject().apply {
                                put("type", "text")
                                put("text", prompt)
                            })
                            put(JSONObject().apply {
                                put("type", "image_url")
                                put("image_url", JSONObject().apply {
                                    put("url", "data:image/jpeg;base64,$base64Image")
                                    put("detail", "high")
                                })
                            })
                        })
                    })
                })
            }

            val request = Request.Builder()
                .url("https://api.openai.com/v1/chat/completions")
                .addHeader("Authorization", "Bearer $openaiKey")
                .addHeader("Content-Type", "application/json")
                .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    val errorBody = response.body?.string() ?: "No error body"
                    Log.e(TAG, "OpenAI API error: HTTP ${response.code}. Body: $errorBody")
                    return null
                }

                val responseBody = response.body?.string() ?: ""
                Log.d(TAG, "OPENAI RAW RESPONSE: $responseBody")

                val jsonResponse = JSONObject(responseBody)
                val textResponse = jsonResponse
                    .getJSONArray("choices")
                    .getJSONObject(0)
                    .getJSONObject("message")
                    .getString("content")

                Log.d(TAG, "OPENAI EXTRACTED TEXT: $textResponse")

                val parsed = adapter.fromJson(textResponse)
                if (parsed == null) {
                    Log.e(TAG, "Moshi failed to parse OpenAI response")
                    return null
                }

                Log.d(TAG, "[OpenAI/GPT-4o] PARSED MEDICINES COUNT: ${parsed.medicines.size}")
                parsed.medicines.forEachIndexed { index, med ->
                    Log.d(TAG, "  MEDICINE[$index]: name=${med.medicineName}, dosage=${med.strength}, freq=${med.frequency}")
                }

                return parsed
            }
        } catch (e: Exception) {
            Log.e(TAG, "OpenAI fallback failed: ${e.message}", e)
            return null
        }
    }

    /**
     * Performs a safety interaction check on a list of current medicines + a new medicine.
     */
    suspend fun checkDrugInteractions(
        existingMedicines: List<String>,
        newMedicine: String
    ): Triple<List<String>, String?, String?> = withContext(Dispatchers.IO) {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            // No API key — use local safety checks only
            return@withContext simulateInteractions(existingMedicines, newMedicine)
        }

        val prompt = """
            Analyze the medicine list.
            Existing Medicines: ${existingMedicines.joinToString()}
            New Medicine to add: $newMedicine
            
            Detect:
            1. Duplicate drug classes or same duplicate chemical names (e.g. overlapping brand names or identical drug family).
            2. High-risk scientific drug-to-drug interactions (e.g., Warfarin + Aspirin increases bleeding risk, Sildenafil + Nitroglycerin causes severe hypotension, or Acetaminophen + Panadol overlaps same substance).
            3. Smart suggestions for the reminder schedules.
            
            Return a JSON object in this format:
            {
              "duplicates": ["Duplicated drug name"],
              "interactions": "Explanation of drug conflicts",
              "suggestions": "Recommended clinical taking guidelines"
            }
            Respond with raw JSON only. Do not enclose in markdown codeblocks.
        """.trimIndent()

        val requestBodyJson = JSONObject().apply {
            put("contents", JSONArray().apply {
                put(JSONObject().apply {
                    put("parts", JSONArray().apply {
                        put(JSONObject().apply { put("text", prompt) })
                    })
                })
            })
            put("generationConfig", JSONObject().apply {
                put("responseMimeType", "application/json")
            })
        }

        var lastError: Exception? = null
        for (modelName in MODEL_CHAIN) {
            try {
                val requestUrl = "$BASE_API/$modelName:generateContent?key=$apiKey"
                val request = Request.Builder()
                    .url(requestUrl)
                    .post(requestBodyJson.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        val errorBody = response.body?.string() ?: "No error body"
                        throw Exception("HTTP ${response.code}: $errorBody")
                    }
                    val body = response.body?.string() ?: ""
                    val textResponse = JSONObject(body)
                        .getJSONArray("candidates")
                        .getJSONObject(0)
                        .getJSONObject("content")
                        .getJSONArray("parts")
                        .getJSONObject(0)
                        .getString("text")

                    val resJson = JSONObject(textResponse)
                    val duplicates = mutableListOf<String>()
                    val dupsArray = resJson.getJSONArray("duplicates")
                    for (i in 0 until dupsArray.length()) {
                        duplicates.add(dupsArray.getString(i))
                    }
                    val interactions = resJson.optString("interactions", null)
                    val suggestions = resJson.optString("suggestions", null)
                    
                    return@withContext Triple(duplicates, interactions, suggestions)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in checkDrugInteractions with model $modelName: ${e.message}", e)
                lastError = e
            }
        }

        return@withContext simulateInteractions(existingMedicines, newMedicine)
    }

    private fun simulateInteractions(
        existingMedicines: List<String>,
        newMedicine: String
    ): Triple<List<String>, String?, String?> {
        val duplicates = mutableListOf<String>()
        var interaction: String? = null
        var suggestion: String? = "Schedule this medicine spaced 2 hours apart from other medications to ensure maximum absorption."

        val currentLower = (existingMedicines + newMedicine).map { it.lowercase().trim() }
        
        // 1. Same drug detection
        if (existingMedicines.any { it.equals(newMedicine, ignoreCase = true) }) {
            duplicates.add(newMedicine)
            interaction = "Duplicate Drug Detected! '$newMedicine' is already entered in your active medication cabinet."
            suggestion = "You already have the medicine registered. Update the frequency on your active reminder instead of duplication."
            return Triple(duplicates, interaction, suggestion)
        }

        // 2. Dangerous interaction pairings: Aspirin + Warfarin
        if (currentLower.any { it.contains("aspirin") } && currentLower.any { it.contains("warfarin") }) {
            interaction = "CRITICAL WARNING: Synergistic interaction between Aspirin and Warfarin! Taking these concurrently elevates the risk of severe internal bleeding."
            suggestion = "Request your healthcare practitioner if a lower dose is required or use acetaminophen (Tylenol) for simple pain instead."
        }
        
        // 3. Ibuprofen + Aspirin
        else if (currentLower.any { it.contains("ibuprofen") } && currentLower.any { it.contains("aspirin") }) {
            interaction = "WARNING: Concomitant NSAID usage detected (Ibuprofen + Aspirin). May induce gastric mucosal damage or stomach pain."
            suggestion = "Take after a heavy meal. Space doses at least 4 hours apart."
        }

        // 4. Duplicate classes
        else if (currentLower.any { it.contains("advil") } && currentLower.any { it.contains("ibuprofen") }) {
            duplicates.add("Advil")
            interaction = "Overdose Risk! Advil is a brand name for Ibuprofen. Do not take them simultaneously."
            suggestion = "Discontinue one as they represent identical active compounds."
        }

        return Triple(duplicates, interaction, suggestion)
    }
}
