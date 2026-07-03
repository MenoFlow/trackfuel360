// src/pages/Affectations.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/Layout/MainLayout';
import { MotionLayout } from '@/components/Layout/MotionLayout';
import { useAffectations, useCreateAffectation, useUpdateAffectation, useDeleteAffectation } from '@/hooks/useAffectations';
import { useVehicules } from '@/hooks/useVehicules';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { AffectationDialog } from '@/components/Affectations/AffectationDialog';
import { Affectation } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Affectations = () => {
  const { t } = useTranslation();
  const { data: affectations, isLoading } = useAffectations();
  const { data: vehicules } = useVehicules();
  const { data: users } = useUsers();
  
  const createAffectation = useCreateAffectation();
  const updateAffectation = useUpdateAffectation();
  const deleteAffectation = useDeleteAffectation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAffectation, setSelectedAffectation] = useState<Affectation | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [affectationToDelete, setAffectationToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleAddAffectation = () => {
    setSelectedAffectation(undefined);
    setDialogOpen(true);
  };

  const handleEditAffectation = (affectation: Affectation) => {
    setSelectedAffectation(affectation);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setAffectationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!affectationToDelete) return;

    deleteAffectation.mutate(affectationToDelete, {
      onSuccess: () => {
        toast.success(t('assignments.assignmentDeleted'));
        setDeleteDialogOpen(false);
        setAffectationToDelete(null);
      },
      onError: () => {
        toast.error(t('assignments.errorDelete'));
      },
    });
  };

  const getVehiculeImmatriculation = (id: number) => {
    return vehicules?.find(v => v.id === id)?.immatriculation || '—';
  };

  const getChauffeurName = (id: number) => {
    const user = users?.find(u => u.id === id);
    return user ? `${user.prenom} ${user.nom}` : '—';
  };

  const filteredAffectations = affectations?.filter(a => {
    const immat = getVehiculeImmatriculation(a.vehicule_id).toLowerCase();
    const name = getChauffeurName(a.chauffeur_id).toLowerCase();
    const search = searchTerm.toLowerCase();
    return immat.includes(search) || name.includes(search);
  }) || [];

  const totalPages = Math.ceil(filteredAffectations.length / itemsPerPage);
  const paginated = filteredAffectations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MotionLayout variant="slideUp">
        <div className="space-y-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Users className="h-8 w-8" />
                {t('assignments.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('assignments.description')}
              </p>
            </div>
            <Button
              onClick={handleAddAffectation}
              variant="outline"
              size="sm"
              className="
                w-full sm:w-auto flex items-center justify-center gap-2
                px-4 py-2 rounded-md font-medium
                border border-blue-600 text-blue-600
                hover:bg-blue-50 hover:text-blue-700
                active:scale-95 transition-all duration-200
              "
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('assignments.addAssignment')}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <CardTitle>{filteredAffectations.length} affectations</CardTitle>
                  <CardDescription>
                    {t('assignments.searchResults')}
                  </CardDescription>
                </div>
                <div className="relative sm:ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('common.search')}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paginated.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? t('assignments.noResults') : t('assignments.noAssignments')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('assignments.vehicle')}</TableHead>
                          <TableHead>{t('assignments.driver')}</TableHead>
                          <TableHead>{t('assignments.startDate')}</TableHead>
                          <TableHead>{t('assignments.endDate')}</TableHead>
                          <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">
                              {getVehiculeImmatriculation(a.vehicule_id)}
                            </TableCell>
                            <TableCell>{getChauffeurName(a.chauffeur_id)}</TableCell>
                            <TableCell>
                              {format(new Date(a.date_debut), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {a.date_fin 
                                ? format(new Date(a.date_fin), 'dd/MM/yyyy HH:mm')
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditAffectation(a)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteClick(a.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <Pagination className="mt-6">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        {totalPages > 5 && (
                          <PaginationItem>
                            <span className="px-3 py-2 text-sm text-muted-foreground">...</span>
                          </PaginationItem>
                        )}
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
              )}
            </CardContent>
          </Card>
        </div>

        <AffectationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          affectation={selectedAffectation}
          onSuccess={() => {
            setDialogOpen(false);
            toast.success(selectedAffectation 
              ? t('assignments.assignmentUpdated')
              : t('assignments.assignmentCreated')
            );
          }}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('assignments.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('assignments.deleteConfirmText')}<br />
                <span className="font-medium">
                  {affectationToDelete && getVehiculeImmatriculation(
                    affectations?.find(a => a.id === affectationToDelete)?.vehicule_id || 0
                  )}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MotionLayout>
    </MainLayout>
  );
};

export default Affectations;