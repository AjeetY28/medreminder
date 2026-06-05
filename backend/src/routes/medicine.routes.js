const express = require('express');
const medicineController = require('../controllers/medicine.controller');
const validate = require('../middleware/validator.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { createMedicineSchema, updateMedicineSchema } = require('../validators/medicine.validator');

const router = express.Router();

// Require authentication for all medicine routes
router.use(requireAuth);

router.get('/', medicineController.getMedicines);
router.get('/:id', medicineController.getMedicine);
router.post('/', validate(createMedicineSchema), medicineController.createMedicine);
router.put('/:id', validate(updateMedicineSchema), medicineController.updateMedicine);
router.delete('/:id', medicineController.deleteMedicine);

// Adherence logs
router.post('/log', medicineController.logIntake);
router.get('/logs', medicineController.getLogs);

module.exports = router;
