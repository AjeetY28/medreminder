const Joi = require('joi');

const createMedicineSchema = Joi.object({
  name: Joi.string().max(255).required(),
  dosage: Joi.string().max(100).allow(null, ''),
  instructions: Joi.string().max(1000).allow(null, ''),
  type: Joi.string().max(50).allow(null, ''), // e.g. Tablet, Capsule
  stock: Joi.number().integer().min(0).default(0),
  unit: Joi.string().max(50).allow(null, ''), // e.g. tablets, ml, capsules
  expiryDate: Joi.date().iso().greater('now').allow(null, '')
});

const updateMedicineSchema = Joi.object({
  name: Joi.string().max(255),
  dosage: Joi.string().max(100).allow(null, ''),
  instructions: Joi.string().max(1000).allow(null, ''),
  type: Joi.string().max(50).allow(null, ''),
  stock: Joi.number().integer().min(0),
  unit: Joi.string().max(50).allow(null, ''),
  expiryDate: Joi.date().iso().greater('now').allow(null, '')
});

module.exports = {
  createMedicineSchema,
  updateMedicineSchema
};
