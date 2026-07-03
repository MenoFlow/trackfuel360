/**
 * Schémas de validation pour traceGps
 */

import Joi from 'joi';

const getTraceGpsSchema = Joi.object({
  trajet_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'trajet_id doit être un nombre',
      'number.integer': 'trajet_id doit être un entier',
      'number.positive': 'trajet_id doit être positif',
    }),
}).unknown(false);

export { getTraceGpsSchema };