const express = require('express');
const reminderController = require('../controllers/reminder.controller');
const validate = require('../middleware/validator.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { createReminderSchema, updateReminderSchema } = require('../validators/reminder.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/', reminderController.getReminders);
router.post('/', validate(createReminderSchema), reminderController.createReminder);
router.put('/:id', validate(updateReminderSchema), reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;
