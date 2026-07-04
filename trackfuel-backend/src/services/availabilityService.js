const ACTIVE_MISSION_STATUSES = ['validee', 'en_cours'];
const ACTIVE_RESERVATION_STATUSES = ['demandee', 'confirmee'];
const ACTIVE_MAINTENANCE_STATUSES = ['en_cours'];

const toMysqlDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
  return String(value).slice(0, 19).replace('T', ' ');
};

const maxDateTime = (values) => {
  const timestamps = values
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
};

const mapRange = (row, type) => ({
  type,
  id: row.id,
  vehicule_id: row.vehicule_id,
  chauffeur_id: row.chauffeur_id,
  date_debut: row.date_debut || row.date_depart,
  date_fin: row.date_fin || row.date_retour_prevue || row.date_depart,
  libelle: row.libelle || row.destination || row.motif || (type === 'mission' ? 'Mission' : 'Affectation'),
});

export const VEHICLE_UNAVAILABLE_CODE = 'VEHICLE_UNAVAILABLE';

export const getVehicleUnavailability = async (connection, vehiculeId) => {
  if (!vehiculeId) return null;

  const [vehicles] = await connection.execute(
    `SELECT id, actif
     FROM vehicules
     WHERE id = ?`,
    [vehiculeId]
  );

  if (!vehicles.length) {
    return { code: 'VEHICLE_NOT_FOUND', message: 'Véhicule introuvable' };
  }

  if (!vehicles[0].actif) {
    return {
      code: VEHICLE_UNAVAILABLE_CODE,
      reason: 'inactif',
      message: 'Le véhicule est hors service.',
    };
  }

  const placeholders = ACTIVE_MAINTENANCE_STATUSES.map(() => '?').join(', ');
  const [maintenanceRows] = await connection.execute(
    `SELECT id, type, description, date_prevue, statut
     FROM maintenance_interventions
     WHERE vehicule_id = ?
       AND statut IN (${placeholders})
     ORDER BY date_prevue ASC, id DESC
     LIMIT 1`,
    [vehiculeId, ...ACTIVE_MAINTENANCE_STATUSES]
  );

  if (maintenanceRows.length > 0) {
    return {
      code: VEHICLE_UNAVAILABLE_CODE,
      reason: 'maintenance_en_cours',
      message: 'Le véhicule est en maintenance. Aucun plein, trajet, mission ou réservation ne peut être créé.',
      maintenance: maintenanceRows[0],
    };
  }

  return null;
};

export const buildVehicleUnavailableResponse = (unavailability) => ({
  error: unavailability?.message || 'Le véhicule est indisponible.',
  code: unavailability?.code || VEHICLE_UNAVAILABLE_CODE,
  reason: unavailability?.reason,
  maintenance: unavailability?.maintenance,
});

export const getDriverEligibility = async (connection, chauffeurId) => {
  if (!chauffeurId) return { code: 'DRIVER_NOT_FOUND', message: 'Conducteur introuvable' };

  const [rows] = await connection.execute(
    `SELECT u.id, u.role, u.nom, u.prenom, u.matricule,
            dp.statut AS profile_statut,
            permis.expire_le AS permis_expire_le,
            visite.expire_le AS visite_medicale_expire_le
     FROM users u
     LEFT JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN documents_administratifs permis ON permis.id = (
       SELECT d.id
       FROM documents_administratifs d
       WHERE d.type = 'permis' AND d.chauffeur_id = u.id
       ORDER BY d.expire_le DESC, d.id DESC
       LIMIT 1
     )
     LEFT JOIN documents_administratifs visite ON visite.id = (
       SELECT d.id
       FROM documents_administratifs d
       WHERE d.type = 'visite_medicale' AND d.chauffeur_id = u.id
       ORDER BY d.expire_le DESC, d.id DESC
       LIMIT 1
     )
     WHERE u.id = ?
     LIMIT 1`,
    [chauffeurId]
  );

  if (!rows.length) {
    return { code: 'DRIVER_NOT_FOUND', message: 'Conducteur introuvable' };
  }

  const driver = rows[0];
  if (driver.role !== 'conducteur') {
    return {
      code: 'DRIVER_NOT_ASSIGNABLE',
      reason: 'role_invalid',
      message: "L'utilisateur sélectionné n'a pas le rôle Conducteur.",
      driver,
    };
  }

  if (driver.profile_statut !== 'actif') {
    return {
      code: 'DRIVER_NOT_ASSIGNABLE',
      reason: driver.profile_statut ? 'profile_inactive' : 'profile_missing',
      message: driver.profile_statut
        ? `Le profil conducteur est ${driver.profile_statut}.`
        : 'Le profil conducteur actif est requis.',
      driver,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiredDocuments = [];
  if (driver.permis_expire_le && new Date(driver.permis_expire_le) < today) expiredDocuments.push('permis');
  if (driver.visite_medicale_expire_le && new Date(driver.visite_medicale_expire_le) < today) expiredDocuments.push('visite_medicale');

  if (expiredDocuments.length > 0) {
    return {
      code: 'DOCUMENT_EXPIRED',
      reason: 'driver_document_expired',
      message: `Document conducteur expiré: ${expiredDocuments.join(', ')}.`,
      driver,
      expiredDocuments,
    };
  }

  return null;
};

export const buildDriverIneligibleResponse = (eligibility) => ({
  error: eligibility?.message || 'Conducteur non assignable.',
  code: eligibility?.code || 'DRIVER_NOT_ASSIGNABLE',
  reason: eligibility?.reason,
  driver: eligibility?.driver,
  expiredDocuments: eligibility?.expiredDocuments,
});

export const getAssignmentCoverage = async (
  connection,
  {
    chauffeurId,
    vehiculeId,
    start,
    end = null,
  }
) => {
  const startDate = toMysqlDateTime(start);
  const endDate = toMysqlDateTime(end || start);

  const [rows] = await connection.execute(
    `SELECT a.*, om.destination AS mission_destination, om.statut AS mission_statut
     FROM affectations a
     LEFT JOIN ordres_mission om ON om.id = a.mission_id
     WHERE a.chauffeur_id = ?
       AND a.vehicule_id = ?
       AND a.date_debut <= ?
       AND a.date_fin >= ?
     ORDER BY a.date_debut DESC
     LIMIT 1`,
    [chauffeurId, vehiculeId, startDate, endDate]
  );

  if (rows.length > 0) return null;

  return {
    code: 'DRIVER_NOT_ASSIGNED_TO_VEHICLE',
    message: 'Ce conducteur n’est pas affecté à ce véhicule sur la période demandée.',
    requested_start: startDate,
    requested_end: endDate,
    chauffeur_id: chauffeurId,
    vehicule_id: vehiculeId,
  };
};

export const buildAssignmentCoverageResponse = (coverage) => ({
  error: coverage?.message || 'Conducteur non affecté au véhicule.',
  code: coverage?.code || 'DRIVER_NOT_ASSIGNED_TO_VEHICLE',
  requested_start: coverage?.requested_start,
  requested_end: coverage?.requested_end,
  chauffeur_id: coverage?.chauffeur_id,
  vehicule_id: coverage?.vehicule_id,
});

export const getAvailabilityConflicts = async (
  connection,
  {
    chauffeurId,
    vehiculeId,
    start,
    end,
    excludeAffectationId = null,
    excludeMissionId = null,
    excludeTripId = null,
    includeAffectations = true,
    includeMissions = true,
    includeReservations = true,
    includeTrips = true,
  }
) => {
  const startDate = toMysqlDateTime(start);
  const endDate = toMysqlDateTime(end);

  const chauffeurConflicts = [];
  const vehiculeConflicts = [];

  const affectationParams = [endDate, startDate];
  let affectationExclude = '';
  if (excludeAffectationId) {
    affectationExclude = 'AND id <> ?';
    affectationParams.push(excludeAffectationId);
  }

  if (includeAffectations && chauffeurId) {
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, date_debut, date_fin, 'Affectation' AS libelle
       FROM affectations
       WHERE chauffeur_id = ?
         AND (source <> 'mission' OR mission_id IS NULL)
         AND date_debut < ?
         AND date_fin > ?
         ${affectationExclude}
       ORDER BY date_debut ASC`,
      [chauffeurId, ...affectationParams]
    );
    chauffeurConflicts.push(...rows.map((row) => mapRange(row, 'affectation')));
  }

  if (includeAffectations && vehiculeId) {
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, date_debut, date_fin, 'Affectation' AS libelle
       FROM affectations
       WHERE vehicule_id = ?
         AND (source <> 'mission' OR mission_id IS NULL)
         AND date_debut < ?
         AND date_fin > ?
         ${affectationExclude}
       ORDER BY date_debut ASC`,
      [vehiculeId, ...affectationParams]
    );
    vehiculeConflicts.push(...rows.map((row) => mapRange(row, 'affectation')));
  }

  const missionExcludeSql = excludeMissionId ? 'AND id <> ?' : '';
  const missionStatusPlaceholders = ACTIVE_MISSION_STATUSES.map(() => '?').join(', ');

  if (includeMissions && chauffeurId) {
    const params = [chauffeurId, ...ACTIVE_MISSION_STATUSES, endDate, startDate];
    if (excludeMissionId) params.push(excludeMissionId);
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, destination, motif, date_depart, COALESCE(date_retour_prevue, date_depart) AS date_retour_prevue
       FROM ordres_mission
       WHERE chauffeur_id = ?
         AND statut IN (${missionStatusPlaceholders})
         AND date_depart < ?
         AND COALESCE(date_retour_prevue, date_depart) > ?
         ${missionExcludeSql}
       ORDER BY date_depart ASC`,
      params
    );
    chauffeurConflicts.push(...rows.map((row) => mapRange(row, 'mission')));
  }

  if (includeMissions && vehiculeId) {
    const params = [vehiculeId, ...ACTIVE_MISSION_STATUSES, endDate, startDate];
    if (excludeMissionId) params.push(excludeMissionId);
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, destination, motif, date_depart, COALESCE(date_retour_prevue, date_depart) AS date_retour_prevue
       FROM ordres_mission
       WHERE vehicule_id = ?
         AND statut IN (${missionStatusPlaceholders})
         AND date_depart < ?
         AND COALESCE(date_retour_prevue, date_depart) > ?
         ${missionExcludeSql}
       ORDER BY date_depart ASC`,
      params
    );
    vehiculeConflicts.push(...rows.map((row) => mapRange(row, 'mission')));
  }

  const reservationStatusPlaceholders = ACTIVE_RESERVATION_STATUSES.map(() => '?').join(', ');

  if (includeReservations && chauffeurId) {
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, motif AS libelle, date_debut, date_fin
       FROM vehicle_reservations
       WHERE chauffeur_id = ?
         AND statut IN (${reservationStatusPlaceholders})
         AND date_debut < ?
         AND date_fin > ?
       ORDER BY date_debut ASC`,
      [chauffeurId, ...ACTIVE_RESERVATION_STATUSES, endDate, startDate]
    );
    chauffeurConflicts.push(...rows.map((row) => mapRange(row, 'reservation')));
  }

  if (includeReservations && vehiculeId) {
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, motif AS libelle, date_debut, date_fin
       FROM vehicle_reservations
       WHERE vehicule_id = ?
         AND statut IN (${reservationStatusPlaceholders})
         AND date_debut < ?
         AND date_fin > ?
       ORDER BY date_debut ASC`,
      [vehiculeId, ...ACTIVE_RESERVATION_STATUSES, endDate, startDate]
    );
    vehiculeConflicts.push(...rows.map((row) => mapRange(row, 'reservation')));
  }

  const tripExcludeSql = excludeTripId ? 'AND id <> ?' : '';

  if (includeTrips && chauffeurId) {
    const params = [chauffeurId, endDate, startDate];
    if (excludeTripId) params.push(excludeTripId);
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, date_debut, date_fin, 'Trajet' AS libelle
       FROM trips
       WHERE chauffeur_id = ?
         AND date_debut < ?
         AND date_fin > ?
         ${tripExcludeSql}
       ORDER BY date_debut ASC`,
      params
    );
    chauffeurConflicts.push(...rows.map((row) => mapRange(row, 'trajet')));
  }

  if (includeTrips && vehiculeId) {
    const params = [vehiculeId, endDate, startDate];
    if (excludeTripId) params.push(excludeTripId);
    const [rows] = await connection.execute(
      `SELECT id, vehicule_id, chauffeur_id, date_debut, date_fin, 'Trajet' AS libelle
       FROM trips
       WHERE vehicule_id = ?
         AND date_debut < ?
         AND date_fin > ?
         ${tripExcludeSql}
       ORDER BY date_debut ASC`,
      params
    );
    vehiculeConflicts.push(...rows.map((row) => mapRange(row, 'trajet')));
  }

  if (vehiculeId) {
    const unavailability = await getVehicleUnavailability(connection, vehiculeId);
    if (unavailability?.code === VEHICLE_UNAVAILABLE_CODE) {
      vehiculeConflicts.push({
        type: unavailability.reason,
        id: unavailability.maintenance?.id || vehiculeId,
        vehicule_id: vehiculeId,
        chauffeur_id: null,
        date_debut: startDate,
        date_fin: endDate,
        libelle: unavailability.reason === 'maintenance_en_cours' ? 'Maintenance en cours' : 'Véhicule hors service',
      });
    }
  }

  const allConflicts = [...chauffeurConflicts, ...vehiculeConflicts];

  return {
    hasConflict: allConflicts.length > 0,
    requested_start: startDate,
    requested_end: endDate,
    chauffeur: {
      next_free_start: maxDateTime(chauffeurConflicts.map((item) => item.date_fin)),
      ranges: chauffeurConflicts,
    },
    vehicule: {
      next_free_start: maxDateTime(vehiculeConflicts.map((item) => item.date_fin)),
      ranges: vehiculeConflicts,
    },
  };
};

export const buildConflictResponse = (availability) => ({
  error: 'Conflit de disponibilité',
  code: 'AVAILABILITY_CONFLICT',
  message: 'Le conducteur ou le véhicule est déjà occupé sur cette période.',
  availability,
});

export { toMysqlDateTime };
