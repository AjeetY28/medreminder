const express = require('express');
const paymentController = require('../controllers/payment.controller');
const validate = require('../middleware/validator.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { checkoutSessionSchema } = require('../validators/payment.validator');

const router = express.Router();

router.post('/checkout', requireAuth, validate(checkoutSessionSchema), paymentController.checkout);
router.post('/callback', paymentController.callback); // Webhook callback: Must remain public
router.get('/history', requireAuth, paymentController.getHistory);

module.exports = router;
