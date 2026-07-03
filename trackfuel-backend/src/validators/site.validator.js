/**
 * Schémas de validation pour les sites
 */

import Joi from 'joi';

const createSiteSchema = Joi.object({
  nom: Joi.string().required().max(100),
  ville: Joi.string().required().max(100),
  pays: Joi.string().required().max(100)
});

const updateSiteSchema = Joi.object({
  nom: Joi.string().max(100),
  ville: Joi.string().max(100),
  pays: Joi.string().max(100)
}).min(1);

export {
  createSiteSchema,
  updateSiteSchema
};
