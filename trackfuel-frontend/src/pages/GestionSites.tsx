// src/pages/GestionSites.tsx
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MainLayout } from '@/components/Layout/MainLayout';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Filter,
  Search,
} from 'lucide-react';
import { useSites, useDeleteSite } from '@/hooks/useSites';
import { SiteFormDialog } from '@/components/Sites/SiteFormDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Site } from '@/types';
import { useToast } from '@/hooks/use-toast';

const ITEMS_PER_PAGE = 7;

const GestionSites = () => {
  const { t } = useTranslation();
  const { data: sites = [], isLoading } = useSites();
  const deleteSite = useDeleteSite();
  const { toast } = useToast();

  // États filtres & recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Dialogues
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  // Liste des pays uniques
  const countries = useMemo(() => {
    return Array.from(new Set(sites.map(s => s.pays))).sort();
  }, [sites]);

  // Recherche + filtre combinés
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = searchLower === '' || 
        site.nom.toLowerCase().includes(searchLower) ||
        site.ville.toLowerCase().includes(searchLower);

      const matchesCountry = countryFilter === 'all' || site.pays === countryFilter;

      return matchesSearch && matchesCountry;
    });
  }, [sites, searchQuery, countryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
  const paginatedSites = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSites.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSites, currentPage]);

  // Reset page quand les résultats changent
  useMemo(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    if (totalPages === 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Toujours revenir à la page 1 lors d'une recherche
  };

  const handleCountryChange = (value: string) => {
    setCountryFilter(value);
    setCurrentPage(1);
  };

  const handleAdd = () => {
    setSelectedSite(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (site: Site) => {
    setSelectedSite(site);
    setDialogOpen(true);
  };

  const handleDeleteClick = (site: Site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!siteToDelete) return;

    deleteSite.mutate(siteToDelete.id, {
      onSuccess: () => {
        toast({ title: t('sites.deleteSuccess') });
        setDeleteDialogOpen(false);
        setSiteToDelete(null);
        if (filteredSites.length === 1 && currentPage > 1) {
          setCurrentPage(p => p - 1);
        }
      },
      onError: () => {
        toast({ title: t('sites.deleteError'), variant: 'destructive' });
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                {t('sites.title')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {filteredSites.length} {filteredSites.length === 1 ? t('sites.siteSingular') : t('sites.sitePlural')}
              </p>
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('sites.addSite')}
            </Button>
          </div>
        </MotionWrapper>

        {/* Filtres & Recherche */}
        <MotionWrapper variant="slideUp" delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('common.filter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Recherche par nom OU ville */}
                <div className="flex flex-col space-y-2">
                  <Label>{t('common.search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('common.search')}
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filtre par pays */}
                <div className="flex flex-col space-y-2">
                  <Label>{t('sites.country')}</Label>
                  <Select value={countryFilter} onValueChange={handleCountryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('sites.country')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('sites.country')}</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </CardContent>
          </Card>
        </MotionWrapper>


        {/* Tableau + Pagination */}
        <MotionWrapper variant="fade" delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle>{t('sites.sitesList')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : filteredSites.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery || countryFilter !== 'all'
                    ? t('sites.noResults')
                    : t('sites.noSites')}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('sites.name')}</TableHead>
                        <TableHead>{t('sites.city')}</TableHead>
                        <TableHead>{t('sites.country')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSites.map(site => (
                        <TableRow key={site.id}>
                          <TableCell className="font-medium">{site.nom}</TableCell>
                          <TableCell>{site.ville}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{site.pays}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(site)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(site)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination numérotée (comme dans Véhicules) */}
                  {totalPages > 1 && (
                    <div className="mt-6 border-t pt-4">
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
              )}
            </CardContent>
          </Card>
        </MotionWrapper>
      </div>

      <SiteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        site={selectedSite}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('sites.confirmDelete')}
        description={t('sites.confirmDeleteDesc', { name: siteToDelete?.nom })}
        confirmText={t('common.delete')}
        icon={Trash2}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteSite.isPending}
      />
    </MainLayout>
  );
};

export default GestionSites;