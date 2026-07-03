import Joi from 'joi';

export const getNiveauxCarburantSchema = Joi.object({
  vehicule_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'vehicule_id doit être un nombre',
      'number.integer': 'vehicule_id doit être un entier',
      'number.positive': 'vehicule_id doit être positif',
    }),
}).unknown(false); // strict mode