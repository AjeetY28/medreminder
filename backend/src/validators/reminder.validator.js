const Joi = require('joi');

const createReminderSchema = Joi.object({
  medicineId: Joi.string().guid({ version: 'uuidv4' }).required(),
  reminderTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .required()
    .messages({
      'string.pattern.base': 'Reminder time must be in 24-hour HH:MM or HH:MM:SS format (e.g. 08:30 or 14:00:00)'
    }),
  daysOfWeek: Joi.array()
    .items(Joi.number().integer().min(1).max(7))
    .unique()
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one scheduled day of the week is required (1 = Monday, 7 = Sunday)'
    })
});

const updateReminderSchema = Joi.object({
  reminderTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  daysOfWeek: Joi.array()
    .items(Joi.number().integer().min(1).max(7))
    .unique()
    .min(1),
  isActive: Joi.boolean()
});

module.exports = {
  createReminderSchema,
  updateReminderSchema
};
