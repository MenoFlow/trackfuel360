import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/Layout/MainLayout';
import { usePleins } from '@/hooks/usePleins';
import { useVehicules } from '@/hooks/useVehicules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Fuel, Eye, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/utils/motionVariants';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';

const Pleins = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: pleins, isLoading: pleinsLoading } = usePleins();
  const { data: vehicules } = useVehicules();

  const [vehiculeFilter, setVehiculeFilter] = useState<string>('all');
  const [typeSaisieFilter, setTypeSaisieFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const getVehiculeImmat = (vehiculeId: number) => {
    return vehicules?.find(v => v.id === vehiculeId)?.immatriculation || vehiculeId;
  };

  const filteredPleins = pleins?.filter(p => {
    if (vehiculeFilter !== 'all' && (p.vehicule_id).toString() !== vehiculeFilter) return false;
    if (typeSaisieFilter !== 'all' && p.type_saisie !== typeSaisieFilter) return false;
    return true;
  });

  const totalPages = Math.ceil((filteredPleins?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPleins = filteredPleins?.slice(startIndex, endIndex);

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">{t('fuel.titleShort')}</h1>
              <p className="text-muted-foreground mt-2">
                {filteredPleins?.length || 0} {t('fuel.titleShort')}
              </p>
            </div>
          </div>
        </MotionWrapper>

        {/* Filtres */}
        <MotionWrapper variant="slideUp" delay={0.1}>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('reports.vehicle')}</Label>
                <Select value={vehiculeFilter} onValueChange={setVehiculeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('corrections.allVehicles')}</SelectItem>
                    {vehicules?.map(v => (
                      <SelectItem key={v.immatriculation} value={v.immatriculation}>{v.immatriculation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('fuel.entryType')}</Label>
                <Select value={typeSaisieFilter} onValueChange={setTypeSaisieFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="auto">{t('fuel.automatic')}</SelectItem>
                    <SelectItem value="manual">{t('fuel.manual')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        </MotionWrapper>

        <MotionWrapper variant="slideUp" delay={0.2}>
          <Card>
          <CardHeader>
            <CardTitle>{t('fuel.lastFuels')}</CardTitle>
          </CardHeader>
          <CardContent>
            {pleinsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : paginatedPleins && paginatedPleins.length > 0 ? (
              <>
                <motion.div 
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {paginatedPleins.map((plein) => (
                  <motion.div 
                    key={plein.id} 
                    variants={staggerItem}
                    className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 w-full">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                          <Fuel className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-semibold text-foreground">
                              {getVehiculeImmat(plein.vehicule_id)}
                            </p>
                            <Badge variant="outline">
                              {plein.type_saisie === 'auto' ? t('fuel.automaticShort') : t('fuel.manual')}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">{t('fuel.date')}</p>
                              <p className="font-medium text-foreground">
                                {format(new Date(plein.date), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('fuel.liters')}</p>
                              <p className="font-medium text-foreground">{plein.litres}L</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('fuel.pricePerLiter')}</p>
                              <p className="font-medium text-foreground">${plein.prix_unitaire}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">{t('fuel.total')}</p>
                              <p className="font-medium text-foreground">
                                ${(plein.litres * plein.prix_unitaire).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          {plein.station && (
                            <p className="text-sm text-muted-foreground mt-2">
                              📍 {plein.station}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                        <div className="text-left sm:text-right">
                          <p className="text-sm text-muted-foreground">{t('fuel.odometer')}</p>
                          <p className="font-semibold text-foreground">
                            {plein.odometre.toLocaleString('fr-FR')} km
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => navigate(`/pleins/${plein.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('common.details')}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                  ))}
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6">
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
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">{t('fuel.noFuels')}</p>
            )}
          </CardContent>
        </Card>
        </MotionWrapper>
      </div>
    </MainLayout>
  );
};

export default Pleins;
