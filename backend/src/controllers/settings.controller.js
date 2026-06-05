const settingsRepository = require('../repositories/settings.repository');
const logger = require('../config/logger');

class SettingsController {
  /**
   * Public App configuration parameters check (e.g. at boot time)
   */
  async getAppSettings(req, res, next) {
    try {
      const allSettings = await settingsRepository.getAll();
      const settingsMap = {};
      
      allSettings.forEach(s => {
        // Attempt to parse JSON objects (like pricing structures)
        try {
          settingsMap[s.key] = JSON.parse(s.value);
        } catch {
          // Fall back to raw string or boolean conversions
          if (s.value === 'true') settingsMap[s.key] = true;
          else if (s.value === 'false') settingsMap[s.key] = false;
          else settingsMap[s.key] = s.value;
        }
      });

      return res.status(200).json({
        success: true,
        data: settingsMap
      });
    } catch (error) {
      logger.error('Error in getAppSettings controller: %o', error);
      next(error);
    }
  }

  // --- Protected admin configurations ---

  async getSettingsList(req, res, next) {
    try {
      const allSettings = await settingsRepository.getAll();
      return res.status(200).json({
        success: true,
        data: allSettings
      });
    } catch (error) {
      logger.error('Error in getSettingsList controller: %o', error);
      next(error);
    }
  }

  async updateSetting(req, res, next) {
    try {
      const { key, value, description } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'key and value are required'
        });
      }

      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const updated = await settingsRepository.set(key, stringValue, description);

      return res.status(200).json({
        success: true,
        message: 'System settings updated successfully',
        data: updated
      });
    } catch (error) {
      logger.error('Error in updateSetting controller: %o', error);
      next(error);
    }
  }
}

module.exports = new SettingsController();
