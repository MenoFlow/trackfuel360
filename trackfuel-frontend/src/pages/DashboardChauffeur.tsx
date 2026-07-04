import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useChauffeurAccess } from '@/hooks/useChauffeurAccess';
import { useVehicules } from '@/hooks/useVehicules';
import { usePleins } from '@/hooks/usePleins';
import { useTrajets } from '@/hooks/useTrajets';
import { useAffectations } from '@/hooks/useAffectations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Car, Fuel, Route, AlertTriangle, Plus, FileEdit, ClipboardList, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/utils/motionVariants';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import Header from '@/components/Chauffeur/Header';
import { generateAlertes } from '@/lib/services/alerteService';
import { useAggregatedData } from '@/lib/mockData';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  demande: { label: 'En attente', className: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  validee: { label: 'Acceptée', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
  rejetee: { label: 'Refusée', className: 'bg-red-500 hover:bg-red-600 text-white' },
  en_cours: { label: 'En cours', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  terminee: { label: 'Terminée', className: 'bg-slate-200 dark:bg-slate-700' },
};

export default function DashboardChauffeur() {
  const queryClient = useQueryClient();
  const { vehicules, trajets, pleins, niveauxCarburant, geofences, pleinExifMetadata, traceGPSPoints, params, users, pleinOcrData } = useAggregatedData();

  const navigate = useNavigate();

  const allAlertes = generateAlertes(
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
  const { t } = useTranslation();
  const { currentUser, logout, filterVehiculesForDriver, filterDataForDriver } = useChauffeurAccess();
  const { data: allVehicules, isLoading: vehiculesLoading } = useVehicules();
  const { data: allPleins, isLoading: pleinsLoading } = usePleins();
  const { data: allTrajets, isLoading: trajetsLoading } = useTrajets();
  const { data: affectations } = useAffectations();
  const { data: missions = [], isLoading: missionsLoading } = useQuery({
    queryKey: ['missions'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/missions`);
      if (!res.ok) throw new Error('Erreur chargement missions');
      return res.json();
    },
  });
  const [rejectMission, setRejectMission] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const updateMissionStatus = useMutation({
    mutationFn: async ({ id, statut, motif_rejet }: { id: number; statut: string; motif_rejet?: string }) => {
      const res = await fetch(`${API_BASE}/api/missions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut, motif_rejet }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Mise à jour impossible' }));
        throw new Error(err.error || 'Mise à jour impossible');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['affectations'] });
      setRejectMission(null);
      setRejectReason('');
      toast.success('Mission mise à jour');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!currentUser) {
    return null;
  }

  // Filtrer les données pour le chauffeur
  const mesVehicules = allVehicules && affectations 
    ? filterVehiculesForDriver(allVehicules, affectations) 
    : [];
  const mesPleins = allPleins ? filterDataForDriver(allPleins, mesVehicules) : [];
  const mesTrajets = allTrajets ? filterDataForDriver(allTrajets, mesVehicules) : [];
  const mesAlertes = allAlertes ? allAlertes.filter(a => 
    a.chauffeur_id === currentUser.id
  ) : [];
  const mesMissions = missions.filter((mission: any) => Number(mission.chauffeur_id) === Number(currentUser.id));

  const isLoading = vehiculesLoading || pleinsLoading || trajetsLoading || missionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header currentUser={currentUser} logout={logout} isDashboard={true} />

      <div className="md:mx-12 p-6 space-y-6">
        {/* Bienvenue */}
        <MotionWrapper variant="slideUp">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-bold text-foreground">{t('driver.welcome')} {currentUser.prenom} !</h2>
            <p className="text-muted-foreground mt-2">{t('driver.activitySummary')}</p>
          </div>
        </MotionWrapper>

        {/* Actions rapides */}
        <motion.div 
          className="grid gap-4 md:grid-cols-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <MotionWrapper variant="stagger" delay={0} as="div">
            <Link to="/chauffeur/ajouter-plein">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('driver.addFuel')}</h3>
                  <p className="text-sm text-muted-foreground">{t('driver.addFuelDesc')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          </MotionWrapper>
          <MotionWrapper variant="stagger" delay={0.1} as="div">
            <Link
              to="/chauffeur/demande-correction"
              state={{
                pleinId: null,
                isNotEditable: false,
                oldVal: null,
                newVal: null,
              }}
            >
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileEdit className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('driver.requestCorrection')}</h3>
                  <p className="text-sm text-muted-foreground">{t('driver.requestCorrectionDesc')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          </MotionWrapper>
        </motion.div>

        {/* Statistiques */}
        <motion.div 
          className="grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <MotionWrapper variant="stagger" delay={0}>
            <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                {t('driver.myVehicles')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{mesVehicules.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('driver.vehiclesAssigned')}</p>
            </CardContent>
          </Card>
          </MotionWrapper>

          <MotionWrapper variant="stagger" delay={0.1}>
            <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                {t('driver.fuelThisMonth')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{mesPleins.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('driver.fuelsRecorded')}</p>
            </CardContent>
          </Card>
          </MotionWrapper>

          <MotionWrapper variant="stagger" delay={0.2}>
            <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Route className="h-4 w-4 text-muted-foreground" />
                {t('driver.tripsThisMonth')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{mesTrajets.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {mesTrajets.reduce((sum, t) => sum + t.distance_km, 0).toFixed(0)} {t('driver.kmTraveled')}
              </p>
            </CardContent>
          </Card>
          </MotionWrapper>
        </motion.div>

        {/* Ordres de mission */}
        <MotionWrapper variant="slideUp" delay={0.25}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Ordre de mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mesMissions.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Destination</TableHead>
                        <TableHead>Véhicule affecté</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mesMissions.map((mission: any) => {
                        const config = STATUT_CONFIG[mission.statut] || STATUT_CONFIG.demande;
                        return (
                          <TableRow key={mission.id}>
                            <TableCell className="font-medium">{mission.destination}</TableCell>
                            <TableCell>{mission.immatriculation || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {mission.date_depart ? new Date(mission.date_depart).toLocaleString('fr-FR') : '—'}
                              {' - '}
                              {mission.date_retour_prevue ? new Date(mission.date_retour_prevue).toLocaleString('fr-FR') : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge className={config.className}>{config.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {mission.statut === 'demande' ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                                    title="Accepter"
                                    onClick={() => updateMissionStatus.mutate({ id: mission.id, statut: 'validee' })}
                                    disabled={updateMissionStatus.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                                    title="Refuser"
                                    onClick={() => {
                                      setRejectMission(mission);
                                      setRejectReason('');
                                    }}
                                    disabled={updateMissionStatus.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : mission.motif_rejet ? (
                                <span className="text-sm text-destructive">{mission.motif_rejet}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Aucune mission ne vous est affectée.</p>
              )}
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Mes véhicules */}
        <MotionWrapper variant="slideUp" delay={0.3}>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {t('driver.myAssignedVehicles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mesVehicules.length > 0 ? (
              <div className="space-y-3">
                {mesVehicules.map((v) => (
                  <div key={v.immatriculation} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{v.immatriculation}</p>
                      <p className="text-sm text-muted-foreground">{v.marque} {v.modele}</p>
                    </div>
                    <div className='flex flex-col gap-2 justify-center'>
                      <Button variant="outline" onClick={() => navigate("/trips/driver/"+v.id)} className="text-xs flex items-center justify-center">
                        <Route className="h-4 w-4 mr-2" />
                        <p className='hidden md:inline'>Trajets</p>
                      </Button>
                      <Badge variant={v.actif ? "default" : "secondary" } className="flex items-center justify-center text-center">
                        {v.actif ? t('vehicles.active') : t('vehicles.inactive')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t('driver.noVehicleAssigned')}</p>
            )}
          </CardContent>
        </Card>
        </MotionWrapper>

        {/* Alertes me concernant */}
        {mesAlertes.length > 0 && (
          <MotionWrapper variant="slideUp" delay={0.4}>
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t('driver.alertsAboutMe')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mesAlertes.slice(0, 5).map((alerte) => (
                  <div key={alerte.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{alerte.titre}</p>
                        <p className="text-sm text-muted-foreground mt-1">{alerte.description}</p>
                      </div>
                      <Badge variant={alerte.score > 70 ? "destructive" : "secondary"}>
                        {t('dashboard.score')}: {alerte.score}
                      </Badge>
                    </div>
                  </div>
                ))}
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        )}
      </div>

      <Dialog open={Boolean(rejectMission)} onOpenChange={(open) => !open && setRejectMission(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justification du refus</DialogTitle>
            <DialogDescription>
              Indiquez pourquoi vous refusez cette mission.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Ex: indisponibilité, contrainte médicale, information manquante..."
            className="min-h-28"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectMission(null)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={() => updateMissionStatus.mutate({
                id: rejectMission.id,
                statut: 'rejetee',
                motif_rejet: rejectReason.trim(),
              })}
              disabled={updateMissionStatus.isPending || !rejectReason.trim()}
            >
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
