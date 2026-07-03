/**
 * Schémas de validation pour les utilisateurs
 */

import Joi from 'joi';

const createUserSchema = Joi.object({
  email: Joi.string().email().required().max(255),
  matricule: Joi.string().required().max(20),
  nom: Joi.string().required().max(50),
  prenom: Joi.string().required().max(50),
  role: Joi.string().valid('admin', 'manager', 'supervisor', 'auditor', 'driver').required(),
  site_id: Joi.number().allow(null),
  password: Joi.string().min(6).required()
});

const updateUserSchema = Joi.object({
  email: Joi.string().email().max(255),
  matricule: Joi.string().max(20),
  nom: Joi.string().max(50),
  prenom: Joi.string().max(50),
  role: Joi.string().valid('admin', 'manager', 'supervisor', 'auditor', 'driver').required(),
  site_id: Joi.number().allow(null),
  password: Joi.string().min(6)
}).min(1);

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export {
  createUserSchema,
  updateUserSchema,
  loginSchema
};
