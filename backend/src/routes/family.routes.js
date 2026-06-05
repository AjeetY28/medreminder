const express = require('express');
const familyController = require('../controllers/family.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', familyController.getFamily);
router.post('/', familyController.addFamilyMember);
router.delete('/:id', familyController.removeFamilyMember);

module.exports = router;
