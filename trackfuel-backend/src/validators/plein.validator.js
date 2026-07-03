/**
 * Schémas de validation pour les pleins
 */

import Joi from 'joi';

const createPleinSchema = Joi.object({
  vehicule_id: Joi.number().integer().positive().required(),
  chauffeur_id: Joi.number().integer().positive().required(),
  date: Joi.date().iso().required(),
  litres: Joi.number().positive().precision(2).required(),
  prix_unitaire: Joi.number().positive().precision(4).required(),
  odometre: Joi.number().integer().positive().required(),
  station: Joi.string().max(255).required(),
  type_saisie: Joi.string().valid('manuelle', 'auto').required(),
  photo_bon: Joi.string().max(255).optional().allow(''),
  latitude: Joi.number().min(-90).max(90).precision(8).optional(),
  longitude: Joi.number().min(-180).max(180).precision(8).optional(),
});

const updatePleinSchema = Joi.object({
  vehicule_id: Joi.number().integer().positive(),
  chauffeur_id: Joi.number().integer().positive(),
  date: Joi.date().iso(),
  litres: Joi.number().positive().precision(2),
  prix_unitaire: Joi.number().positive().precision(4),
  odometre: Joi.number().integer().positive(),
  station: Joi.string().max(255),
  type_saisie: Joi.string().valid('manuelle', 'auto'),
  photo_bon: Joi.string().max(255).allow(''),
  latitude: Joi.number().min(-90).max(90).precision(8),
  longitude: Joi.number().min(-180).max(180).precision(8),
}).min(1);

export {
  createPleinSchema,
  updatePleinSchema
};