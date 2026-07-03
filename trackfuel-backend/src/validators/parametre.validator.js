/**
 * Schémas de validation pour les paramètres
 */

import Joi from 'joi';

const updateParametreSchema = Joi.object({
  valeur: Joi.number().integer().required(),
}).min(1);

const resetParametresSchema = Joi.object({})
  .unknown(false)        // on garde : pas de champ surprise
  .options({ stripUnknown: true }); // mais on autorise {} vide
  
const bulkUpdateParametresSchema = Joi.object({
  parametres: Joi.array()
    .min(1)
    .items(
      Joi.object({
        id: Joi.string().required(),
        valeur: Joi.number().integer().required(),
      })
    )
    .required(),
}).required();

export {
  updateParametreSchema,
  resetParametresSchema,
  bulkUpdateParametresSchema,
};