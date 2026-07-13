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
import { AlertCenter, DashboardAlertItem } from '@/components/Dashboard/AlertCenter';
import { Alerte, Correction } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

interface MaintenanceIntervention {
  id: number;
  statut: 'planifie' | 'en_cours' | 'termine' | 'annule';
  type: string;
  description?: string;
  immatriculation?: string;
  date_prevue?: string;
}

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
  const { data: interventions = [], isFetching: isFetchingMaintenance } = useQuery<MaintenanceIntervention[]>({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/maintenance`);
      if (!res.ok) throw new Error('Erreur chargement maintenance');
      return res.json();
    },
    refetchInterval: 30_000,
  });
  const { data: corrections = [], isFetching: isFetchingCorrections } = useQuery<Correction[]>({
    queryKey: ['corrections'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/corrections`);
      if (!res.ok) throw new Error('Erreur chargement corrections');
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const vehiculesHorsService = vehiculesApi.filter((v) => isVehicleOutOfService(v));
  const maintenancesEnCours = interventions.filter(item => item.statut === 'en_cours');
  const maintenancesPlanifiees = interventions.filter(item => item.statut === 'planifie');
  const correctionsEnAttente = corrections.filter(item => item.status === 'pending');

  const getPleinIdForAlerte = (alerte: Alerte) => {
    const pleinIdFromAlert = Number(alerte.id.match(/_(\d+)$/)?.[1]);
    if (pleinIdFromAlert && pleins.some(plein => plein.id === pleinIdFromAlert)) return pleinIdFromAlert;

    return pleins.find(plein =>
      plein.vehicule_id === alerte.vehicule_id &&
      new Date(plein.date).toDateString() === new Date(alerte.date_detection).toDateString()
    )?.id;
  };

  const dashboardAlerts: DashboardAlertItem[] = [
    ...alertes
      .filter(alerte => alerte.status === 'new' || alerte.status === 'in_progress')
      .map((alerte): DashboardAlertItem => {
        const pleinId = getPleinIdForAlerte(alerte);
        const isFuelAlert = ['plein_suspect', 'plein_hors_zone', 'bon_carburant_suspect', 'carburant_disparu'].includes(alerte.type);
        return {
          id: `detection-${alerte.id}`,
          title: alerte.titre,
          description: alerte.description,
          destination: isFuelAlert && pleinId ? `/pleins/${pleinId}` : `/vehicle/${alerte.vehicule_id}`,
          actionLabel: isFuelAlert && pleinId ? 'Voir le plein' : 'Voir le véhicule',
          source: 'Détection',
          priority: alerte.score >= 80 ? 'critical' : alerte.score >= 60 ? 'warning' : 'info',
          timestamp: new Date(alerte.date_detection).toLocaleString('fr-FR'),
        };
      }),
    ...maintenancesEnCours.map((item): DashboardAlertItem => ({
      id: `maintenance-${item.id}`,
      title: `${item.immatriculation || 'Véhicule'} · ${item.type}`,
      description: item.description || 'Intervention de maintenance en cours.',
      destination: `/maintenance?intervention=${item.id}`,
      actionLabel: 'Gérer l’intervention',
      source: 'Maintenance',
      priority: 'critical',
      timestamp: item.date_prevue ? new Date(item.date_prevue).toLocaleDateString('fr-FR') : undefined,
    })),
    ...maintenancesPlanifiees.map((item): DashboardAlertItem => ({
      id: `maintenance-${item.id}`,
      title: `${item.immatriculation || 'Véhicule'} · ${item.type}`,
      description: item.description || 'Intervention de maintenance planifiée.',
      destination: `/maintenance?intervention=${item.id}`,
      actionLabel: 'Voir l’intervention',
      source: 'Maintenance',
      priority: 'warning',
      timestamp: item.date_prevue ? new Date(item.date_prevue).toLocaleDateString('fr-FR') : undefined,
    })),
    ...vehiculesHorsService
      .filter(vehicule => !vehicule.maintenance_en_cours_id)
      .map((vehicule): DashboardAlertItem => ({
        id: `vehicle-${vehicule.id}`,
        title: `${vehicule.immatriculation || 'Véhicule'} indisponible`,
        description: `${vehicule.marque} ${vehicule.modele} · ${getVehicleStatusLabel(vehicule)}`,
        destination: `/vehicle/${vehicule.id}`,
        actionLabel: 'Ouvrir la fiche',
        source: 'Flotte',
        priority: 'critical',
      })),
    ...correctionsEnAttente.map((correction): DashboardAlertItem => ({
      id: `correction-${correction.id}`,
      title: `Correction #${correction.id} à valider`,
      description: `${correction.table} · ${correction.champ} : ${correction.old_value} → ${correction.new_value}`,
      destination: `/parametres/corrections?correction=${correction.id}`,
      actionLabel: 'Examiner la demande',
      source: 'Correction',
      priority: 'warning',
      timestamp: correction.requested_at ? new Date(correction.requested_at).toLocaleString('fr-FR') : undefined,
    })),
  ].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.priority] - order[b.priority];
  });
  
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

        <MotionWrapper variant="slideUp" delay={0.05}>
          <AlertCenter
            alerts={dashboardAlerts}
            isRefreshing={isFetchingMaintenance || isFetchingCorrections}
            onOpen={(alert) => navigate(alert.destination)}
          />
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
              value={dashboardAlerts.length}
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
              title="Incidents critiques"
              value={dashboardAlerts.filter(alert => alert.priority === 'critical').length}
              icon={AlertTriangle}
              subtitle="à traiter en priorité"
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

      </div>
    </MainLayout>
  );
};

export default Dashboard;
