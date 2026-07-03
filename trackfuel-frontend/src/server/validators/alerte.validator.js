/**
 * Schémas de validation pour les alertes
 */

const Joi = require('joi');

const createAlerteSchema = Joi.object({
  vehicule_id: Joi.string().required(),
  type: Joi.string().valid(
    'surconsommation',
    'plein_hors_zone',
    'temps_immobilisation',
    'odometre_incoherent',
    'niveau_bas',
    'trajet_suspect'
  ).required(),
  titre: Joi.string().required().max(200),
  description: Joi.string().required(),
  score: Joi.number().min(0).max(100).required(),
  chauffeur_id: Joi.string().allow(null),
  deviation_percent: Joi.number().allow(null),
  litres_manquants: Joi.number().allow(null),
  severity: Joi.string().valid('low', 'medium', 'high').default('medium')
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('new', 'in_progress', 'resolved', 'dismissed').required(),
  justification: Joi.string().max(500).allow(null, ''),
  resolved_by: Joi.string().allow(null)
});

module.exports = {
  createAlerteSchema,
  updateStatusSchema
};
