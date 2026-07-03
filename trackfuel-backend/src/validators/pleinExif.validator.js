/**
 * Schémas de validation pour les métadonnées EXIF des pleins
 */

import Joi from 'joi';

const createPleinExifSchema = Joi.object({
  plein_id: Joi.number().integer().positive().required(),
  date: Joi.date().iso().required(),
  heure: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'L\'heure doit être au format HH:MM:SS',
    }),
  latitude: Joi.number().min(-90).max(90).precision(8).required(),
  longitude: Joi.number().min(-180).max(180).precision(8).required(),
  modele_telephone: Joi.string().max(100).required().trim(),
});

const updatePleinExifSchema = Joi.object({
  date: Joi.date().iso(),
  heure: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).messages({
    'string.pattern.base': 'L\'heure doit être au format HH:MM:SS',
  }),
  latitude: Joi.number().min(-90).max(90).precision(8),
  longitude: Joi.number().min(-180).max(180).precision(8),
  modele_telephone: Joi.string().max(100).trim(),
}).min(1);

export {
  createPleinExifSchema,
  updatePleinExifSchema,
};