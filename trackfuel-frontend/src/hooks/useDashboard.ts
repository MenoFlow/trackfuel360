// import { useQuery } from '@tanstack/react-query';
// import { DashboardStats } from '@/types';
// import { mockDashboardStats } from '@/lib/mockData';

// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// export const useDashboardStats = () => {
//   return useQuery({
//     queryKey: ['dashboard-stats'],
//     queryFn: async (): Promise<DashboardStats> => {
//       await delay(400);
//       return mockDashboardStats;
//     },
//   });
// };