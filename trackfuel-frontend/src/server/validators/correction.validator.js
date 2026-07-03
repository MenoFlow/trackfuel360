/**
 * Schémas de validation pour les corrections
 */

const Joi = require('joi');

const createCorrectionSchema = Joi.object({
  table: Joi.string().required().max(50),
  record_id: Joi.string().required(),
  champ: Joi.string().required().max(50),
  old_value: Joi.any().required(),
  new_value: Joi.any().required(),
  comment: Joi.string().max(500).allow(null, ''),
  requested_by: Joi.string().required()
});

const validateCorrectionSchema = Joi.object({
  validated_by: Joi.string().required()
});

const rejectCorrectionSchema = Joi.object({
  validated_by: Joi.string().required(),
  rejection_reason: Joi.string().max(500).allow(null, '')
});

module.exports = {
  createCorrectionSchema,
  validateCorrectionSchema,
  rejectCorrectionSchema
};
