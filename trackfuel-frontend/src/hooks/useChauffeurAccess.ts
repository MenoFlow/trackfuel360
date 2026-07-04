import { useState, useEffect } from 'react';
import { Trajet, Plein, User, Vehicule } from '@/types';

export const useChauffeurAccess = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Charger l'utilisateur depuis localStorage
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.role === 'driver') user.role = 'conducteur';
        setCurrentUser(user);
      } catch (error) {
        console.error('Erreur de parsing user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    window.location.href = '/login';
  };

  const isAuthenticated = !!currentUser;
  const isDriver = currentUser?.role === 'conducteur';
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const isSupervisor = currentUser?.role === 'supervisor';
  const isAuditor = currentUser?.role === 'auditor';

const filterDataForDriver = <T extends { chauffeur_id: number; vehicule_id: number }>(
  data: T[],
  mesVehicules: Vehicule[]
): T[] => {
  if (!isDriver || !currentUser) return data;

  // On extrait les IDs des véhicules du chauffeur
  const vehiculeIds = mesVehicules?.map(v => v.id);

  return data.filter(
    item =>
      item.chauffeur_id === currentUser.id &&
      vehiculeIds?.includes(item.vehicule_id)
  );
};


  const isTodayBetween = (dateDebut: string, dateFin: string): boolean => {
    const today = new Date();
    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
  
    return today >= debut && today <= fin;
  };

  const filterVehiculesForDriver = (
    vehicules: Vehicule[],
    affectations: Array<{ vehicule_id: number; chauffeur_id: number; date_debut: string; date_fin: string }>
  ): Vehicule[] => {
    if (!isDriver || !currentUser) return vehicules;
  
    const assignedVehicleIds = affectations
      ?.filter(a =>
        a.chauffeur_id === currentUser.id &&
        isTodayBetween(a.date_debut, a.date_fin)
      )
      ?.map(a => a.vehicule_id);
  
    return vehicules.filter(v => assignedVehicleIds?.includes(v.id));
  };

  return {
    currentUser,
    isLoading,
    isAuthenticated,
    isDriver,
    isAdmin,
    isManager,
    isSupervisor,
    isAuditor,
    logout,
    filterDataForDriver,
    filterVehiculesForDriver
  };
};
