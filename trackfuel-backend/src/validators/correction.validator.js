/**
 * Schémas de validation Joi pour la table `corrections`
 * 100 % synchronisés avec la définition SQL
 */

import Joi from 'joi';

// Format DATETIME MySQL : YYYY-MM-DD HH:mm:ss
const mysqlDateTime = Joi.string().pattern(
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
  'YYYY-MM-DD HH:mm:ss'
);

const createCorrectionSchema = Joi.object({
  table: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.max': 'Le champ "table" ne doit pas dépasser 50 caractères.',
    }),

  record_id: Joi.number()
    .max(50)
    .required()
    .messages({
      'string.max': 'Le champ "record_id" ne doit pas dépasser 50 caractères.',
    }),

  champ: Joi.string()
    .max(50)
    .required()
    .messages({
      'string.max': 'Le champ "champ" ne doit pas dépasser 50 caractères.',
    }),

  old_value: Joi.any().required(),

  new_value: Joi.any().required(),

  status: Joi.string()
    .valid('pending', 'validated', 'rejected')
    .default('pending')
    .optional(),

  comment: Joi.string()
    .max(500)
    .allow('', null)
    .optional(),

  requested_by: Joi.number()
    .max(50)
    .required()
    .messages({
      'string.max': 'Le champ "requested_by" ne doit pas dépasser 50 caractères.',
    }),

  requested_at: mysqlDateTime.required().messages({
    'string.pattern.name': 'Format de date invalide. Utilisez YYYY-MM-DD HH:mm:ss',
  }),
}).required();

const validateCorrectionSchema = Joi.object({
  // validateCorrectionSchema + rejectCorrectionSchema
  validated_by: Joi.number().integer().positive().required(),
}).required();

const rejectCorrectionSchema = Joi.object({
  // validateCorrectionSchema + rejectCorrectionSchema
  validated_by: Joi.number().integer().positive().required(),

  rejection_reason: Joi.string()
    .max(500)
    .allow('', null)
    .optional(),
}).required();

export {
  createCorrectionSchema,
  validateCorrectionSchema,
  rejectCorrectionSchema,
};