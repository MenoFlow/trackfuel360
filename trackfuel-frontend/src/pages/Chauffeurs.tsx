import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
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
import { Users, Edit, Filter, Phone, CreditCard, Stethoscope, AlertTriangle, CheckCircle2, Clock, FileCheck } from 'lucide-react';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const fetchChauffeurs = async () => {
  const response = await fetch(`${API_BASE}/api/chauffeurs`);
  if (!response.ok) throw new Error('Impossible de charger les chauffeurs');
  return response.json();
};

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  actif: { label: 'Actif', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  suspendu: { label: 'Suspendu', className: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  inactif: { label: 'Inactif', className: 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200' },
};

const getDocStatus = (dateStr: string | null): 'ok' | 'soon' | 'expired' | 'none' => {
  if (!dateStr) return 'none';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'expired';
  if (diff < 30) return 'soon';
  return 'ok';
};

const DocStatusBadge = ({ date, label }: { date: string | null; label: string }) => {
  const status = getDocStatus(date);
  if (status === 'none') return <span className="text-xs text-muted-foreground">Non renseigné</span>;

  const configs = {
    ok: { icon: CheckCircle2, className: 'text-emerald-600', text: date ? new Date(date).toLocaleDateString('fr-FR') : '' },
    soon: { icon: Clock, className: 'text-amber-600', text: date ? `Expire le ${new Date(date).toLocaleDateString('fr-FR')}` : '' },
    expired: { icon: AlertTriangle, className: 'text-red-600', text: date ? `Expiré le ${new Date(date).toLocaleDateString('fr-FR')}` : '' },
  };

  const config = configs[status];
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1 text-xs ${config.className}`}>
      <Icon className="h-3 w-3" />
      <span>{config.text}</span>
    </div>
  );
};

const Chauffeurs = () => {
  const queryClient = useQueryClient();
  const { data: chauffeurs = [], isLoading } = useQuery({ queryKey: ['chauffeurs'], queryFn: fetchChauffeurs });

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChauffeur, setEditingChauffeur] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [statutFilter, setStatutFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const updateProfile = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/api/chauffeurs/${id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Mise a jour impossible');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Fiche chauffeur mise à jour');
      setDialogOpen(false);
      setEditingChauffeur(null);
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
    onSettled: () => setIsSubmitting(false),
  });

  const handleEdit = (chauffeur: any) => {
    setEditingChauffeur(chauffeur);
    setForm({
      telephone: chauffeur.telephone || '',
      permis_numero: chauffeur.permis_numero || '',
      permis_categorie: chauffeur.permis_categorie || '',
      statut: chauffeur.statut || 'actif',
    });
    setDialogOpen(true);
  };

  // Filtering
  const filtered = chauffeurs.filter((c: any) => {
    if (statutFilter !== 'all' && (c.statut || 'actif') !== statutFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = `${c.prenom} ${c.nom} ${c.matricule} ${c.email}`.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Stats
  const actifs = chauffeurs.filter((c: any) => (c.statut || 'actif') === 'actif').length;
  const permisExpires = chauffeurs.filter((c: any) => getDocStatus(c.permis_expire_le) === 'expired').length;
  const visitesExpirees = chauffeurs.filter((c: any) => getDocStatus(c.visite_medicale_expire_le) === 'expired').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">Chauffeurs</h1>
              <p className="text-muted-foreground mt-2">
                Fiches chauffeurs et suivi des documents depuis la conformité
              </p>
            </div>
          </div>
        </MotionWrapper>

        {/* Stats cards */}
        <MotionWrapper variant="slideUp" delay={0.05}>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chauffeurs actifs</p>
                    <p className="text-2xl font-bold">{actifs} / {chauffeurs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-lg">
                    <CreditCard className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Permis expirés</p>
                    <p className="text-2xl font-bold text-red-600">{permisExpires}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-lg">
                    <Stethoscope className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Visites médicales expirées</p>
                    <p className="text-2xl font-bold text-red-600">{visitesExpirees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </MotionWrapper>

        {/* Filters */}
        <MotionWrapper variant="slideUp" delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Recherche</Label>
                  <Input
                    placeholder="Nom, prénom, matricule..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={statutFilter} onValueChange={v => { setStatutFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="suspendu">Suspendu</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionWrapper>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : paginated.length > 0 ? (
          <MotionWrapper variant="slideUp" delay={0.2}>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chauffeur</TableHead>
                        <TableHead>Matricule</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Permis</TableHead>
                        <TableHead>Visite médicale</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((chauffeur: any) => {
                        const config = STATUT_CONFIG[chauffeur.statut || 'actif'] || STATUT_CONFIG.actif;
                        return (
                          <TableRow key={chauffeur.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Users className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{chauffeur.prenom} {chauffeur.nom}</p>
                                  <p className="text-xs text-muted-foreground">{chauffeur.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{chauffeur.matricule}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {chauffeur.telephone ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {chauffeur.telephone}
                                </div>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">
                                  {chauffeur.permis_numero || 'Non renseigné'}
                                  {chauffeur.permis_categorie && ` (${chauffeur.permis_categorie})`}
                                </p>
                                <DocStatusBadge date={chauffeur.permis_expire_le} label="Permis" />
                                {chauffeur.permis_document_reference && (
                                  <p className="text-[11px] text-muted-foreground">Doc: {chauffeur.permis_document_reference}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                <DocStatusBadge date={chauffeur.visite_medicale_expire_le} label="Visite" />
                                {chauffeur.visite_medicale_document_reference && (
                                  <p className="text-[11px] text-muted-foreground">Doc: {chauffeur.visite_medicale_document_reference}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={config.className}>{config.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1"
                                onClick={() => handleEdit(chauffeur)}
                              >
                                <Edit className="h-3 w-3" /> Modifier
                              </Button>
                              <Button asChild size="sm" variant="ghost" className="ml-2 h-8 px-2" title="Gerer les documents de conformite">
                                <Link to="/conformite">
                                  <FileCheck className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </MotionWrapper>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {chauffeurs.length === 0
                  ? 'Aucun chauffeur trouvé. Les chauffeurs sont les utilisateurs avec le rôle "driver".'
                  : 'Aucun résultat pour les filtres sélectionnés'
                }
              </p>
            </CardContent>
          </Card>
        )}

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
      </div>

      {/* Modal - Modifier fiche chauffeur */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingChauffeur(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifier la fiche — {editingChauffeur?.prenom} {editingChauffeur?.nom}
            </DialogTitle>
            <DialogDescription>
              Mettre à jour le contact, le statut et les informations non expiratives du permis. Les dates d'expiration se gèrent dans Conformité.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 py-4">
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                placeholder="Ex: +261 34 00 000 00"
                value={form.telephone || ''}
                onChange={e => setForm({ ...form, telephone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.statut || 'actif'} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Numéro de permis</Label>
              <Input
                placeholder="Ex: P-1234567"
                value={form.permis_numero || ''}
                onChange={e => setForm({ ...form, permis_numero: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie permis</Label>
              <Input
                placeholder="Ex: B, C, D"
                value={form.permis_categorie || ''}
                onChange={e => setForm({ ...form, permis_categorie: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Les dates d'expiration du permis et de la visite médicale proviennent des documents de conformité associés au chauffeur.
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (editingChauffeur) {
                  updateProfile.mutate({ id: editingChauffeur.id, data: form });
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Chauffeurs;
