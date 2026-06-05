const Joi = require('joi');

const checkoutSessionSchema = Joi.object({
  planName: Joi.string()
    .valid('Monthly', 'Annual', 'monthly', 'annual')
    .required(),
  amount: Joi.number()
    .positive()
    .required()
});

module.exports = {
  checkoutSessionSchema
};
