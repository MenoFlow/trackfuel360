import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/Layout/MainLayout';
import { useVehicules } from '@/hooks/useVehicules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Car, Plus, Filter, Edit, Trash2, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/utils/motionVariants';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Vehicule } from '@/types';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { VehicleDialog } from '@/components/Vehicules/VehicleDialog';
import { useDeleteVehicule } from '@/hooks/useVehicules';
import { getVehicleStatusBadgeVariant, getVehicleStatusLabel, getVehicleUnavailableReason, isVehicleOutOfService } from '@/lib/vehicleStatus';


const Vehicules = () => {
  const { t } = useTranslation();
  const { data: vehicules, isLoading } = useVehicules();
  const navigate = useNavigate();

  const { mutate: deleteVehicule } = useDeleteVehicule();
  const handleDelete = (id: number) => {
    deleteVehicule(id);
  };
  
  
  // Filtres
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [marqueFilter, setMarqueFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Confirm dialogs
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicule | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicule | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicule, setSelectedVehicule] = useState<Vehicule | undefined>();
    
  const handleAddVehicule = () => {
    setSelectedVehicule(undefined);
    setDialogOpen(true);
  };

  const handleEditVehicule = (vehicule: Vehicule) => {
    setSelectedVehicule(vehicule);
    setDialogOpen(true);
  };

  // Filtrage
  const filteredVehicules = vehicules?.filter(v => {
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'actif' && !v.actif) return false;
      if (statusFilter === 'inactif' && v.actif) return false;
    }
    if (marqueFilter !== 'all' && v.marque !== marqueFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil((filteredVehicules?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVehicules = filteredVehicules?.slice(startIndex, endIndex);

  // Récupérer les marques uniques
  const marques = Array.from(new Set(vehicules?.map(v => v.marque) || []));
  const types = Array.from(new Set(vehicules?.map(v => v.type) || []));

  const handleDeleteVehicle = async () => {
    if (!deletingVehicle) return;
    try {
      // TODO: Implement delete vehicle mutation
      toast.success(t('success.deleted'));
      setDeletingVehicle(null);
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  const handleEditVehicle = async () => {
    if (!editingVehicle) return;
    try {
      // TODO: Implement edit vehicle logic
      toast.success(t('success.updated'));
      setEditingVehicle(null);
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">{t('vehicles.title')}</h1>
              <p className="text-muted-foreground mt-2">
                {filteredVehicules?.length || 0} {t('vehicles.inFleet')}
              </p>
            </div>
            <Button
  variant="outline"
  size="sm"
  className="
    w-full sm:w-auto flex items-center justify-center gap-2
    px-4 py-2 rounded-md font-medium
    border border-blue-600 text-blue-600
    hover:bg-blue-50 hover:text-blue-700
    active:scale-95 transition-all duration-200
  "
  onClick={handleAddVehicule}
>
  <Plus className="h-4 w-4" />
  {t("vehicles.addVehicle")}
</Button>

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
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('vehicles.type')}</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {types.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
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
                    <SelectItem value="actif">{t('vehicles.active')}</SelectItem>
                    <SelectItem value="inactif">{t('vehicles.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('vehicles.brand')}</Label>
                <Select value={marqueFilter} onValueChange={setMarqueFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {marques.map(marque => (
                      <SelectItem key={marque} value={marque}>{marque}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        </MotionWrapper>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : paginatedVehicules && paginatedVehicules.length > 0 ? (
          <>
            <motion.div 
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {paginatedVehicules.map((vehicule, index) => (
              <motion.div
                key={vehicule.id}
                variants={staggerItem}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 text-sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-48 rounded-md bg-popover text-popover-foreground shadow-md border">
                          <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                            Actions
                          </DropdownMenuLabel>

                          <DropdownMenuSeparator />

                          {/* Éditer */}
                          <DropdownMenuItem
                            onClick={() => handleEditVehicule(vehicule)}
                            className="flex items-center gap-2 text-sm hover:bg-muted px-2 py-2 cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>

                          {/* Supprimer */}
                          <DropdownMenuItem
                            onClick={() => handleDelete(vehicule.id)}
                            className="flex items-center gap-2 text-sm hover:bg-muted px-2 py-2 cursor-pointer text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {vehicule.immatriculation}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {vehicule.marque} {vehicule.modele}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getVehicleStatusBadgeVariant(vehicule)}>
                      {getVehicleStatusLabel(vehicule)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('vehicles.type')}:</span>
                      <span className="font-medium text-foreground">{vehicule.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('vehicles.tankCapacityShort')}:</span>
                      <span className="font-medium text-foreground">{vehicule.capacite_reservoir}L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('vehicles.nominalConsumptionShort')}:</span>
                      <span className="font-medium text-foreground">
                        {vehicule.consommation_nominale}L/100km
                      </span>
                    </div>
                  </div>
                  <div>

                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() =>  navigate(`/vehicle/${vehicule.id}`)}>
                  {t('vehicles.viewDetails')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/trips/"+vehicule.id)}
                    className="w-full mt-4"
                    disabled={isVehicleOutOfService(vehicule)}
                    title={getVehicleUnavailableReason(vehicule) || 'Trajets'}
                  >
                    Trajets 
                  </Button>
                </CardContent>

              </Card>
              </motion.div>
              ))}
            </motion.div>

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
            <CardContent className="py-12 text-center">
              <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('vehicles.noVehicles')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingVehicle}
        onOpenChange={(open) => !open && setDeletingVehicle(null)}
        onConfirm={()=>handleDelete(deletingVehicle.id)}
        title={t('confirm.deleteVehicle')}
        description={`${t('confirm.deleteVehicleDesc')} ${deletingVehicle?.immatriculation}?`}
        confirmText={t('common.delete')}
        icon={Trash2}
      />

      {/* <ConfirmDialog
        open={!!editingVehicle}
        onOpenChange={(open) => !open && setEditingVehicle(null)}
        onConfirm={handleEditVehicle}
        title={t('confirm.editVehicle')}
        description={`${t('confirm.editVehicleDesc')} ${editingVehicle?.immatriculation}?`}
        confirmText={t('common.edit')}
        icon={Edit}
      /> */}
      <VehicleDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicule={selectedVehicule}
      />
    </MainLayout>
  );
};

export default Vehicules;
