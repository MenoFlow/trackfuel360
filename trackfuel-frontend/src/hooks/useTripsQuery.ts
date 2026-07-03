/**
 * React Query hooks for Trip management
 * These hooks manage the state and caching of trip data
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrips, createTrip, updateTrip, deleteTrip } from "@/api/tripsApi";
import { Trip, TripInput } from "@/types/trip";
import { toast } from "sonner";
import i18n from "@/i18n/config";

/**
 * Hook to fetch trips for a specific vehicle
 * Automatically refetches when vehiculeId changes
 */
export function useTrips(vehiculeId: number) {
  return useQuery({
    queryKey: ["trips", vehiculeId],
    queryFn: () => fetchTrips(vehiculeId),
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
}

/**
 * Hook to create a new trip
 * Automatically invalidates the trips cache on success
 */

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation<Trip, Error, TripInput>({
    mutationFn: (data) => createTrip(data),
    onSuccess: (newTrip) => {
      queryClient.invalidateQueries({ queryKey: ["trips", newTrip.vehicule_id] });
    },
  });
}


/**
 * Hook to update an existing trip
 * Automatically invalidates the trips cache on success
 */

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation<Trip, Error, { id: number; data: TripInput }>({
    mutationFn: ({ id, data }) => updateTrip(id, data),

    onSuccess: (updatedTrip) => {
      // Invalider les trajets pour ce véhicule
      queryClient.invalidateQueries({ queryKey: ["trips", updatedTrip.vehicule_id] });
    },
  });
}

/**
 * Hook to delete a trip
 * Automatically invalidates the trips cache on success
 */
export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, id_vehicule }: { id: number; id_vehicule: number }) => 
      deleteTrip(id),
    onSuccess: (_, variables) => {
      // Invalidate and refetch trips for this vehicle
      queryClient.invalidateQueries({ queryKey: ["trips", variables.id_vehicule] });
      
      toast.success(i18n.t('trips.deleted'));
    },
    onError: (error: Error) => {
      toast.error(i18n.t('trips.errorDelete'), {
        description: error.message,
      });
    },
  });
}
