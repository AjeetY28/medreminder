const Joi = require('joi');

const sendOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid E.164 formatted telephone number (e.g. +919876543210)'
    })
});

const verifyOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain only digits'
    })
});

const googleLoginSchema = Joi.object({
  idToken: Joi.string().required()
});

const appleLoginSchema = Joi.object({
  identityToken: Joi.string().required()
});

module.exports = {
  sendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
  appleLoginSchema
};
