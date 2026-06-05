const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;

if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    logger.info('Google Gemini AI SDK configured successfully.');
  } catch (error) {
    logger.error('Failed to configure Google Gemini AI SDK: %o', error);
  }
} else {
  logger.warn('GEMINI_API_KEY is missing from environment variables. AI features (OCR, Interactions, Duplicate check) will run in mock/simulation mode.');
}

module.exports = genAI;
