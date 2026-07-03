import Joi from 'joi';

const createAffectationSchema = Joi.object({
  vehicule_id: Joi.number().integer().required(),
  chauffeur_id: Joi.number().integer().required(),
  date_debut: Joi.date().iso().required(),
  date_fin: Joi.date().iso().greater(Joi.ref('date_debut')).required()
});

const updateAffectationSchema = Joi.object({
  vehicule_id: Joi.number().integer(),
  chauffeur_id: Joi.number().integer(),
  date_debut: Joi.date().iso(),
  date_fin: Joi.date().iso().greater(Joi.ref('date_debut'))
}).min(1);

export {
  createAffectationSchema,
  updateAffectationSchema
};
