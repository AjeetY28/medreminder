const sharp = require('sharp');
const logger = require('../config/logger');

/**
 * Image Processing Service — Pre-processes prescription images before AI OCR.
 * 
 * Pipeline:
 *   1. Auto-rotate based on EXIF orientation
 *   2. Assess quality (blur, brightness, dimensions)
 *   3. Enhance (contrast normalization + sharpening)
 *   4. Convert to JPEG for consistent AI input
 * 
 * IMPORTANT: This service NEVER rejects images outright.
 * Poor quality images get warnings but still proceed — patient safety
 * requires we always attempt extraction.
 */
class ImageProcessingService {

  /**
   * Full preprocessing pipeline: assess quality → enhance → return results.
   * 
   * @param {Buffer} fileBuffer - Raw image buffer from multer
   * @param {string} mimeType - MIME type of uploaded file
   * @returns {Promise<{ enhancedBuffer: Buffer, enhancedMimeType: string, qualityReport: Object }>}
   */
  async assessAndEnhance(fileBuffer, mimeType) {
    const startTime = Date.now();

    try {
      // Skip processing for PDFs — pass through as-is
      if (mimeType === 'application/pdf') {
        logger.info('[ImageProcessing] PDF detected — skipping image preprocessing');
        return {
          enhancedBuffer: fileBuffer,
          enhancedMimeType: mimeType,
          qualityReport: {
            isPdf: true,
            isBlurry: false,
            isDark: false,
            isTooSmall: false,
            wasRotated: false,
            qualityScore: 1.0,
            originalWidth: 0,
            originalHeight: 0,
            processingTimeMs: Date.now() - startTime
          }
        };
      }

      // ─── Step 1: Load image and get metadata ───
      const image = sharp(fileBuffer);
      const metadata = await image.metadata();
      
      logger.info(`[ImageProcessing] Input: ${metadata.width}x${metadata.height}, format=${metadata.format}, orientation=${metadata.orientation || 'none'}`);

      // Check if EXIF rotation will be applied
      const wasRotated = metadata.orientation && metadata.orientation > 1;

      // ─── Step 2: Quality Assessment (on original image) ───
      const qualityReport = await this._assessQuality(fileBuffer, metadata);
      qualityReport.wasRotated = !!wasRotated;

      if (qualityReport.isBlurry) {
        logger.warn('[ImageProcessing] ⚠️ Image appears BLURRY — OCR accuracy may be reduced');
      }
      if (qualityReport.isDark) {
        logger.warn('[ImageProcessing] ⚠️ Image appears DARK — OCR accuracy may be reduced');
      }
      if (qualityReport.isTooSmall) {
        logger.warn('[ImageProcessing] ⚠️ Image is SMALL — text may be unreadable');
      }

      // ─── Step 3: Enhancement Pipeline ───
      const enhancedBuffer = await sharp(fileBuffer)
        .rotate()                       // Auto-rotate based on EXIF
        .normalize()                    // Auto-contrast: stretch histogram to full range
        .sharpen({                      // Sharpen text edges for better OCR
          sigma: 1.5,
          m1: 1.0,                      // Flat area sharpening
          m2: 2.0                       // Jagged area sharpening (text edges)
        })
        .jpeg({                         // Convert to JPEG for consistent AI input
          quality: 95,
          mozjpeg: true                 // Better compression without quality loss
        })
        .toBuffer();

      qualityReport.processingTimeMs = Date.now() - startTime;
      qualityReport.enhancedSizeBytes = enhancedBuffer.length;

      logger.info(`[ImageProcessing] Enhanced: ${(enhancedBuffer.length / 1024).toFixed(0)}KB, quality_score=${qualityReport.qualityScore}, processing=${qualityReport.processingTimeMs}ms`);

      return {
        enhancedBuffer,
        enhancedMimeType: 'image/jpeg',
        qualityReport
      };

    } catch (error) {
      // If sharp fails (corrupted image, unsupported format), fall back to original
      logger.error(`[ImageProcessing] Enhancement failed: ${error.message}. Using original image.`);
      return {
        enhancedBuffer: fileBuffer,
        enhancedMimeType: mimeType,
        qualityReport: {
          isPdf: false,
          isBlurry: false,
          isDark: false,
          isTooSmall: false,
          wasRotated: false,
          qualityScore: 0.5,          // Unknown quality
          error: error.message,
          processingTimeMs: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Assess image quality using pixel statistics.
   * 
   * Uses sharp's stats() which returns per-channel min, max, mean, stdev, entropy.
   * - Blur detection: low entropy = uniform/blurry image
   * - Dark detection: low mean brightness
   * - Size check: dimensions too small for readable text
   */
  async _assessQuality(fileBuffer, metadata) {
    try {
      // Get grayscale stats for quality metrics
      const grayscaleBuffer = await sharp(fileBuffer)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const stats = await sharp(fileBuffer).grayscale().stats();
      const channel = stats.channels[0]; // Grayscale = single channel

      // ─── Blur Detection (Entropy-based) ───
      // Entropy measures information content. Low entropy = smooth/blurry.
      // Typical values: sharp text = 6-7+, blurry = 3-5, blank = 0-2
      const entropy = channel.entropy || 0;
      const isBlurry = entropy < 4.5;

      // ─── Brightness Detection ───
      // Mean pixel value (0-255). Too dark = hard to read.
      // Typical: well-lit prescription = 140-220, dark photo = 30-80
      const meanBrightness = channel.mean || 0;
      const isDark = meanBrightness < 60;
      const isTooLight = meanBrightness > 245;

      // ─── Size Check ───
      // Prescription text needs minimum resolution to be readable
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const minDimension = Math.min(width, height);
      const isTooSmall = minDimension < 300;

      // ─── Composite Quality Score (0.0 - 1.0) ───
      let qualityScore = 1.0;
      if (isBlurry) qualityScore -= 0.3;
      if (isDark) qualityScore -= 0.3;
      if (isTooLight) qualityScore -= 0.1;
      if (isTooSmall) qualityScore -= 0.2;
      qualityScore = Math.max(0.1, qualityScore); // Never zero

      return {
        isPdf: false,
        isBlurry,
        isDark,
        isTooLight,
        isTooSmall,
        wasRotated: false,            // Set by caller
        qualityScore: parseFloat(qualityScore.toFixed(2)),
        entropy: parseFloat(entropy.toFixed(2)),
        meanBrightness: parseFloat(meanBrightness.toFixed(1)),
        originalWidth: width,
        originalHeight: height
      };

    } catch (error) {
      logger.warn(`[ImageProcessing] Quality assessment failed: ${error.message}`);
      return {
        isPdf: false,
        isBlurry: false,
        isDark: false,
        isTooSmall: false,
        wasRotated: false,
        qualityScore: 0.5,
        error: error.message
      };
    }
  }
}

module.exports = new ImageProcessingService();
