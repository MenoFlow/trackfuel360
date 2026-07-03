/**
 * Serveur Express principal pour TrackFuel360
 * Point d'entrée de l'API backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8086;

// Middlewares de sécurité et logging
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import des routes
const vehiculesRoutes = require('./routes/vehicules.routes');
const pleinsRoutes = require('./routes/pleins.routes');
const alertesRoutes = require('./routes/alertes.routes');
const correctionsRoutes = require('./routes/corrections.routes');
const usersRoutes = require('./routes/users.routes');
const sitesRoutes = require('./routes/sites.routes');
const geofencesRoutes = require('./routes/geofences.routes');
const trajetsRoutes = require('./routes/trajets.routes');

// Enregistrement des routes
app.use('/api/vehicules', vehiculesRoutes);
app.use('/api/pleins', pleinsRoutes);
app.use('/api/alertes', alertesRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/geofences', geofencesRoutes);
app.use('/api/trajets', trajetsRoutes);

// Route de santé
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion globale des erreurs
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur TrackFuel360 démarré sur le port ${PORT}`);
  console.log(`📍 API accessible sur http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
