import { Vehicule } from '@/types';

export const isVehicleOutOfService = (vehicule?: Pick<Vehicule, 'actif' | 'hors_service' | 'disponibilite_statut'> | null) => {
  if (!vehicule) return false;
  return vehicule.actif === false || vehicule.hors_service === true || vehicule.hors_service === 1 || vehicule.disponibilite_statut === 'maintenance_en_cours';
};

export const getVehicleStatusLabel = (vehicule?: Vehicule | null) => {
  if (!vehicule) return 'Indisponible';
  if (vehicule.actif === false || vehicule.disponibilite_statut === 'inactif') return 'Hors service';
  if (vehicule.disponibilite_statut === 'maintenance_en_cours') return 'Maintenance en cours';
  if (vehicule.prochaine_maintenance_id) return 'Maintenance planifiée';
  return 'Disponible';
};

export const getVehicleStatusBadgeVariant = (vehicule?: Vehicule | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!vehicule) return 'secondary';
  if (isVehicleOutOfService(vehicule)) return 'destructive';
  if (vehicule.prochaine_maintenance_id) return 'outline';
  return 'default';
};

export const getVehicleUnavailableReason = (vehicule?: Vehicule | null) => {
  if (!vehicule) return 'Véhicule indisponible.';
  if (vehicule.actif === false || vehicule.disponibilite_statut === 'inactif') {
    return 'Ce véhicule est hors service.';
  }
  if (vehicule.disponibilite_statut === 'maintenance_en_cours') {
    return 'Ce véhicule est en maintenance. Les pleins et trajets sont désactivés.';
  }
  return '';
};
