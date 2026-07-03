/**
 * Routes d'importation de données TrackFuel360
 * Endpoint POST /import pour recevoir et traiter les fichiers Excel
 */

import db from '../config/database.js';
import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import {
  tableConfigByType,
  parseExcelFile,
  insertEntitiesInOrder,
} from '../services/importService.js';

const router = express.Router();

// Configuration de multer pour upload de fichiers en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Accepter uniquement les fichiers Excel
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier invalide. Seuls les fichiers Excel (.xlsx, .xls) sont acceptés.'));
    }
  },
});

/**
 * POST /import
 * Reçoit un fichier Excel, le parse, valide et insère les données en base
 */
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    // Vérifier qu'un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni',
      });
    }

    // Parser le fichier Excel
    let parsedData;
    try {
      parsedData = parseExcelFile(req.file.buffer);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Erreur lors de la lecture du fichier: ${error.message}`,
      });
    }

    // Vérifier que le fichier contient des données
    const totalRows = Object.values(parsedData).reduce((sum, rows) => sum + rows.length, 0);
    if (totalRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le fichier est vide ou ne contient pas de données valides',
      });
    }

    // Récupérer l'instance de base de données MySQL
    // const db = req.app.get('db'); // Instance mysql2 configurée dans app.js

    // Insérer les données dans l'ordre
    const result = await insertEntitiesInOrder(db, parsedData);
    // Réponse selon le résultat
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `${result.inserted} ligne(s) importée(s) avec succès`,
        inserted: result.inserted,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Import partiel: ${result.inserted} ligne(s) importée(s), ${result.errors.length} erreur(s)`,
        inserted: result.inserted,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'import',
      error: error.message,
    });
  }
});

/**
 * GET /import/template
 * Retourne un fichier Excel template vierge pour l'import
 */
router.get('/import/template', (req, res) => {
  const workbook = XLSX.utils.book_new();
  const now = new Date();
  const dateDebut = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const dateFin = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  const sampleRows = {
    Client: [{ id: 1, nom: 'Client demonstration', configuration: 'complete' }],
    Module: [
      { code: 'fuel', label: 'Carburant', phase: 'MVP', enabled_by_default: true },
      { code: 'fleet', label: 'Parc roulant', phase: 'MVP', enabled_by_default: true },
    ],
    ClientModule: [{ client_id: 1, module_code: 'fuel', enabled: true }],
    AppConfiguration: [{ key: 'installation_mode', value: 'complete' }],
    RoleModulePermission: [{ role: 'admin', module_code: 'fuel', can_view: true, can_manage: true }],
    Site: [
      { id: 1, nom: 'Site Antananarivo', ville: 'Antananarivo', pays: 'Madagascar' },
      { id: 2, nom: 'Site Toamasina', ville: 'Toamasina', pays: 'Madagascar' },
    ],
    User: [
      { id: 1, email: 'admin@trackfuel.mg', matricule: 'ADM001', nom: 'Admin', prenom: 'Principal', role: 'admin', site_id: 1, password_hash: 'password_hash' },
      { id: 2, email: 'jean.rakoto@trackfuel.mg', matricule: 'DRV001', nom: 'Rakoto', prenom: 'Jean', role: 'driver', site_id: 1, password_hash: 'password_hash' },
    ],
    DriverProfile: [{ user_id: 2, telephone: '+261 34 00 000 01', permis_numero: 'P-DRV001', permis_categorie: 'B,C', statut: 'actif' }],
    Vehicule: [{ id: 1, immatriculation: '1234 TAD', marque: 'Toyota', modele: 'Hilux', type: 'diesel', capacite_reservoir: 80, consommation_nominale: 10.5, carburant_initial: 40, kilometrage_initial: 125000, actif: true, site_id: 1 }],
    Geofence: [{ id: 1, nom: 'Depot Antananarivo', type: 'depot', lat: -18.8792, lon: 47.5079, rayon_metres: 500 }],
    Affectation: [{ id: 1, vehicule_id: 1, chauffeur_id: 2, date_debut: dateDebut, date_fin: dateFin }],
    Trip: [{ id: 1, vehicule_id: 1, chauffeur_id: 2, date_debut: dateDebut, date_fin: dateFin, distance_km: 125.4, type_saisie: 'manuelle' }],
    TraceGps: [{ id: 1, trajet_id: 1, sequence: 1, latitude: -18.8792, longitude: 47.5079, timestamp: dateDebut }],
    Plein: [{ id: 1, vehicule_id: 1, chauffeur_id: 2, date: dateDebut, litres: 45, prix_unitaire: 6000, odometre: 125120, station: 'Station partenaire', type_saisie: 'manuelle', latitude: -18.885, longitude: 47.52 }],
    BonCarburantScanne: [{ id: 1, plein_id: 1, station: 'Station partenaire', date_bon: dateDebut.slice(0, 10), litres: 45, prix_total: 270000, chauffeur_matricule: 'DRV001', vehicule_immatriculation: '1234 TAD', ocr_confidence: 96.5 }],
    PleinExifMetadata: [{ id: 1, plein_id: 1, date: dateDebut.slice(0, 10), heure: '08:30:00', latitude: -18.885, longitude: 47.52, modele_telephone: 'Android' }],
    NiveauCarburant: [{ id: 1, vehicule_id: 1, timestamp: dateDebut, niveau: 78, type: 'apres_plein', plein_id: 1 }],
    Parametre: [{ id: 'seuil_surconsommation_pct', label: 'Seuil de surconsommation', description: 'Pourcentage au-dessus de la consommation nominale', valeur: 30, unite: '%', min: 0, max: 100 }],
    Correction: [{ id: 1, table: 'pleins', record_id: 1, champ: 'litres', old_value: '40', new_value: '45', status: 'pending', comment: 'Correction exemple', requested_by: 2, requested_at: dateDebut }],
    OrdreMission: [{ id: 1, vehicule_id: 1, chauffeur_id: 2, destination: 'Toamasina', motif: 'Livraison matériel', statut: 'demande', date_depart: dateDebut, date_retour_prevue: dateFin }],
    MaintenanceIntervention: [{ id: 1, vehicule_id: 1, type: 'vidange', description: 'Vidange periodique', date_prevue: dateFin.slice(0, 10), cout: 250000, prestataire: 'Garage Central', statut: 'planifie' }],
    DocumentAdministratif: [{ id: 1, type: 'permis', chauffeur_id: 2, reference: 'P-DRV001', delivre_le: dateDebut.slice(0, 10), expire_le: dateFin.slice(0, 10), rappel_jours: 60 }],
    VehicleReservation: [{ id: 1, vehicule_id: 1, chauffeur_id: 2, mission_id: 1, motif: 'Mission Toamasina', date_debut: dateDebut, date_fin: dateFin, statut: 'confirmee', notes: 'Reservation exemple' }],
    BudgetCout: [{ id: 1, module_type: 'carburant', scope_type: 'vehicule', site_id: 1, vehicule_id: 1, direction: 'Logistique', libelle: 'Budget carburant Hilux', periode_debut: dateDebut.slice(0, 10), periode_fin: dateFin.slice(0, 10), montant_prevu: 1500000, montant_reel: 540000 }],
    StockPiece: [{ id: 1, reference: 'FLT-HLX-001', designation: 'Filtre huile Hilux', categorie: 'Filtres', quantite: 12, seuil_critique: 3, cout_unitaire: 35000, fournisseur: 'Garage Central' }],
    PieceSortie: [{ id: 1, piece_id: 1, vehicule_id: 1, maintenance_id: 1, quantite: 1, date_sortie: dateDebut, commentaire: 'Sortie pour vidange' }],
    RapportGenere: [{ id: 'rapport_demo_1', type: 'kpi_global', titre: 'Rapport demonstration', utilisateur_id: 1, utilisateur_nom: 'Admin Principal', format_prefere: 'pdf', rapport_json: '{"metadata":{"id":"rapport_demo_1","type":"kpi_global","titre":"Rapport demonstration","description":"Exemple","date_generation":"2026-07-04T00:00:00.000Z","utilisateur_id":1,"utilisateur_nom":"Admin Principal","nb_lignes":0},"donnees":[]}' }],
    RapportShareToken: [{ token: 'demo_token_rapport_1', rapport_id: 'rapport_demo_1', format_export: 'pdf', expires_at: dateFin }],
  };

  const sheets = Object.fromEntries(
    Object.entries(tableConfigByType).map(([type, config]) => [
      type,
      [
        config.columns,
        ...(sampleRows[type] || []).map(row => config.columns.map(column => row[column] ?? '')),
      ],
    ])
  );

  sheets.Instructions = [
      ['Instructions d import'],
      ['Respecter l ordre des feuilles propose dans le classeur.'],
      ['Toutes les tables applicatives connues sont presentes.'],
      ['Supprimer ou modifier les lignes d exemple avant un import reel.'],
  ];

  Object.entries(sheets).forEach(([name, rows]) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = rows[0].map((_, index) => ({
      wch: Math.min(Math.max(...rows.map(row => String(row[index] ?? '').length), 12) + 2, 42),
    }));
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
  res.setHeader('Content-Disposition', 'attachment; filename=trackfuel_import_test.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

export default router;
