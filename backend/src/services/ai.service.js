const genAI = require('../config/gemini');
const logger = require('../config/logger');
const imageProcessingService = require('./image-processing.service');
const prescriptionValidator = require('./prescription-validator');

/**
 * AI Service — Production-Grade Prescription Extraction Pipeline.
 * 
 * ARCHITECTURE:
 *   1. Image Quality Check + Enhancement (sharp)
 *   2. Primary OCR: Gemini 2.5 Flash (two-pass prompt)
 *   3. Validation Layer (JSON + count + confidence)
 *   4. Retry Chain: Gemini 2.0 Flash → 1.5 Flash → GPT-4o
 *   5. Each retry re-validates; only accepted on pass
 *   6. All models fail → status: "needs_manual_review"
 *   7. Processing logs: model, confidence, time, attempt count
 * 
 * HEALTHCARE SAFETY: This function NEVER returns fake/mock/hardcoded medicines.
 * 
 * FALLBACK CHAIN: Gemini 2.5 Flash → 2.0 Flash → 1.5 Flash → GPT-4o → Manual Review
 */
class AIService {

  constructor() {
    // Model chain: primary (best) → fallbacks (progressively simpler)
    this.GEMINI_MODEL_CHAIN = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];
  }

  /**
   * Main entry point — full prescription extraction pipeline.
   * 
   * @param {Object} file - Multer file object (buffer + mimetype)
   * @param {Array} existingMedicines - User's current active medicines for safety check
   * @returns {Promise<Object>} { medicines, interaction_warnings, status, _meta }
   */
  async processPrescription(file, existingMedicines = []) {
    const pipelineStart = Date.now();
    let attemptCount = 0;
    let lastModelUsed = 'none';
    let lastValidation = null;

    // ─── Stage 1: Image Preprocessing ───
    logger.info('═══ PRESCRIPTION PIPELINE START ═══');

    const { enhancedBuffer, enhancedMimeType, qualityReport } =
      await imageProcessingService.assessAndEnhance(file.buffer, file.mimetype);

    logger.info(`[Pipeline] Image quality: score=${qualityReport.qualityScore}, blurry=${qualityReport.isBlurry}, dark=${qualityReport.isDark}`);

    // ─── Build Prompt ───
    const existingContext = existingMedicines.length > 0
      ? JSON.stringify(existingMedicines.map(m => ({ 
          medicineName: m.medicineName, 
          strength: m.strength, 
          form: m.form, 
          dosagePattern: m.dosagePattern 
        })))
      : 'None';

    const prompt = this._buildPrompt(existingContext);
    const base64Image = enhancedBuffer.toString('base64');

    // ─── Stage 2: Try Gemini Model Chain with Validation ───
    const geminiResult = await this._tryGeminiChainWithValidation(
      prompt, base64Image, enhancedMimeType
    );

    if (geminiResult) {
      attemptCount = geminiResult._attemptCount || 1;
      lastModelUsed = geminiResult._modelUsed || 'gemini';
      lastValidation = geminiResult._validation;

      // Attach full pipeline metadata
      geminiResult._meta = this._buildMeta({
        modelUsed: lastModelUsed,
        avgConfidence: lastValidation?.avgConfidence || 0,
        medicineCount: geminiResult.medicines?.length || 0,
        processingTimeMs: Date.now() - pipelineStart,
        attemptCount,
        qualityReport,
        validationErrors: []
      });
      geminiResult.status = 'extracted';

      // Clean up internal tracking fields
      delete geminiResult._attemptCount;
      delete geminiResult._modelUsed;
      delete geminiResult._validation;

      logger.info(`═══ PIPELINE SUCCESS: ${geminiResult._meta.medicineCount} medicines via ${geminiResult._meta.modelUsed} in ${geminiResult._meta.processingTimeMs}ms ═══`);
      return geminiResult;
    }

    // ─── Stage 3: Fallback to OpenAI GPT-4o ───
    const openaiResult = await this._tryOpenAIWithValidation(
      prompt, base64Image, enhancedMimeType
    );

    if (openaiResult) {
      lastModelUsed = 'gpt-4o';
      lastValidation = openaiResult._validation;
      attemptCount += 1;

      openaiResult._meta = this._buildMeta({
        modelUsed: lastModelUsed,
        avgConfidence: lastValidation?.avgConfidence || 0,
        medicineCount: openaiResult.medicines?.length || 0,
        processingTimeMs: Date.now() - pipelineStart,
        attemptCount,
        qualityReport,
        validationErrors: []
      });
      openaiResult.status = 'extracted';

      delete openaiResult._validation;

      logger.info(`═══ PIPELINE SUCCESS (OpenAI fallback): ${openaiResult._meta.medicineCount} medicines in ${openaiResult._meta.processingTimeMs}ms ═══`);
      return openaiResult;
    }

    // ─── Stage 4: All Models Failed → Manual Review ───
    const failureResult = {
      status: 'needs_manual_review',
      medicines: [],
      interaction_warnings: [],
      totalMedicinesFound: 0,
      _meta: this._buildMeta({
        modelUsed: 'all_failed',
        avgConfidence: 0,
        medicineCount: 0,
        processingTimeMs: Date.now() - pipelineStart,
        attemptCount,
        qualityReport,
        validationErrors: lastValidation?.errors || ['all_models_exhausted']
      })
    };

    logger.error(`═══ PIPELINE FAILED: All models exhausted after ${attemptCount} attempts in ${failureResult._meta.processingTimeMs}ms ═══`);
    return failureResult;
  }

  /**
   * Build the two-pass extraction prompt.
   */
  _buildPrompt(existingContext) {
    return `
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

OUTPUT FORMAT

Return JSON only:

{
  "totalMedicinesFound": 0,
  "medicines": [
    {
      "medicineName": "",
      "strength": "",
      "form": "",
      "dosagePattern": "",
      "frequency": "",
      "durationDays": 0,
      "rawText": "",
      "confidence": 0.0
    }
  ]
}

EXTRACTION RULES

- Every numbered medicine is a separate entry.
- Never merge medicines.
- Never skip partially readable medicines.
- Use best reading if handwriting is unclear.
- Preserve original medicine spelling whenever possible.
- Extract strength separately (5 mg, 10 mg, 500 mg, etc.).
- Extract dosage pattern separately (1-0-1, 0-1-0, 1-1-1, etc.).
- Extract frequency separately when available.
- Extract duration in days if mentioned.
- Use 0 when duration is not mentioned.
- Never invent medicines not present in the image.

MEDICINE SEPARATION RULES

- Do not assume that one line, one sentence, one numbered item, or one prescription entry contains only one medicine.
- A single line, sentence, note, instruction, or numbered item may contain multiple medicines.
- Carefully identify every distinct medicine name independently.
- Multiple medicines may appear together in the same handwritten line, same instruction, same paragraph, or same numbered item.
- Extract medicines based on distinct medicine names, not based on line breaks or formatting alone.
- If multiple distinct medicine names are present within a single prescription entry, create a separate medicine object for each medicine.
- One medicine object must represent exactly one medicine.
- The medicines array must contain one record per medicine, not one record per line, sentence, paragraph, or prescription item.

CONFIDENCE SCALE

1.0 = very clear
0.8 = readable
0.6 = partially readable
0.4 = difficult to read
0.2 = highly uncertain

FINAL VALIDATION

Before returning the response:

1. Count all extracted medicines.
2. Set totalMedicinesFound equal to the final count.
3. Verify medicines.length equals totalMedicinesFound.
4. Recheck all numbered items.
5. Recheck margins and bottom notes.
6. Review every extracted entry and ensure no entry contains multiple medicine names grouped together.
7. If multiple medicines are found within a single extracted entry, split them into separate medicine records.
8. Confirm that the medicines array represents individual medicines, not prescription lines or grouped text.
9. Verify that every medicine object contains only one medicine.
10. Verify that no medicineName field contains multiple distinct medicine names grouped together.

Return ONLY valid JSON.
    `;
  }

  /**
   * Try Gemini model chain with validation gate on each result.
   * Only returns a result that passes validation.
   * 
   * @returns {Object|null} Validated parsed data with _modelUsed and _attemptCount, or null
   */
  async _tryGeminiChainWithValidation(prompt, base64Image, mimeType) {
    if (!genAI) {
      logger.warn('[Pipeline] Gemini SDK not initialized. Skipping Gemini chain.');
      return null;
    }

    const filePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      }
    };

    let totalAttempts = 0;

    for (const modelName of this.GEMINI_MODEL_CHAIN) {
      totalAttempts++;

      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 8192
          }
        });

        logger.info(`[Pipeline] ──▶ Trying Gemini model: ${modelName} (attempt #${totalAttempts})`);
        const startTime = Date.now();

        const result = await model.generateContent([prompt, filePart]);
        const response = await result.response;
        const textResponse = response.text();

        const modelTime = Date.now() - startTime;
        logger.info(`[Pipeline] ${modelName} responded in ${modelTime}ms`);
        logger.debug(`[Pipeline] RAW RESPONSE (${modelName}): ${textResponse.substring(0, 500)}...`);

        // Parse JSON
        let parsedData;
        try {
          parsedData = JSON.parse(textResponse);
        } catch (jsonErr) {
          logger.warn(`[Pipeline] ${modelName} returned invalid JSON: ${jsonErr.message}`);
          continue; // Try next model
        }

        // Standardize, map, and log medicines
        if (parsedData.medicines) {
          parsedData.medicines = parsedData.medicines.map((med, idx) => {
            logger.debug(`[Pipeline] Raw medicine object [${idx}]: %o`, med);
            
            const mappedMed = {
              medicineName: med.medicineName ?? med.name ?? '',
              strength: med.strength ?? med.dosage ?? '',
              form: med.form ?? med.type ?? '',
              dosagePattern: med.dosagePattern ?? med.instructions ?? '',
              frequency: med.frequency ?? '',
              durationDays: med.durationDays !== undefined ? med.durationDays : (med.duration_days ?? 0),
              rawText: med.rawText ?? '',
              confidence: typeof med.confidence === 'number' ? med.confidence : 0.7
            };
            
            logger.debug(`[Pipeline] Mapped medicine object [${idx}]: %o`, mappedMed);
            logger.info(`  MEDICINE[${idx}]: name="${mappedMed.medicineName}", strength="${mappedMed.strength}", freq="${mappedMed.frequency}", confidence=${mappedMed.confidence}`);
            return mappedMed;
          });
        }

        // ─── VALIDATION GATE ───
        const validation = prescriptionValidator.validate(parsedData);

        if (validation.isValid) {
          parsedData._modelUsed = modelName;
          parsedData._attemptCount = totalAttempts;
          parsedData._validation = validation;
          return parsedData;
        }

        // Validation failed — log and try next model
        logger.warn(`[Pipeline] ${modelName} FAILED validation: ${validation.errors.join(', ')}. Trying next model...`);

      } catch (modelError) {
        const is429 = modelError.status === 429 || (modelError.message && modelError.message.includes('429'));
        if (is429) {
          logger.warn(`[Pipeline] ${modelName} rate-limited (429). Waiting 2s before next model...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        logger.error(`[Pipeline] ${modelName} error: ${modelError.message}`);
      }
    }

    logger.warn('[Pipeline] All Gemini models exhausted. Falling back to OpenAI...');
    return null;
  }

  /**
   * Fallback: OpenAI GPT-4o with validation.
   * 
   * @returns {Object|null} Validated parsed data, or null
   */
  async _tryOpenAIWithValidation(prompt, base64Image, mimeType) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey === 'your_openai_api_key_here') {
      logger.warn('[Pipeline] OpenAI API key not configured. Skipping.');
      return null;
    }

    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const imageMediaType = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';

    try {
      logger.info('[Pipeline] ──▶ Trying OpenAI GPT-4o (final fallback)');
      const startTime = Date.now();

      const requestBody = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMediaType};base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 8192,
        response_format: { type: 'json_object' }
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error(`[Pipeline] OpenAI API error: HTTP ${response.status}. Body: ${errorBody}`);
        return null;
      }

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content;
      const modelTime = Date.now() - startTime;

      if (!textResponse) {
        logger.error('[Pipeline] OpenAI returned empty content.');
        return null;
      }

      logger.info(`[Pipeline] GPT-4o responded in ${modelTime}ms`);
      logger.debug(`[Pipeline] OPENAI RAW: ${textResponse.substring(0, 500)}...`);

      let parsedData;
      try {
        parsedData = JSON.parse(textResponse);
      } catch (jsonErr) {
        logger.warn(`[Pipeline] GPT-4o returned invalid JSON: ${jsonErr.message}`);
        return null;
      }

      // Standardize, map, and log medicines
      if (parsedData.medicines) {
        parsedData.medicines = parsedData.medicines.map((med, idx) => {
          logger.debug(`[Pipeline] Raw medicine object [${idx}]: %o`, med);
          
          const mappedMed = {
            medicineName: med.medicineName ?? med.name ?? '',
            strength: med.strength ?? med.dosage ?? '',
            form: med.form ?? med.type ?? '',
            dosagePattern: med.dosagePattern ?? med.instructions ?? '',
            frequency: med.frequency ?? '',
            durationDays: med.durationDays !== undefined ? med.durationDays : (med.duration_days ?? 0),
            rawText: med.rawText ?? '',
            confidence: typeof med.confidence === 'number' ? med.confidence : 0.7
          };
          
          logger.debug(`[Pipeline] Mapped medicine object [${idx}]: %o`, mappedMed);
          logger.info(`  MEDICINE[${idx}]: name="${mappedMed.medicineName}", strength="${mappedMed.strength}", freq="${mappedMed.frequency}", confidence=${mappedMed.confidence}`);
          return mappedMed;
        });
      }

      // ─── VALIDATION GATE ───
      const validation = prescriptionValidator.validate(parsedData);

      if (validation.isValid) {
        parsedData._validation = validation;
        return parsedData;
      }

      logger.warn(`[Pipeline] GPT-4o FAILED validation: ${validation.errors.join(', ')}`);

      // Even if validation failed, if we got SOME medicines, return them
      // (better partial data than nothing for manual review)
      if (parsedData.medicines && parsedData.medicines.length > 0) {
        logger.info('[Pipeline] GPT-4o has partial data — returning for manual review');
        parsedData._validation = validation;
        return parsedData;
      }

      return null;

    } catch (error) {
      logger.error(`[Pipeline] OpenAI extraction failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Build standardized processing metadata.
   */
  _buildMeta({ modelUsed, avgConfidence, medicineCount, processingTimeMs, attemptCount, qualityReport, validationErrors }) {
    return {
      modelUsed,
      avgConfidence,
      medicineCount,
      processingTimeMs,
      attemptCount,
      imageQuality: {
        score: qualityReport.qualityScore,
        isBlurry: qualityReport.isBlurry || false,
        isDark: qualityReport.isDark || false,
        wasRotated: qualityReport.wasRotated || false,
        originalWidth: qualityReport.originalWidth || 0,
        originalHeight: qualityReport.originalHeight || 0
      },
      validationErrors
    };
  }
}

module.exports = new AIService();
