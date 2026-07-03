/**
 * Schémas de validation pour les trajets
 */

const Joi = require('joi');

const createTrajetSchema = Joi.object({
  vehicule_id: Joi.string().required(),
  chauffeur_id: Joi.string().required(),
  date_debut: Joi.date().iso().required(),
  date_fin: Joi.date().iso().required(),
  distance_km: Joi.number().positive().required(),
  type_saisie: Joi.string().valid('auto', 'manuelle').required(),
  points_gps: Joi.array().items(
    Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      timestamp: Joi.date().iso().required()
    })
  ).allow(null)
});

const updateTrajetSchema = Joi.object({
  vehicule_id: Joi.string(),
  chauffeur_id: Joi.string(),
  date_debut: Joi.date().iso(),
  date_fin: Joi.date().iso(),
  distance_km: Joi.number().positive(),
  type_saisie: Joi.string().valid('auto', 'manuelle')
}).min(1);

module.exports = {
  createTrajetSchema,
  updateTrajetSchema
};
