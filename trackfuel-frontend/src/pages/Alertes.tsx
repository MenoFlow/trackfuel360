import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { AlertTriangle, Filter, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alerte } from '@/types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/utils/motionVariants';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { toast } from 'sonner';
import { generateAlertes } from '@/lib/services/alerteService';
import { useAggregatedData } from '@/lib/mockData';

const Alertes = () => {
  const { vehicules, trajets, pleins, niveauxCarburant, geofences, pleinExifMetadata, pleinOcrData, traceGPSPoints, params, users } = useAggregatedData();
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

  const { t } = useTranslation();
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [vehiculeFilter, setVehiculeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingAlert, setDeletingAlert] = useState<Alerte | null>(null);
  const [deletingAllAlerts, setDeletingAllAlerts] = useState(false);
  const itemsPerPage = 5;

  const getVehiculeImmat = (vehiculeId: number) => {
    return vehicules?.find(v => v.id === vehiculeId)?.immatriculation || vehiculeId;
  };

  const getPleinIdForAlerte = (alerte: any) => {
    const plein = pleins?.find(p => 
      p.vehicule_id === alerte.vehicule_id && 
      new Date(p.date).toDateString() === new Date(alerte.date_detection).toDateString()
    );
    return plein?.id;
  };

  const handleDeleteAlert = async () => {
    if (!deletingAlert) return;
    try {
      // TODO: Implement delete alert mutation
      toast.success(t('success.deleted'));
      setDeletingAlert(null);
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  const handleDeleteAllAlerts = async () => {
    try {
      // TODO: Implement delete all filtered alerts mutation
      toast.success(t('success.deleted'));
      setDeletingAllAlerts(false);
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  const getAlerteSeverityColor = (score: number) => {
    if (score >= 80) return 'destructive';
    if (score >= 60) return 'default';
    return 'secondary';
  };

  const filteredAlertes = alertes?.filter(a => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (vehiculeFilter !== 'all' && (a.vehicule_id).toString() !== vehiculeFilter) return false;
    if (scoreFilter !== 'all') {
      if (scoreFilter === 'high' && a.score < 80) return false;
      if (scoreFilter === 'medium' && (a.score < 60 || a.score >= 80)) return false;
      if (scoreFilter === 'low' && a.score >= 60) return false;
    }
    return true;
  });

  const totalPages = Math.ceil((filteredAlertes?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAlertes = filteredAlertes?.slice(startIndex, endIndex);

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">{t('alerts.titleShort')}</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {filteredAlertes?.length || 0} {t('alerts.alertsDetected')}
              </p>
            </div>
            {/* {filteredAlertes && filteredAlertes.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setDeletingAllAlerts(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')} {t('common.all')}
              </Button>
            )} */}
          </div>
        </MotionWrapper>

        <MotionWrapper variant="slideUp" delay={0.1}>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{t('alerts.type')}</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {Object.keys(t('alerts.types', { returnObjects: true }) as Record<string, string>).map(key => (
                      <SelectItem key={key} value={key}>{t(`alerts.types.${key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="new">{t('alerts.newAlert')}</SelectItem>
                    <SelectItem value="resolved">{t('alerts.resolved')}</SelectItem>
                    <SelectItem value="ignored">{t('alerts.dismissed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('dashboard.score')}</Label>
                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="high">{t('common.all')} (≥80)</SelectItem>
                    <SelectItem value="medium">{t('common.all')} (60-79)</SelectItem>
                    <SelectItem value="low">{t('common.all')} (&lt;60)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('reports.vehicle')}</Label>
                <Select value={vehiculeFilter} onValueChange={setVehiculeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {vehicules?.map(v => (
                      <SelectItem key={v.immatriculation} value={v.immatriculation}>{v.immatriculation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        </MotionWrapper>

        {false ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : paginatedAlertes && paginatedAlertes.length > 0 ? (
          <>
            <motion.div 
              className="space-y-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {paginatedAlertes.map((alerte, index) => (
              <motion.div key={alerte.id} variants={staggerItem}>
                <Card>
                <CardContent className="p-6">
                  <div className="items-start sm:items-left sm:text-left sm:justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${
                        alerte.score >= 80 ? 'bg-destructive/10' : 
                        alerte.score >= 60 ? 'bg-yellow-500/10' : 
                        'bg-secondary'
                      }`}>
                        <AlertTriangle className={`h-6 w-6 ${
                          alerte.score >= 80 ? 'text-destructive' : 
                          alerte.score >= 60 ? 'text-yellow-600' : 
                          'text-muted-foreground'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="md:flex items-center text-center sm:justify-between">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mb-2">
                            <h3 className="font-semibold text-lg text-foreground truncate">
                              {alerte.titre}
                            </h3>

                            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 justify-center sm:justify-start">
                              <Badge variant={getAlerteSeverityColor(alerte.score)}>
                                {t('dashboard.score')}: {alerte.score}
                              </Badge>
                              <Badge variant="outline">
                                {t(`alerts.types.${alerte.type}`)}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4 mb-4 sm:mt-0 sm:flex-nowrap sm:items-start sm:justify-end justify-center">
                            {(alerte.type === 'plein_suspect' || alerte.type === 'plein_hors_zone' || alerte.type === 'bon_carburant_suspect') && getPleinIdForAlerte(alerte) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => navigate(`/pleins/${getPleinIdForAlerte(alerte)}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t('alerts.viewProof')}
                              </Button>
                            )}
                            {/* <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => setDeletingAlert(alerte)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              <span className="hidden md:inline">{t('common.delete')}</span>
                            </Button> */}
                            {alerte.status === 'new' && (
                              <>
                                {/* <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  <span className="hidden md:inline">{t('alerts.resolve')}</span>
                                </Button>
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  <span className="hidden md:inline">{t('alerts.ignore')}</span>
                                </Button> */}
                              </>
                            )}
                            {alerte.status === 'resolved' && (
                              <Badge variant="secondary">{t('alerts.resolved')}</Badge>
                            )}
                          </div>
                        </div>

                        <p className="text-muted-foreground mb-4 text-center sm:text-left">{alerte.description}</p>

                        <div className="grid grid-cols-1 text-sm mb-3 text-center sm:text-left">
                          <span className="text-muted-foreground">
                            {t('reports.vehicle')}: <span className="font-medium text-foreground">
                              {getVehiculeImmat(alerte.vehicule_id)}
                            </span>
                          </span>
                          {alerte.chauffeur_id && (
                            <span className="text-muted-foreground">
                              {t('alerts.driver')}: <span className="font-medium text-foreground">
                                {alerte.chauffeur_id}
                              </span>
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {t('alerts.detected')}: <span className="font-medium text-foreground">
                              {format(new Date(alerte.date_detection), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </span>
                          </span>
                        </div>
                        
                        {(alerte.deviation_percent !== undefined || alerte.litres_manquants !== undefined) && (
                          <div className="mt-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                            <div className="flex flex-col sm:flex-row gap-4 text-sm text-center sm:text-left">
                              {alerte.deviation_percent !== undefined && alerte.deviation_percent > 0 && (
                                <span className="text-destructive font-semibold">
                                  {t('alerts.deviation')}: +{alerte.deviation_percent.toFixed(1)}%
                                </span>
                              )}
                              {alerte.litres_manquants !== undefined && alerte.litres_manquants > 0 && (
                                <span className="text-destructive font-semibold">
                                  {t('alerts.missingFuel')}: {alerte.litres_manquants.toFixed(1)}L
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('dashboard.noActiveAlerts')}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingAlert}
        onOpenChange={(open) => !open && setDeletingAlert(null)}
        onConfirm={handleDeleteAlert}
        title={t('confirm.deleteAlert')}
        description={t('confirm.deleteAlertDesc')}
        confirmText={t('common.delete')}
        icon={Trash2}
      />

      <ConfirmDialog
        open={deletingAllAlerts}
        onOpenChange={setDeletingAllAlerts}
        onConfirm={handleDeleteAllAlerts}
        title={t('confirm.deleteAllAlerts')}
        description={t('confirm.deleteAllAlertsDesc')}
        confirmText={t('common.delete')}
        icon={AlertTriangle}
      />
    </MainLayout>
  );
};

export default Alertes;
