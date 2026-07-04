import { MainLayout } from '@/components/Layout/MainLayout';
import { StatsCard } from '@/components/Dashboard/StatsCard';
import { Car, Fuel, AlertTriangle, DollarSign, TrendingUp, Activity, Wrench, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/utils/motionVariants';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { FleetMap } from "./fleet-map";
import { useAggregatedData } from '@/lib/mockData';
import { useNavigate } from 'react-router-dom';
import { calculerDashboardStats } from '@/lib/services/dashboardService';
import { useVehicules } from '@/hooks/useVehicules';
import { generateAlertes } from '@/lib/services/alerteService';
import { useQuery } from '@tanstack/react-query';
import { getVehicleStatusLabel, isVehicleOutOfService } from '@/lib/vehicleStatus';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

export function formatNumberShort(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('fr-FR');
}

const Dashboard = () => {
  //useAggregatedData
  const { vehicules, trajets, pleins, niveauxCarburant, geofences, pleinExifMetadata, traceGPSPoints, params, users, pleinOcrData } = useAggregatedData();

    const alertes = generateAlertes(
      vehicules,
      trajets,
      pleins,
      niveauxCarburant,
      geofences,
      pleinExifMetadata,
      traceGPSPoints,
      params,
      users,
      pleinOcrData
    );
  const dashboardStats = calculerDashboardStats(
    vehicules,
    trajets,
    pleins,
    niveauxCarburant,
    alertes
  );

  const { t } = useTranslation();
  const stats = dashboardStats;
  const navigate = useNavigate();
  const { data: vehiculesApi = [] } = useVehicules();
  const { data: interventions = [] } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/maintenance`);
      if (!res.ok) throw new Error('Erreur chargement maintenance');
      return res.json();
    },
  });
  const { data: corrections = [] } = useQuery({
    queryKey: ['corrections'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/corrections`);
      if (!res.ok) throw new Error('Erreur chargement corrections');
      return res.json();
    },
  });

  const vehiculesHorsService = vehiculesApi.filter((v) => isVehicleOutOfService(v));
  const maintenancesEnCours = interventions.filter((item: any) => item.statut === 'en_cours');
  const maintenancesPlanifiees = interventions.filter((item: any) => item.statut === 'planifie');
  const correctionsEnAttente = corrections.filter((item: any) => item.status === 'pending');
  
  // if (false) {
  //   return (
  //     <MainLayout>
  //       <div className="space-y-6">
  //         <Skeleton className="h-12 w-64" />
  //         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  //           {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
  //         </div>
  //       </div>
  //     </MainLayout>
  //   );
  // }

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('dashboard.overview')}</p>
          </div>
        </MotionWrapper>

        {/* Stats principales */}
        <motion.div 
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <MotionWrapper variant="stagger" delay={0}>
            <StatsCard
              title={t('dashboard.stats.activeVehicles')}
              value={`${stats?.vehicules_actifs}/${stats?.total_vehicules}`}
              icon={Car}
              subtitle={t('dashboard.totalFleet')}
            />
          </MotionWrapper>
          <MotionWrapper variant="stagger" delay={0.1}>
            <StatsCard
              title={t('dashboard.stats.activeAlerts')}
              value={stats?.alertes_actives || 0}
              icon={AlertTriangle}
              subtitle={t('dashboard.requiresAction')}
            />
          </MotionWrapper>
          <MotionWrapper variant="stagger" delay={0.2}>
            <StatsCard
              title={t('dashboard.stats.fuelCost')}
              value={`${formatNumberShort((stats?.cout_carburant_mois))} Ariary`}
              icon={DollarSign}
              subtitle={`${formatNumberShort(stats?.litres_mois)} L ${t('dashboard.consumed')}`}
            />
          </MotionWrapper>
          <MotionWrapper variant="stagger" delay={0.3}>
            <StatsCard
              title={t('dashboard.stats.avgConsumption')}
              value={`${stats?.consommation_moyenne_flotte.toFixed(1)} L`}
              icon={Activity}
              subtitle={`${stats?.distance_mois_km.toLocaleString('fr-FR')} km ${t('dashboard.traveled')}`}
            />
          </MotionWrapper>
        </motion.div>

        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <MotionWrapper variant="stagger" delay={0}>
            <StatsCard
              title="Véhicules hors service"
              value={vehiculesHorsService.length}
              icon={Car}
              subtitle="maintenance en cours ou inactifs"
            />
          </MotionWrapper>
          <MotionWrapper variant="stagger" delay={0.1}>
            <StatsCard
              title="Maintenances en cours"
              value={maintenancesEnCours.length}
              icon={Wrench}
              subtitle={`${maintenancesPlanifiees.length} planifiées`}
            />
          </MotionWrapper>
          <MotionWrapper variant="stagger" delay={0.2}>
            <StatsCard
              title="Corrections à valider"
              value={correctionsEnAttente.length}
              icon={ClipboardCheck}
              subtitle="demandes en attente"
            />
          </MotionWrapper>
          <MotionWrapper variant="stagger" delay={0.3}>
            <StatsCard
              title="Alertes visibles"
              value={alertes?.length || 0}
              icon={AlertTriangle}
              subtitle="toutes sources confondues"
            />
          </MotionWrapper>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}  
        >
          <FleetMap vehicles={vehicules} onVehicleSelect={(v) => navigate(`/vehicle/${v.id}`)} />
        </motion.div>

        <MotionWrapper variant="slideUp" delay={0.35}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance à surveiller
                </CardTitle>
              </CardHeader>
              <CardContent>
                {[...maintenancesEnCours, ...maintenancesPlanifiees].slice(0, 5).length > 0 ? (
                  <div className="space-y-3">
                    {[...maintenancesEnCours, ...maintenancesPlanifiees].slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{item.immatriculation || 'Véhicule'} - {item.type}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <Badge variant={item.statut === 'en_cours' ? 'destructive' : 'outline'}>
                          {item.statut === 'en_cours' ? 'En cours' : 'Planifiée'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Aucune maintenance critique.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Véhicules indisponibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehiculesHorsService.length > 0 ? (
                  <div className="space-y-3">
                    {vehiculesHorsService.slice(0, 5).map((vehicule) => (
                      <div key={vehicule.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{vehicule.immatriculation}</p>
                          <p className="text-sm text-muted-foreground">{vehicule.marque} {vehicule.modele}</p>
                        </div>
                        <Badge variant="destructive">{getVehicleStatusLabel(vehicule)}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Toute la flotte est disponible.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </MotionWrapper>

        {/* Top véhicules à forte consommation */}
        <MotionWrapper variant="slideUp" delay={0.4}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('dashboard.highConsumptionVehicles')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div 
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {stats?.top_vehicules_consommation.map((v, index) => (
                  <motion.div 
                    key={v.vehicule_id} 
                    variants={staggerItem}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-border rounded-lg gap-3"
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Car className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{v.immatriculation}</p>
                        <p className="text-sm text-muted-foreground">{v.consommation.toFixed(1)} L/100km</p>
                      </div>
                    </div>
                    <Badge variant={v.ecart_pourcentage > 20 ? "destructive" : "secondary"}>
                      {v.ecart_pourcentage}%
                    </Badge>
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Alertes récentes */}
        <MotionWrapper variant="slideUp" delay={0.5}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t('dashboard.recentAlerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {false ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : alertes && alertes.length > 0 ? (
                <motion.div 
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {alertes.slice(0, 5).map((alerte) => (
                    <motion.div 
                      key={alerte.id} 
                      variants={staggerItem}
                      className="p-3 border border-border rounded-lg"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-2">
                        <div className="flex-1 w-full">
                          <p className="font-medium text-foreground">{alerte.titre}</p>
                          <p className="text-sm text-muted-foreground mt-1">{alerte.description}</p>
                        </div>
                        <Badge 
                          variant={alerte.score > 70 ? "destructive" : "secondary"}
                          className="sm:ml-2 flex-shrink-0"
                        >
                          {t('dashboard.score')}: {alerte.score}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t('dashboard.noActiveAlerts')}</p>
              )}
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
