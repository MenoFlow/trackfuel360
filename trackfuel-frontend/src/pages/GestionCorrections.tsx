import { useState, useEffect } from 'react';
import { useCurrentUser, useUsers } from '@/hooks/useUsers';
import { useCorrections, useValidateCorrection, useRejectCorrection } from '@/hooks/useCorrections';
import { usePleins } from '@/hooks/usePleins';
import { useVehicules } from '@/hooks/useVehicules';
import { MainLayout } from '@/components/Layout/MainLayout';
import { MotionLayout } from '@/components/Layout/MotionLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CorrectionDetailsDialog from '@/components/Corrections/CorrectionDetailsDialog';
import { validateCorrectionPlein, ValidationResult } from '@/lib/utils/correctionValidation';
import { Correction, CorrectionStatus } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  AlertCircle, 
  Filter,
  Calendar,
  User,
  FileEdit
} from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { hasPermission } from '@/hooks/useUsers';
import { useTranslation } from 'react-i18next';

const GestionCorrections = () => {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const { data: corrections, isLoading: isLoadingCorrections } = useCorrections();
  const { data: pleins } = usePleins();
  const { data: vehicules } = useVehicules();
  const { data: users } = useUsers();
  const validateMutation = useValidateCorrection();
  const rejectMutation = useRejectCorrection();
  const { toast } = useToast();

  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | undefined>();
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<CorrectionStatus | 'all'>('all');
  const [vehiculeFilter, setVehiculeFilter] = useState<string>('all');
  const [chauffeurFilter, setChauffeurFilter] = useState<string>('all');

  // Délai avant d'afficher le message d'accès refusé
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCheckingPermissions(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Vérification des permissions
  // if (isCheckingPermissions || !currentUser || !hasPermission(currentUser, 'manage_corrections')) {
  //   if (isCheckingPermissions) {
  //     return (
  //       <MainLayout>
  //         <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
  //           <Skeleton className="h-32 w-96" />
  //         </div>
  //       </MainLayout>
  //     );
  //   }
  //   if (!currentUser || !hasPermission(currentUser, 'manage_corrections')) {
  //     return (
  //       <MainLayout>
  //         <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
  //           <Card className="max-w-md">
  //             <CardHeader>
  //               <CardTitle className="text-red-600">Accès refusé</CardTitle>
  //               <CardDescription>
  //                 Vous n'avez pas les permissions nécessaires pour accéder à cette page.
  //               </CardDescription>
  //             </CardHeader>
  //           </Card>
  //         </div>
  //       </MainLayout>
  //     );
  //   }
  // }

  const handleOpenDetails = (correction: Correction) => {
    setSelectedCorrection(correction);
    // Calculer la validation si c'est une correction de plein
    if (correction.table === 'pleins') {
      
      const plein = pleins?.find(p => (p.id).toString() === correction.record_id.toString());
      const vehicule = vehicules?.find(v => (v.id).toString() === plein?.vehicule_id.toString());
      
      if (plein && vehicule && pleins) {
        const previousPleins = pleins.filter(p => (p.vehicule_id).toString() === vehicule.id.toString());
        const result = validateCorrectionPlein(correction, plein, vehicule, previousPleins);
        setValidationResult(result);
      }
    }
    
    setDetailsOpen(true);
  };

  const handleValidate = async (correctionId: number, comment: string) => {
    try {
      await validateMutation.mutateAsync({
        id: correctionId,
        validated_by: currentUser?.id || null
      });
      
      toast({
        title: t('success.correctionValidated'),
        description: t('success.correctionValidatedDesc'),
      });
      
      setDetailsOpen(false);
      setSelectedCorrection(null);
    } catch (error) {
      toast({
        title: t('errors.generic'),
        description: t('errors.correctionValidation'),
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (correctionId: number, comment: string) => {
    try {
      await rejectMutation.mutateAsync({
        id: correctionId,
        validated_by: currentUser?.id || null
      });
      
      toast({
        title: t('success.correctionRejected'),
        description: t('success.correctionRejectedDesc'),
        variant: 'destructive',
      });
      
      setDetailsOpen(false);
      setSelectedCorrection(null);
    } catch (error) {
      toast({
        title: t('errors.generic'),
        description: t('errors.correctionRejection'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: CorrectionStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" /> {t('corrections.pending')}
          </Badge>
        );
      case 'validated':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" /> {t('corrections.validated')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> {t('corrections.rejected')}
          </Badge>
        );
    }
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      litres: 'Litres',
      odometre: 'Odomètre',
      prix_unitaire: 'Prix unitaire',
      station: 'Station',
      date: 'Date'
    };
    return labels[field] || field;
  };

  const getUserName = (userId: number) => {
    const user = users?.find(u => u.id === userId);
    return user ? `${user.prenom} ${user.nom}` : (userId).toString();
  };

  // Filtrage des corrections
  const filteredCorrections = corrections?.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    
    if (vehiculeFilter !== 'all') {
      const plein = pleins?.find(p => p.id === c.record_id);
      if ((plein?.vehicule_id).toString() !== vehiculeFilter) return false;
    }
    
    if (chauffeurFilter !== 'all') {
      const plein = pleins?.find(p => p.id === c.record_id);
      if ((plein?.chauffeur_id).toString() !== chauffeurFilter) return false;
    }
    
    return true;
  });

  const itemsPerPage = 5;
  const totalPages = Math.ceil((filteredCorrections?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCorrections = filteredCorrections?.slice(startIndex, endIndex);

  const pendingCount = corrections?.filter(c => c.status === 'pending').length || 0;
  const validatedCount = corrections?.filter(c => c.status === 'validated').length || 0;
  const rejectedCount = corrections?.filter(c => c.status === 'rejected').length || 0;

  return (
    <MainLayout>
      <MotionLayout variant="slideUp">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight">{t('corrections.title')}</h1>
            <p className="text-muted-foreground">
              {t('corrections.description')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('corrections.pending')}</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">
                  {t('corrections.toProcess')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('corrections.validated')}</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validatedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {t('corrections.accepted')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('corrections.rejected')}</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rejectedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {t('corrections.refused')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('common.filters')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t('common.status')}</Label>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CorrectionStatus | 'all')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('corrections.allStatuses')}</SelectItem>
                      <SelectItem value="pending">{t('corrections.pending')}</SelectItem>
                      <SelectItem value="validated">{t('corrections.validated')}</SelectItem>
                      <SelectItem value="rejected">{t('corrections.rejected')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('alerts.vehicle')}</Label>
                  <Select value={vehiculeFilter} onValueChange={setVehiculeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('corrections.allVehicles')}</SelectItem>
                      {vehicules?.map(v => (
                        <SelectItem key={v.id} value={(v.id).toString()}>
                          {v.immatriculation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('alerts.driver')}</Label>
                  <Select value={chauffeurFilter} onValueChange={setChauffeurFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('corrections.allDrivers')}</SelectItem>
                      {users
                        ?.filter(u => u.role === 'driver')
                        .map(u => (
                          <SelectItem key={u.id} value={(u.id).toString()}>
                            {u.prenom} {u.nom}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des corrections */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              {t('corrections.title')} ({filteredCorrections?.length || 0})
            </h2>

          {isLoadingCorrections ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : paginatedCorrections && paginatedCorrections.length > 0 ? (
            <>
              <div className="space-y-4">
                {paginatedCorrections.map((correction) => {
                const plein = pleins?.find(p => p.id === correction.record_id);
                const vehicule = vehicules?.find(v => v.id === plein?.vehicule_id);

                return (
                  <Card key={correction.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                        <div className="space-y-3 flex-1 w-full">
                          <div className="flex items-start gap-3">
                            <FileEdit className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold break-words">
                              {t('dataTypes.Correction')} #{correction.id} - {getFieldLabel(correction.champ)}
                              </p>
                              <p className="text-sm text-muted-foreground break-words">
                                {t('dataTypes.Plein')} {correction.record_id}
                                {vehicule && ` - ${vehicule.immatriculation}`}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="break-words">{t('corrections.requester')}: {getUserName(correction.requested_by)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="break-words">{format(new Date(correction.requested_at), 'PPp', { locale: fr })}</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-muted-foreground">{t('corrections.oldValue')}:</span>
                              <Badge variant="outline" className="font-mono text-red-600 line-through">
                                {correction.old_value}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground hidden sm:inline">→</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-muted-foreground">{t('corrections.newValue')}:</span>
                              <Badge variant="outline" className="font-mono text-green-600 font-semibold">
                                {correction.new_value}
                              </Badge>
                            </div>
                          </div>

                          {correction.comment && (
                            <p className="text-sm italic text-muted-foreground bg-muted/30 p-2 rounded break-words">
                              "{correction.comment}"
                            </p>
                          )}
                        </div>

                        <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 w-full lg:w-auto lg:ml-4">
                          {getStatusBadge(correction.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full lg:w-auto"
                            onClick={() => handleOpenDetails(correction)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.details')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
                })}
              </div>

              {/* Pagination */}
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
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('corrections.noCorrectionsFound')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </MotionLayout>

      {/* Dialog de détails */}
      {selectedCorrection && (
        <CorrectionDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          correction={selectedCorrection}
          plein={pleins?.find(p => p.id === selectedCorrection.record_id)}
          vehicule={vehicules?.find(v => 
            v.id === pleins?.find(p => p.id === selectedCorrection.record_id)?.vehicule_id
          )}
          validationResult={validationResult}
          onValidate={handleValidate}
          onReject={handleReject}
          isLoading={validateMutation.isPending || rejectMutation.isPending}
        />
      )}
    </MainLayout>
  );
};

export default GestionCorrections;
