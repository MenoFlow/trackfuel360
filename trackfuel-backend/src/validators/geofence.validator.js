import Joi from 'joi';

const MAX_RAYON_TERRE_METRES = 6371000;

const createGeofenceSchema = Joi.object({
  nom: Joi.string().required().max(255),
  type: Joi.string().valid('depot', 'station', 'zone_risque').required(),
  lat: Joi.number().min(-90).max(90).precision(10).required(),
  lon: Joi.number().min(-180).max(180).precision(10).required(),
  rayon_metres: Joi.number().min(0).max(MAX_RAYON_TERRE_METRES).precision(10).required()
});

const updateGeofenceSchema = Joi.object({
  nom: Joi.string().max(255),
  type: Joi.string().valid('depot', 'station', 'zone_risque'),
  lat: Joi.number().min(-90).max(90).precision(10),
  lon: Joi.number().min(-180).max(180).precision(10),
  rayon_metres: Joi.number().min(0).max(MAX_RAYON_TERRE_METRES).precision(10)
}).min(1);

const checkPointSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).precision(6).required(),
  longitude: Joi.number().min(-180).max(180).precision(6).required()
});

export { createGeofenceSchema, updateGeofenceSchema, checkPointSchema };