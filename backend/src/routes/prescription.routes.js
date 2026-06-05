const express = require('express');
const prescriptionController = require('../controllers/prescription.controller');
const upload = require('../middleware/upload.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.post('/upload', upload.single('file'), prescriptionController.uploadPrescription);
router.get('/', prescriptionController.getPrescriptions);

module.exports = router;
