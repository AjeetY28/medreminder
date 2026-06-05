const logger = require('../config/logger');

/**
 * Prescription Validator — Validates AI-extracted prescription data.
 * 
 * This is the gatekeeper between raw AI output and the user.
 * Every AI response MUST pass through this validator before being accepted.
 * 
 * Validation rules:
 *   1. Response must be valid JSON (handled by caller's JSON.parse)
 *   2. medicines array must exist and not be empty
 *   3. totalMedicinesFound must match medicines.length
 *   4. Every medicine must have a non-empty medicineName
 *   5. Average confidence must be above threshold (0.4)
 *   6. No obviously invalid data (negative duration, etc.)
 */
class PrescriptionValidator {

  /**
   * Validate parsed AI response data.
   * 
   * @param {Object} parsedData - Parsed JSON from AI model
   * @returns {{ isValid: boolean, errors: string[], avgConfidence: number, medicineCount: number }}
   */
  validate(parsedData) {
    const errors = [];

    // ─── Rule 1: medicines array must exist ───
    if (!parsedData || typeof parsedData !== 'object') {
      errors.push('response_not_object');
      return { isValid: false, errors, avgConfidence: 0, medicineCount: 0 };
    }

    if (!parsedData.medicines || !Array.isArray(parsedData.medicines)) {
      errors.push('medicines_array_missing');
      return { isValid: false, errors, avgConfidence: 0, medicineCount: 0 };
    }

    const medicines = parsedData.medicines;
    const medicineCount = medicines.length;

    // ─── Rule 2: medicines array must not be empty ───
    if (medicineCount === 0) {
      errors.push('medicines_empty');
    }

    // ─── Rule 3: totalMedicinesFound must match array length ───
    if (parsedData.totalMedicinesFound !== undefined && 
        parsedData.totalMedicinesFound !== null) {
      const reported = parseInt(parsedData.totalMedicinesFound, 10);
      if (!isNaN(reported) && reported !== medicineCount) {
        errors.push(`count_mismatch:reported=${reported},actual=${medicineCount}`);
        logger.warn(`[Validator] COUNT MISMATCH: AI reported ${reported} but array has ${medicineCount}`);
      }
    }

    // ─── Rule 4: Every medicine must have a non-empty medicineName ───
    const emptyNames = medicines.filter((m, idx) => {
      if (!m.medicineName || !m.medicineName.trim()) {
        logger.warn(`[Validator] Medicine at index ${idx} has empty medicineName`);
        return true;
      }
      return false;
    });
    if (emptyNames.length > 0) {
      errors.push(`empty_medicine_names:count=${emptyNames.length}`);
    }

    // ─── Rule 5: Average confidence must be acceptable ───
    const avgConfidence = this._calculateAvgConfidence(medicines);
    if (avgConfidence < 0.4 && medicineCount > 0) {
      errors.push(`low_confidence:avg=${avgConfidence.toFixed(2)}`);
      logger.warn(`[Validator] LOW CONFIDENCE: average=${avgConfidence.toFixed(2)} (threshold=0.4)`);
    }

    // ─── Rule 6: No obviously invalid data ───
    medicines.forEach((med, idx) => {
      // Duration should not be negative
      if (med.durationDays !== undefined && med.durationDays < 0) {
        errors.push(`invalid_duration:index=${idx},value=${med.durationDays}`);
      }
      // Name should not be just numbers or too short (likely garbage)
      if (med.medicineName && med.medicineName.trim().length < 2) {
        errors.push(`suspicious_name:index=${idx},name="${med.medicineName}"`);
      }
    });

    const isValid = errors.length === 0;

    if (isValid) {
      logger.info(`[Validator] ✅ PASSED: ${medicineCount} medicines, avg_confidence=${avgConfidence.toFixed(2)}`);
    } else {
      logger.warn(`[Validator] ❌ FAILED: ${errors.length} error(s): ${errors.join(', ')}`);
    }

    return {
      isValid,
      errors,
      avgConfidence: parseFloat(avgConfidence.toFixed(2)),
      medicineCount
    };
  }

  /**
   * Calculate average confidence across all medicines.
   * If confidence field is missing, assume 0.7 (readable default).
   */
  _calculateAvgConfidence(medicines) {
    if (!medicines || medicines.length === 0) return 0;

    const total = medicines.reduce((sum, med) => {
      const conf = typeof med.confidence === 'number' ? med.confidence : 0.7;
      return sum + conf;
    }, 0);

    return total / medicines.length;
  }
}

module.exports = new PrescriptionValidator();

