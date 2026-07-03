import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Parametre } from "@/types";
import * as parametresApi from "@/lib/services/parametresApi";

/**
 * Hook personnalisé pour gérer les paramètres avec react-query
 * 
 * Ce hook utilise react-query pour:
 * - Gérer le cache des données
 * - Gérer les états de chargement
 * - Gérer les erreurs
 * - Optimiser les requêtes
 * 
 * Les appels API sont centralisés dans src/services/parametresApi.ts
 * pour faciliter la transition vers le backend réel.
 */

export const useParametres = () => {
  const queryClient = useQueryClient();

  // Query pour récupérer les paramètres
  // BACKEND: GET /api/params
  const { data: parametres, isLoading, error } = useQuery({
    queryKey: ["parametres"],
    queryFn: parametresApi.fetchParametres,
    staleTime: 5 * 60 * 1000, // Les données restent fraîches pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Cache garbage collection après 10 minutes
  });

  // Mutation pour mettre à jour un paramètre individuel
  // BACKEND: PUT /api/params/:id
  // Request Body: { valeur: number }
  const updateMutation = useMutation({
    mutationFn: ({ id, valeur }: { id: string; valeur: number }) =>
      parametresApi.updateParametre(id, valeur),
    onSuccess: (updatedParam) => {
      // Mise à jour optimiste du cache avec le paramètre modifié
      queryClient.setQueryData(["parametres"], (oldData: Parametre[] | undefined) => {
        if (!oldData) return [updatedParam];
        return oldData.map((param) =>
          param.id === updatedParam.id ? updatedParam : param
        );
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour du paramètre:", error);
    },
  });

  // Mutation pour sauvegarder tous les paramètres (mise à jour en masse)
  // BACKEND: PUT /api/params
  // Request Body: { parametres: Parametre[] }
  const saveMutation = useMutation({
    mutationFn: (parametres: Parametre[]) => parametresApi.saveParametres(parametres), // AJOUTÉ
    onSuccess: (data) => {
      queryClient.setQueryData(["parametres"], data); // OK
    },
    onError: (error) => {
      console.error("Erreur sauvegarde:", error);
      queryClient.invalidateQueries({ queryKey: ["parametres"] }); // AJOUTÉ
    },
  });

  // Mutation pour réinitialiser les paramètres
  // BACKEND: POST /api/params/reset
  const resetMutation = useMutation({
    mutationFn: parametresApi.resetParametres,
    onSuccess: (data) => {
      // Mise à jour optimiste du cache
      queryClient.setQueryData(["parametres"], data);
    },
    onError: (error) => {
      console.error("Erreur lors de la réinitialisation:", error);
      // En cas d'erreur, on pourrait invalider le cache pour recharger les données
      // queryClient.invalidateQueries({ queryKey: ["parametres"] });
    },
  });

  return {
    parametres,
    isLoading,
    error,
    updateParametre: updateMutation.mutate,
    saveParametres: saveMutation.mutate,
    resetParametres: resetMutation.mutate,
    isUpdating: updateMutation.isPending,
    isSaving: saveMutation.isPending,
    isResetting: resetMutation.isPending,
  };
};
