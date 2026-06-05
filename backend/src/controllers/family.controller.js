const familyRepository = require('../repositories/family.repository');
const logger = require('../config/logger');

class FamilyController {
  async getFamily(req, res, next) {
    try {
      const userId = req.user.id;
      const members = await familyRepository.findByUserId(userId);
      return res.status(200).json({
        success: true,
        data: members
      });
    } catch (error) {
      logger.error('Error in getFamily controller: %o', error);
      next(error);
    }
  }

  async addFamilyMember(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, phone, email, relationship, notifyOnMissed } = req.body;

      if (!name || !phone) {
        return res.status(400).json({
          success: false,
          message: 'name and phone number are required'
        });
      }

      const member = await familyRepository.create({
        userId,
        name,
        phone,
        email,
        relationship,
        notifyOnMissed
      });

      return res.status(201).json({
        success: true,
        message: 'Family member linked successfully',
        data: member
      });
    } catch (error) {
      logger.error('Error in addFamilyMember controller: %o', error);
      next(error);
    }
  }

  async removeFamilyMember(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const deleted = await familyRepository.delete(id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Family member record not found or access denied'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Family member unlinked successfully'
      });
    } catch (error) {
      logger.error('Error in removeFamilyMember controller: %o', error);
      next(error);
    }
  }
}

module.exports = new FamilyController();
