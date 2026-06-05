const paymentService = require('../services/payment.service');
const paymentRepository = require('../repositories/payment.repository');
const logger = require('../config/logger');

class PaymentController {
  async checkout(req, res, next) {
    try {
      const userId = req.user.id;
      const email = req.user.email;
      const phone = req.user.phone;
      const { planName, amount } = req.body;

      const checkoutPayload = await paymentService.createCheckoutSession({
        userId,
        email,
        phone,
        planName,
        amount
      });

      return res.status(200).json({
        success: true,
        message: 'Checkout session created successfully',
        data: checkoutPayload
      });
    } catch (error) {
      logger.error('Error in checkout controller: %o', error);
      next(error);
    }
  }

  async callback(req, res, next) {
    try {
      // PayU sends parameters URL-encoded in the POST body
      const payuParams = req.body;
      
      logger.info('Received PayU Payment Callback webhook POST.');
      
      let txnResult;
      let statusPageHtml = '';

      try {
        txnResult = await paymentService.verifyPayment(payuParams);
      } catch (err) {
        logger.error(`Callback verification logic error: ${err.message}`);
        txnResult = { txnid: payuParams.txnid || 'N/A', status: 'FAILED' };
      }

      const isSuccess = txnResult.status === 'SUCCESS';
      const themeColor = isSuccess ? '#10B981' : '#EF4444';
      const statusText = isSuccess ? 'Payment Successful' : 'Payment Failed';
      const icon = isSuccess 
        ? '<svg class="w-16 h-16 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        : '<svg class="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

      statusPageHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Status - MediReminder AI</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; }
          </style>
        </head>
        <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
          <div class="bg-slate-800 border border-slate-700/60 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
            <!-- Background Glow -->
            <div class="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl"></div>
            <div class="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl"></div>
            
            <div class="relative z-10">
              <div class="mb-6">${icon}</div>
              <h1 class="text-3xl font-extrabold mb-2" style="color: ${themeColor}">${statusText}</h1>
              <p class="text-slate-400 mb-6">Thank you for supporting MediReminder AI. Here is your transaction overview.</p>
              
              <div class="bg-slate-900/50 border border-slate-700/40 rounded-2xl p-4 text-left mb-6 space-y-3">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Transaction ID</span>
                  <span class="font-mono text-slate-300">${txnResult.txnid}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Amount Paid</span>
                  <span class="font-semibold text-white">INR ${payuParams.amount || '0.00'}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Gateway Ref</span>
                  <span class="font-semibold text-slate-300">${payuParams.mihpayid || 'N/A'}</span>
                </div>
              </div>

              <div class="space-y-3">
                <a href="medireminder://payment-result?status=${isSuccess ? 'success' : 'failed'}&txnid=${txnResult.txnid}" 
                   class="block w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30">
                  Return to Application
                </a>
                <p class="text-xs text-slate-500">If you are not redirected automatically, click the button above.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(statusPageHtml);
    } catch (error) {
      logger.error('Error in callback controller: %o', error);
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const history = await paymentRepository.findByUserId(userId);
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error in getHistory controller: %o', error);
      next(error);
    }
  }
}

module.exports = new PaymentController();
