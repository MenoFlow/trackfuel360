const ACTIVE_MISSION_STATUSES = ['demande', 'validee', 'en_cours'];

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

export const getAvailabilityConflicts = async (
  connection,
  {
    chauffeurId,
    vehiculeId,
    start,
    end,
    excludeAffectationId = null,
    excludeMissionId = null,
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

  if (chauffeurId) {
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

  if (vehiculeId) {
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

  if (chauffeurId) {
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

  if (vehiculeId) {
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
  message: 'Le chauffeur ou le véhicule est déjà occupé sur cette période.',
  availability,
});

export { toMysqlDateTime };
