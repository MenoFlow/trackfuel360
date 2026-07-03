// hooks/useAggregatedData.ts
import { useUsers } from '@/hooks/useUsers';
import { useVehicules } from '@/hooks/useVehicules';
import { useSites } from '@/hooks/useSites';
import { useAffectations } from '@/hooks/useAffectations';
import { useCorrections } from '@/hooks/useCorrections';
import { useParametres } from '@/hooks/useParameter';

import { useTrajets } from '@/hooks/useTrajets';
import { useTraceGps } from '@/hooks/useTraceGPSPoints';
import { usePleins } from '@/hooks/usePleins';
import { useNiveauxCarburant } from '@/hooks/useNiveauxCarburant';
import { usePleinMetadata } from '@/hooks/usePleinMetadata';
import { useGeofences } from '@/hooks/useGeofences';

export const useAggregatedData = () => {
  const usersQuery = useUsers();
  const vehiculesQuery = useVehicules();
  const sitesQuery = useSites();
  const affectationsQuery = useAffectations();
  const correctionsQuery = useCorrections();
  const {parametres} = useParametres();
  // console.log();
  // const parametres = parametreQuery.data;

  const trajetsQuery = useTrajets();
  const traceGPSQuery = useTraceGps();
  const pleinsQuery = usePleins();
  const niveauxCarburantQuery = useNiveauxCarburant();
  const pleinExifQuery = usePleinMetadata();
  const pleinOcrData = usePleinOcrData();
  const {geofences} = useGeofences();
  
  
  const getParam = (id: string, def: number) => {
    if (!Array.isArray(parametres)) {
      return def; // si parametres est undefined ou pas un tableau
    }
    const found = parametres.find(p => p.id === id);
    return Number(found?.valeur ?? def);
  };
  
  const params: ParametresDetection = {
    seuil_surconsommation_pct: getParam('seuil_surconsommation_pct', 20),
    seuil_ecart_gps_pct: getParam('seuil_ecart_gps_pct', 15),
    seuil_carburant_disparu_litres: getParam('seuil_carburant_disparu_litres', 5),
    seuil_exif_heures: getParam('seuil_exif_heures', 2),
    seuil_exif_distance_km: getParam('seuil_exif_distance_km', 0.5),
    seuil_immobilisation_heures: getParam('seuil_immobilisation_heures', 8),
    periode_consommation_jours: getParam('periode_consommation_jours', 30),
  };  
  

  return {
    users: usersQuery.data ?? [],
    vehicules: vehiculesQuery.data ?? [],
    sites: sitesQuery.data ?? [],
    affectations: affectationsQuery.data ?? [],
    corrections: correctionsQuery.data ?? [],
    params,
    trajets: trajetsQuery.data ?? [],
    traceGPSPoints: traceGPSQuery.data ?? [],
    pleins: pleinsQuery.data ?? [],
    niveauxCarburant: niveauxCarburantQuery.data ?? [],
    pleinExifMetadata: pleinExifQuery.data ?? [],
    pleinOcrData: pleinOcrData.data ?? [],
    geofences: geofences ?? [],
  };
};


// Point d'entrée principal pour toutes les données mock
// Ce fichier agrège les données de différents modules
import { 
  ParametresDetection
} from '@/types';

//----------------------------------------------------------------------------------------

// Import des données pour les calculs
// import { mockVehicules, mockSites, mockUsers, mockAffectations } from './data/mockData.base';

// import { mockTrajets, mockTraceGPSPoints } from './data/mockData.trajectories';
// import { mockPleins, mockNiveauxCarburant, mockPleinExifMetadata } from './data/mockData.fuel';
// import { mockGeofences } from './data/mockData.geofences';
// import { mockCorrections, mockParametresDetection } from './data/mockData.corrections';
import { usePleinOcrData } from '@/hooks/usePleinOcrData';

//------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------
// Objet contenant toutes les données mockées par type
// export const mockDataByType2: Record<string, any[]> = {
//   Site: mockSites,
//   Geofence: mockGeofences,
//   User: mockUsers,
//   Vehicule: mockVehicules,
//   Affectation: mockAffectations,
//   Trip: mockTrajets,
//   TraceGps: mockTraceGPSPoints,
//   Plein: mockPleins,
//   PleinExifMetadata: mockPleinExifMetadata,
//   NiveauCarburant: mockNiveauxCarburant,
//   Parametre: [mockParametresDetection],
//   Correction: mockCorrections,
// };

// Objet contenant toutes les données mockées par type
// export const mockDataByType2: Record<string, any[]> = {
//   Site: mockSites,
//   User: mockUsers,
//   Vehicule: mockVehicules,
//   Affectation: mockAffectations,
// };


//-----------------------------------------------------------------



export interface Parametre {
  id: string;
  label: string;
  description: string;
  valeur: number;
  unite: string;
  min: number;
  max: number;
}
