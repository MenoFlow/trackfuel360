/**
 * Schémas de validation pour les geofences
 */

const Joi = require('joi');

const createGeofenceSchema = Joi.object({
  nom: Joi.string().required().max(100),
  type: Joi.string().valid('depot', 'station', 'zone_risque').required(),
  lat: Joi.number().min(-90).max(90).required(),
  lon: Joi.number().min(-180).max(180).required(),
  rayon_metres: Joi.number().positive().required(),
  site_id: Joi.string().allow(null),
  points: Joi.array().items(
    Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    })
  ).allow(null)
});

const updateGeofenceSchema = Joi.object({
  nom: Joi.string().max(100),
  type: Joi.string().valid('depot', 'station', 'zone_risque'),
  lat: Joi.number().min(-90).max(90),
  lon: Joi.number().min(-180).max(180),
  rayon_metres: Joi.number().positive(),
  site_id: Joi.string().allow(null),
  points: Joi.array().items(
    Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    })
  ).allow(null)
}).min(1);

const checkPointSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

module.exports = {
  createGeofenceSchema,
  updateGeofenceSchema,
  checkPointSchema
};
