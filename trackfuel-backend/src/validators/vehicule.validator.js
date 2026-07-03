/**
 * Schémas de validation pour les véhicules
 */

import Joi from 'joi';

const createVehiculeSchema = Joi.object({
  immatriculation: Joi.string().trim().required().max(20).uppercase(),
  marque: Joi.string().trim().required().max(50),
  modele: Joi.string().trim().required().max(50),
  type: Joi.string()
    .valid('essence', 'diesel', 'hybride', 'gpl')
    .required(),
  capacite_reservoir: Joi.number().positive().precision(2).required(),
  consommation_nominale: Joi.number().positive().precision(2).required(),
  carburant_initial: Joi.number().min(0).precision(2).required(),
  kilometrage_initial: Joi.number()
    .min(0)
    .precision(2)
    .required()
    .default(0)
    .description('Kilométrage au compteur lors de la création du véhicule'),
  actif: Joi.boolean().default(true),
  site_id: Joi.number().integer().allow(null),
});

const updateVehiculeSchema = Joi.object({
  marque: Joi.string().trim().max(50),
  modele: Joi.string().trim().max(50),
  type: Joi.string().valid('essence', 'diesel', 'hybride', 'gpl'),
  capacite_reservoir: Joi.number().positive().precision(2),
  consommation_nominale: Joi.number().positive().precision(2),
  carburant_initial: Joi.number().min(0).precision(2),
  kilometrage_initial: Joi.number().min(0).precision(2), // Autorisé en mise à jour
  actif: Joi.boolean(),
  site_id: Joi.number().integer().allow(null),
})
  .min(1)
  .messages({
    'object.min': 'Au moins un champ doit être fourni',
  });
  
export { createVehiculeSchema, updateVehiculeSchema };
