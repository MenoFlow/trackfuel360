/**
 * Schémas de validation pour les pleins de carburant
 */

const Joi = require('joi');

const createPleinSchema = Joi.object({
  vehicule_id: Joi.string().required(),
  chauffeur_id: Joi.string().required(),
  date: Joi.date().iso().required(),
  litres: Joi.number().positive().required(),
  prix_unitaire: Joi.number().positive().required(),
  odometre: Joi.number().min(0).required(),
  station: Joi.string().max(100).allow(null, ''),
  photo_bon: Joi.string().allow(null, ''),
  type_saisie: Joi.string().valid('auto', 'manuelle').required(),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null)
});

const updatePleinSchema = Joi.object({
  vehicule_id: Joi.string(),
  chauffeur_id: Joi.string(),
  date: Joi.date().iso(),
  litres: Joi.number().positive(),
  prix_unitaire: Joi.number().positive(),
  odometre: Joi.number().min(0),
  station: Joi.string().max(100).allow(null, ''),
  photo_bon: Joi.string().allow(null, ''),
  type_saisie: Joi.string().valid('auto', 'manuelle'),
  latitude: Joi.number().min(-90).max(90).allow(null),
  longitude: Joi.number().min(-180).max(180).allow(null)
}).min(1);

module.exports = {
  createPleinSchema,
  updatePleinSchema
};
