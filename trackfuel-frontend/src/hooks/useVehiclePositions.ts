// import { useState, useEffect } from 'react';
// import { VehicleWithPosition } from '@/types';
// import { mockVehicules } from '@/lib/mockData';
// import { getRandomMadagascarPosition } from '@/lib/utils/mapUtils';
  
// const UPDATE_INTERVAL = 5000; // 5 secondes

// /**
//  * Hook personnalisé pour gérer les positions des véhicules en temps réel
//  */
// export function useVehiclePositions() {
//   const [vehiclesWithPositions, setVehiclesWithPositions] = useState<VehicleWithPosition[]>([]);

//   useEffect(() => {
//     // Initialiser les positions
//     const initialPositions = mockVehicules.map((vehicle) => ({
//       ...vehicle,
//       position: getRandomMadagascarPosition(),
//     }));
//     setVehiclesWithPositions(initialPositions);

//     // Mettre à jour les positions à intervalle régulier
//     // const interval = setInterval(() => {
//       setVehiclesWithPositions((prev) =>
//         prev.map((vehicle) => ({
//           ...vehicle,
//           position: [
//             vehicle.position[0] + (Math.random() - 0.5) * 0.01,
//             vehicle.position[1] + (Math.random() - 0.5) * 0.01,
//           ] as [number, number],
//         }))
//       );
//     // }, UPDATE_INTERVAL);

//     // return () => clearInterval(interval);
//   }, []);

//   return { vehiclesWithPositions };
// }