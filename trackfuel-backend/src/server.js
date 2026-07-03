// server.js → FULL ES MODULE
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import errorHandler from './middleware/errorHandler.js';
import 'dotenv/config';
import fs from 'fs';
import { initDb } from './config/initDb.js';


const app = express();
const PORT = Number(process.env.PORT || 8086);

import affectationRoutes from './routes/affectation.routes.js';
import vehiculesRoutes from './routes/vehicules.routes.js';
import pleinsRoutes from './routes/pleins.routes.js';
import alertesRoutes from './routes/alertes.routes.js';
import correctionsRoutes from './routes/corrections.routes.js';
import usersRoutes from './routes/users.routes.js';
import sitesRoutes from './routes/sites.routes.js';
import geofencesRoutes from './routes/geofences.routes.js';
import trajetsRoutes from './routes/trajets.routes.js';
import pleinExifRoutes from './routes/pleinExif.routes.js';
import pleinOcrDataRoutes from './routes/pleinOcrData.routes.js';
import parametresRoutes from './routes/parametres.routes.js';
import traceGpsRoutes from './routes/traceGps.routes.js';
import niveauCarburantRouter from './routes/niveauCarburant.routes.js';
import importRoutes from './routes/import.routes.js';
import modulesRoutes from './routes/modules.routes.js';
import chauffeursRoutes from './routes/chauffeurs.routes.js';
import missionsRoutes from './routes/missions.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import planningRoutes from './routes/planning.routes.js';
import budgetsRoutes from './routes/budgets.routes.js';
import stockRoutes from './routes/stock.routes.js';
import rapportsRoutes from './routes/rapports.routes.js';
import bootstrapRoutes, { bootstrapAdmin } from './routes/bootstrap.routes.js';

const corsOrigins = (process.env.CORS_ORIGINS || 'https://trackfuel360.com,http://localhost:8087,http://92.112.181.198:8087')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Sécurité et logs
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Leaflet marche direct
  })
);

app.use(cors({ origin: corsOrigins }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('OK it works dude!');
});

app.get('/bootstrap', async (req, res, next) => {
  try {
    const credentials = await bootstrapAdmin();

    if (!credentials) {
      return res.status(404).send('Not found');
    }

    const payload = JSON.stringify(credentials).replace(/</g, '\\u003c');
    res.type('html').send(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Bootstrap TrackFuel360</title>
  </head>
  <body>
    <script>
      const credentials = ${payload};
      console.info("Compte admin TrackFuel360 cree");
      console.info("Email:", credentials.email);
      console.info("Mot de passe:", credentials.password);
    </script>
  </body>
</html>`);
  } catch (error) {
    next(error);
  }
});

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const uploadDir = path.join(uploadRoot, 'pleins');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Dossier uploads statique
app.use('/uploads', express.static(uploadRoot));

// Routes API
app.use('/api/affectations', affectationRoutes);
app.use('/api/vehicules', vehiculesRoutes);
app.use('/api/pleins', pleinsRoutes);
app.use('/api/alertes', alertesRoutes);
app.use('/api/corrections', correctionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/geofences', geofencesRoutes);
app.use('/api/trajets', trajetsRoutes);
app.use('/api/plein-exif', pleinExifRoutes);
app.use('/api/plein-ocr', pleinOcrDataRoutes);
app.use('/api/parametres', parametresRoutes);
app.use('/api/trace-gps', traceGpsRoutes);
app.use('/api/niveau-carbu', niveauCarburantRouter);
app.use('/api', importRoutes);
app.use('/api/modules', modulesRoutes);
app.use('/api/chauffeurs', chauffeursRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/rapports', rapportsRoutes);
app.use('/api/bootstrap', bootstrapRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Erreurs
app.use((req, res) => res.status(404).json({ error: 'Route non trouvée' }));
app.use(errorHandler);

// Lancement
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur TrackFuel360 sur http://localhost:${PORT}`);
  });
});
