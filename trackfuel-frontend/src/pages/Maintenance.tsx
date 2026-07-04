import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Wrench, Plus, Filter, Play, CheckCircle2 } from 'lucide-react';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { toast } from 'sonner';
import { useVehicules } from '@/hooks/useVehicules';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const TYPES_MAINTENANCE = ['vidange', 'pneus', 'freins', 'batterie', 'filtres', 'revision', 'reparation', 'panne', 'accident'] as const;

const TYPE_LABELS: Record<string, string> = {
  vidange: 'Vidange',
  pneus: 'Pneus',
  freins: 'Freins',
  batterie: 'Batterie',
  filtres: 'Filtres',
  revision: 'Révision',
  reparation: 'Réparation',
  panne: 'Panne',
  accident: 'Accident',
};

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  planifie: { label: 'Planifié', className: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  en_cours: { label: 'En cours', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
  termine: { label: 'Terminé', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  annule: { label: 'Annulé', className: 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200' },
};

const Maintenance = () => {
  const queryClient = useQueryClient();
  const { data: vehicules = [] } = useVehicules();
  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/maintenance`);
      if (!res.ok) throw new Error('Erreur chargement');
      return res.json();
    },
  });

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: 'revision', statut: 'planifie' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [statutFilter, setStatutFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const createIntervention = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/api/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Creation impossible');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Intervention planifiée avec succès');
      setForm({ type: 'revision', statut: 'planifie' });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: () => toast.error('Erreur lors de la création'),
    onSettled: () => setIsSubmitting(false),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, statut, date_realisation }: { id: number; statut: string; date_realisation?: string }) => {
      const response = await fetch(`${API_BASE}/api/maintenance/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut, date_realisation }),
      });
      if (!response.ok) throw new Error('Mise a jour impossible');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Statut mis à jour');
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicules'] });
    },
    onError: () => toast.error('Erreur de mise à jour'),
  });

  // Filtering
  const filtered = interventions.filter((m: any) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (statutFilter !== 'all' && m.statut !== statutFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const resetForm = () => {
    setForm({ type: 'revision', statut: 'planifie' });
  };

  // Stats
  const totalCout = interventions.reduce((acc: number, i: any) => acc + Number(i.cout || 0), 0);
  const planifies = interventions.filter((i: any) => i.statut === 'planifie').length;
  const enCours = interventions.filter((i: any) => i.statut === 'en_cours').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">Maintenance</h1>
              <p className="text-muted-foreground mt-2">
                Entretiens préventifs, réparations et suivi des interventions
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all duration-200"
              onClick={() => { resetForm(); setDialogOpen(true); }}
            >
              <Plus className="h-4 w-4" />
              Planifier une intervention
            </Button>
          </div>
        </MotionWrapper>

        {/* Stats cards */}
        <MotionWrapper variant="slideUp" delay={0.05}>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg">
                    <Wrench className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Planifiées</p>
                    <p className="text-2xl font-bold">{planifies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-lg">
                    <Play className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">En cours</p>
                    <p className="text-2xl font-bold">{enCours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coût total</p>
                    <p className="text-2xl font-bold">{totalCout.toLocaleString('fr-FR')} Ar</p>
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
                  <Label>Type</Label>
                  <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {TYPES_MAINTENANCE.map(t => (
                        <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={statutFilter} onValueChange={v => { setStatutFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="planifie">Planifié</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="termine">Terminé</SelectItem>
                      <SelectItem value="annule">Annulé</SelectItem>
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
                        <TableHead>Type</TableHead>
                        <TableHead>Véhicule</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date prévue</TableHead>
                        <TableHead>Coût</TableHead>
                        <TableHead>Prestataire</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((item: any) => {
                        const config = STATUT_CONFIG[item.statut] || STATUT_CONFIG.planifie;
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-md">
                                  <Wrench className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium capitalize">{TYPE_LABELS[item.type] || item.type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.immatriculation || '—'}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">{item.description}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.date_prevue ? new Date(item.date_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell className="font-medium">{Number(item.cout || 0).toLocaleString('fr-FR')} Ar</TableCell>
                            <TableCell className="text-muted-foreground">{item.prestataire || '—'}</TableCell>
                            <TableCell>
                              <Badge className={config.className}>{config.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {item.statut === 'planifie' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1"
                                    onClick={() => updateStatus.mutate({ id: item.id, statut: 'en_cours' })}
                                  >
                                    <Play className="h-3 w-3" /> Démarrer
                                  </Button>
                                )}
                                {item.statut === 'en_cours' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1"
                                    onClick={() => updateStatus.mutate({
                                      id: item.id,
                                      statut: 'termine',
                                      date_realisation: new Date().toISOString().slice(0, 10),
                                    })}
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Terminer
                                  </Button>
                                )}
                              </div>
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
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune intervention trouvée</p>
              <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Planifier une intervention
              </Button>
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

      {/* Modal - Nouvelle intervention */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planifier une intervention</DialogTitle>
            <DialogDescription>Programmer un entretien ou une réparation pour un véhicule.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 py-4">
            <div className="space-y-2">
              <Label>Véhicule <span className="text-destructive">*</span></Label>
              <Select value={form.vehicule_id?.toString() || ''} onValueChange={v => setForm({ ...form, vehicule_id: Number(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicules.map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.immatriculation} — {v.marque} {v.modele}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_MAINTENANCE.map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date prévue</Label>
              <Input type="date" value={form.date_prevue || ''} onChange={e => setForm({ ...form, date_prevue: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Kilométrage prévu</Label>
              <Input type="number" placeholder="Ex: 150000" value={form.kilometrage_prevu || ''} onChange={e => setForm({ ...form, kilometrage_prevu: Number(e.target.value) })} />
            </div>

            <div className="space-y-2">
              <Label>Coût estimé (Ar)</Label>
              <Input type="number" placeholder="Ex: 250000" value={form.cout || ''} onChange={e => setForm({ ...form, cout: Number(e.target.value) })} />
            </div>

            <div className="space-y-2">
              <Label>Prestataire</Label>
              <Input placeholder="Ex: Garage Central" value={form.prestataire || ''} onChange={e => setForm({ ...form, prestataire: e.target.value })} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea placeholder="Détails de l'intervention..." value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              onClick={() => createIntervention.mutate()}
              disabled={isSubmitting || !form.vehicule_id || !form.description}
            >
              {isSubmitting ? 'Planification...' : 'Planifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Maintenance;
