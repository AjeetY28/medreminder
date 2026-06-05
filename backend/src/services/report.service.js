const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const logger = require('../config/logger');

class ReportService {
  /**
   * Export user medicine logs as CSV text
   * @param {Array} logs - Array of medicine logs
   * @returns {string} CSV formatted content
   */
  exportLogsToCSV(logs) {
    try {
      const fields = [
        { label: 'Log ID', value: 'id' },
        { label: 'Medicine Name', value: 'medicine_name' },
        { label: 'Dosage', value: 'medicine_dosage' },
        { label: 'Status', value: 'status' },
        { label: 'Logged Time', value: 'logged_at' }
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(logs);
      return csv;
    } catch (error) {
      logger.error('Failed to generate CSV report: %o', error);
      throw new Error('CSV generation failed');
    }
  }

  /**
   * Export user medicine logs as Excel Workbook binary Buffer
   * @param {Array} logs - Array of medicine logs
   * @returns {Promise<Buffer>} Excel workbook binary buffer
   */
  async exportLogsToExcel(logs) {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MediReminder AI';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Adherence Report');

      // Style headers
      worksheet.columns = [
        { header: 'Log ID', key: 'id', width: 40 },
        { header: 'Medicine Name', key: 'medicine_name', width: 25 },
        { header: 'Dosage', key: 'medicine_dosage', width: 20 },
        { header: 'Adherence Status', key: 'status', width: 18 },
        { header: 'Logged Timestamp', key: 'logged_at', width: 25 }
      ];

      // Format header row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F46E5' } // Indigo color theme
      };

      // Add data
      logs.forEach(log => {
        worksheet.addRow({
          id: log.id,
          medicine_name: log.medicine_name,
          medicine_dosage: log.medicine_dosage || 'N/A',
          status: log.status,
          logged_at: new Date(log.logged_at).toLocaleString()
        });
      });

      // Style status column cells conditionally
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip headers
        
        const statusCell = row.getCell('status');
        const statusValue = statusCell.value;

        if (statusValue === 'TAKEN') {
          statusCell.font = { color: { argb: '15803D' }, bold: true }; // Green
        } else if (statusValue === 'MISSED') {
          statusCell.font = { color: { argb: 'B91C1C' }, bold: true }; // Red
        } else if (statusValue === 'SKIPPED') {
          statusCell.font = { color: { argb: 'B45309' }, bold: true }; // Orange
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Failed to generate Excel report: %o', error);
      throw new Error('Excel generation failed');
    }
  }
}

module.exports = new ReportService();
