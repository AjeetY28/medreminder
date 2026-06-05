const crypto = require('crypto');
const logger = require('../config/logger');
const paymentRepository = require('../repositories/payment.repository');
const subscriptionRepository = require('../repositories/subscription.repository');

class PaymentService {
  /**
   * Create check out parameters and transaction hash for PayU Gateway
   */
  async createCheckoutSession({ userId, email, phone, planName, amount }) {
    const merchantKey = process.env.PAYU_MERCHANT_KEY || 'dummy_merchant_key';
    const merchantSalt = process.env.PAYU_MERCHANT_SALT || 'dummy_merchant_salt';
    
    // Generate unique transaction ID
    const txnid = `txn_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const productinfo = planName || 'MediReminder Subscription';
    const firstname = email ? email.split('@')[0] : 'User';
    
    // Create pending payment log in Database
    await paymentRepository.create({
      userId,
      orderId: txnid,
      amount,
      status: 'PENDING'
    });

    // Hash formula for PayU checkout: 
    // sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
    // We will leave UDFs empty but keep the placeholders
    const hashString = `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${merchantSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    logger.info(`Generated checkout session for User ${userId}. TxnId: ${txnid}, Amount: ${amount}`);

    return {
      txnid,
      key: merchantKey,
      amount,
      productinfo,
      firstname,
      email,
      phone: phone || '',
      surl: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/callback`,
      furl: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/callback`,
      hash,
      actionUrl: `${process.env.PAYU_BASE_URL || 'https://test.payu.in'}/_payment`
    };
  }

  /**
   * Verify callback payment response sent by PayU IPN
   */
  async verifyPayment(payuParams) {
    const merchantKey = process.env.PAYU_MERCHANT_KEY || 'dummy_merchant_key';
    const merchantSalt = process.env.PAYU_MERCHANT_SALT || 'dummy_merchant_salt';

    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      status,
      hash: responseHash,
      mihpayid,
      error
    } = payuParams;

    // Optional UDFs
    const udf1 = payuParams.udf1 || '';
    const udf2 = payuParams.udf2 || '';
    const udf3 = payuParams.udf3 || '';
    const udf4 = payuParams.udf4 || '';
    const udf5 = payuParams.udf5 || '';
    const additionalCharges = payuParams.additionalCharges || '';

    // Calculate reverse hash for verification:
    // sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    // If additionalCharges is present:
    // sha512(additionalCharges|salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
    let hashString = '';
    if (additionalCharges) {
      hashString = `${additionalCharges}|${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
    } else {
      hashString = `${merchantSalt}|${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${merchantKey}`;
    }

    const calculatedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    logger.debug(`Verifying PayU Callback for TxnId: ${txnid}. Response Hash: ${responseHash}, Calculated Hash: ${calculatedHash}`);

    // If hashes don't match, transaction is compromised
    if (calculatedHash !== responseHash && process.env.NODE_ENV === 'production') {
      logger.error(`Security Warning: Hash mismatch for order ${txnid}`);
      await paymentRepository.update(txnid, {
        status: 'FAILED',
        payuResponse: { ...payuParams, error_detail: 'Hash mismatch verification failed' }
      });
      throw new Error('Hash verification failed. Transaction might be compromised.');
    }

    // Load payment record from Database
    const payment = await paymentRepository.findByOrderId(txnid);
    if (!payment) {
      logger.error(`Payment record not found for transaction id: ${txnid}`);
      throw new Error('Transaction record not found');
    }

    const finalStatus = status === 'success' ? 'SUCCESS' : 'FAILED';

    // Update payment record in database
    await paymentRepository.update(txnid, {
      transactionId: mihpayid || 'N/A',
      status: finalStatus,
      payuResponse: payuParams
    });

    if (finalStatus === 'SUCCESS') {
      logger.info(`Payment successful for order ${txnid}. Provisioning subscription...`);

      // Determine subscription period (e.g. Monthly, Annual)
      const startDate = new Date();
      const endDate = new Date();
      const planName = productinfo.toLowerCase().includes('annual') ? 'Annual' : 'Monthly';

      if (planName === 'Annual') {
        endDate.setFullYear(startDate.getFullYear() + 1);
      } else {
        endDate.setMonth(startDate.getMonth() + 1);
      }

      // Record subscription details
      await subscriptionRepository.create({
        userId: payment.user_id,
        planName,
        startDate,
        endDate,
        pricePaid: payment.amount
      });

      logger.info(`Subscription activated for User ${payment.user_id} until ${endDate.toISOString()}`);
    } else {
      logger.warn(`Payment failed for order ${txnid}. Reason: ${error || 'Unknown'}`);
    }

    return { txnid, status: finalStatus };
  }
}

module.exports = new PaymentService();
