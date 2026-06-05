const storageService = require('../services/storage.service');
const aiService = require('../services/ai.service');
const medicineRepository = require('../repositories/medicine.repository');
const prescriptionRepository = require('../repositories/prescription.repository');
const logger = require('../config/logger');

class PrescriptionController {
  async uploadPrescription(req, res, next) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded. Please provide a PDF or Image prescription file.'
        });
      }

      // 1. Upload original image to Supabase Storage
      const fileUrl = await storageService.uploadPrescription(req.file, userId);

      // 2. Fetch current active medicines to feed as context for safety reviews
      const existingMedicines = await medicineRepository.findByUserId(userId);

      // 3. Process through the full pipeline:
      //    Image Enhancement → Gemini 2.5 Flash → Validation → Retry Chain → Result
      const aiAnalysis = await aiService.processPrescription(req.file, existingMedicines);

      // 4. Determine final status
      const status = aiAnalysis.status || 'extracted';
      const isManualReview = status === 'needs_manual_review';

      // 5. Save prescription record in DB (with status)
      const record = await prescriptionRepository.create({
        userId,
        fileUrl,
        extractedData: aiAnalysis,
        status
      });

      // 6. Save processing log for analytics & debugging
      if (aiAnalysis._meta) {
        try {
          await prescriptionRepository.createLog({
            prescriptionId: record.id,
            userId,
            modelUsed: aiAnalysis._meta.modelUsed || 'unknown',
            avgConfidence: aiAnalysis._meta.avgConfidence || 0,
            medicineCount: aiAnalysis._meta.medicineCount || 0,
            processingTimeMs: aiAnalysis._meta.processingTimeMs || 0,
            attemptCount: aiAnalysis._meta.attemptCount || 1,
            qualityReport: aiAnalysis._meta.imageQuality || {},
            validationErrors: aiAnalysis._meta.validationErrors || [],
            status: isManualReview ? 'all_models_failed' : 'success'
          });
        } catch (logError) {
          // Log saving should never block the response
          logger.warn(`Failed to save prescription log: ${logError.message}`);
        }
      }

      // 7. Build response
      const responseData = {
        prescriptionId: record.id,
        fileUrl: record.file_url,
        status,
        extractedMedicines: aiAnalysis.medicines || [],
        warnings: aiAnalysis.interaction_warnings || [],
        createdAt: record.created_at
      };

      // Include meta if available (useful for app debugging & confidence display)
      if (aiAnalysis._meta) {
        responseData.meta = {
          modelUsed: aiAnalysis._meta.modelUsed,
          avgConfidence: aiAnalysis._meta.avgConfidence,
          processingTimeMs: aiAnalysis._meta.processingTimeMs,
          medicineCount: aiAnalysis._meta.medicineCount,
          imageQuality: aiAnalysis._meta.imageQuality
        };
      }

      // For manual review, return 200 but with clear status indication
      if (isManualReview) {
        return res.status(200).json({
          success: true,
          message: 'Prescription could not be fully processed. Please review and add medicines manually, or retake the photo.',
          data: responseData
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Prescription processed successfully',
        data: responseData
      });
    } catch (error) {
      logger.error('Error in uploadPrescription controller: %o', error);
      next(error);
    }
  }

  async getPrescriptions(req, res, next) {
    try {
      const userId = req.user.id;
      const prescriptions = await prescriptionRepository.findByUserId(userId);
      
      return res.status(200).json({
        success: true,
        data: prescriptions
      });
    } catch (error) {
      logger.error('Error in getPrescriptions controller: %o', error);
      next(error);
    }
  }
}

module.exports = new PrescriptionController();
