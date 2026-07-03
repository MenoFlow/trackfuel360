import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Geofence } from '@/types';
import { 
  fetchGeofences, 
  createGeofence, 
  updateGeofence as updateGeofenceAPI, 
  deleteGeofence as deleteGeofenceAPI 
} from '@/api/geofences';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * ============================================
 * HOOK USEGEOFENCES - REACT QUERY
 * ============================================
 * 
 * Hook personnalisé pour gérer les geofences avec React Query
 * 
 * Fonctionnalités:
 * - Cache automatique des données
 * - Invalidation et refetch intelligents
 * - Gestion des états de chargement et d'erreur
 * - Mutations optimistes (optionnel)
 * 
 * Prêt pour l'intégration backend via les fonctions dans src/api/geofences.ts
 */
export function useGeofences() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // États locaux pour la sélection et l'édition
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);

  /**
   * QUERY: Récupérer toutes les geofences
   * 
   * - queryKey: ['geofences'] - identifiant unique pour le cache
   * - queryFn: fetchGeofences - fonction appelant l'API
   * - Automatiquement mise en cache et refetch selon la config du QueryClient
   */
  const { 
    data: geofences = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['geofences'],
    queryFn: fetchGeofences,
  });

  /**
   * MUTATION: Créer une nouvelle geofence
   * 
   * - onSuccess: invalide le cache pour forcer un refetch
   * - Affiche un toast de confirmation
   */
  const createMutation = useMutation({
    mutationFn: createGeofence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast({
        title: t('toast.geofenceCreated'),
        description: t('toast.geofenceCreatedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * MUTATION: Mettre à jour une geofence
   * 
   * - Met à jour le cache local immédiatement (mutation optimiste)
   * - Affiche un toast de confirmation
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Geofence> }) =>
      updateGeofenceAPI(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast({
        title: t('toast.geofenceUpdated'),
        description: t('toast.geofenceUpdatedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * MUTATION: Supprimer une geofence
   * 
   * - Nettoie les états de sélection si la geofence supprimée était sélectionnée
   * - Affiche un toast de confirmation
   */
  const deleteMutation = useMutation({
    mutationFn: deleteGeofenceAPI,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      
      // Nettoyer les states de sélection
      if (selectedGeofence?.id === deletedId) {
        setSelectedGeofence(null);
      }
      if (editingGeofence?.id === deletedId) {
        setEditingGeofence(null);
      }
      
      toast({
        title: t('toast.geofenceDeleted'),
        description: t('toast.geofenceDeletedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('toast.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Fonctions wrapper pour simplifier l'utilisation
   */
  const addGeofence = useCallback((geofence: Omit<Geofence, 'id'>) => {
    return createMutation.mutateAsync(geofence);
  }, [createMutation]);

  const updateGeofence = useCallback((id: number, updates: Partial<Geofence>) => {
    // Mettre à jour les states de sélection si nécessaire
    if (selectedGeofence?.id === id) {
      setSelectedGeofence((prev) => prev ? { ...prev, ...updates } : null);
    }
    if (editingGeofence?.id === id) {
      setEditingGeofence((prev) => prev ? { ...prev, ...updates } : null);
    }
    
    return updateMutation.mutateAsync({ id, updates });
  }, [updateMutation, selectedGeofence, editingGeofence]);

  const deleteGeofence = useCallback((id: number) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const startEditing = useCallback((geofence: Geofence) => {
    setEditingGeofence(geofence);
    setSelectedGeofence(geofence);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingGeofence(null);
  }, []);

  return {
    // Données
    geofences,
    
    // États
    isLoading,
    isError,
    error,
    
    // Sélection et édition
    selectedGeofence,
    editingGeofence,
    setSelectedGeofence,
    
    // Actions
    addGeofence,
    updateGeofence,
    deleteGeofence,
    startEditing,
    cancelEditing,
    
    // États des mutations (pour afficher des spinners si besoin)
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

