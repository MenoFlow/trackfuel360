/**
 * Schémas de validation pour les trajets
 */

import Joi from 'joi';

const createTripSchema = Joi.object({
  vehicule_id: Joi.number().required().max(50),
  chauffeur_id: Joi.number().required().max(50),
  date_debut: Joi.date().iso().required(),
  date_fin: Joi.date().iso().required(),
  distance_km: Joi.number().positive().required(),
  type_saisie: Joi.string().valid('auto', 'manuelle').default('manuelle'),
  traceGps: Joi.array().items(
    Joi.object({
      trajet_id: Joi.number().required(),
      sequence: Joi.number().required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      timestamp: Joi.date().iso().required()
    })
  ).default([]) // tableau vide par défaut si non fourni
});

const updateTripSchema = Joi.object({
  vehicule_id: Joi.number().max(50),
  chauffeur_id: Joi.number().max(50),
  date_debut: Joi.date().iso(),
  date_fin: Joi.date().iso(),
  distance_km: Joi.number().positive(),
  type_saisie: Joi.string().valid('auto', 'manuelle'),
  traceGps: Joi.array().items(
    Joi.object({
      trajet_id: Joi.number(),
      sequence: Joi.number(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      timestamp: Joi.date().iso().required()
    })
  )
}).min(1); // au moins un champ requis pour PUT


export {
  createTripSchema,
  updateTripSchema
};
