/**
 * Schémas de validation pour les véhicules
 */

const Joi = require('joi');

const createVehiculeSchema = Joi.object({
  immatriculation: Joi.string().required().max(20),
  marque: Joi.string().required().max(50),
  modele: Joi.string().required().max(50),
  annee: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required(),
  type_carburant: Joi.string().valid('essence', 'diesel', 'hybride', 'electrique', 'gpl').required(),
  capacite_reservoir: Joi.number().positive().required(),
  consommation_nominale: Joi.number().positive().required(),
  odometre_actuel: Joi.number().min(0).required(),
  site_id: Joi.string().allow(null),
  statut: Joi.string().valid('actif', 'maintenance', 'inactif').default('actif')
});

const updateVehiculeSchema = Joi.object({
  immatriculation: Joi.string().max(20),
  marque: Joi.string().max(50),
  modele: Joi.string().max(50),
  annee: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1),
  type_carburant: Joi.string().valid('essence', 'diesel', 'hybride', 'electrique', 'gpl'),
  capacite_reservoir: Joi.number().positive(),
  consommation_nominale: Joi.number().positive(),
  odometre_actuel: Joi.number().min(0),
  site_id: Joi.string().allow(null),
  statut: Joi.string().valid('actif', 'maintenance', 'inactif')
}).min(1);

module.exports = {
  createVehiculeSchema,
  updateVehiculeSchema
};
