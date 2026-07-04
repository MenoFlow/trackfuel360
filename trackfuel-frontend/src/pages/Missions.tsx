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
import { ClipboardList, Plus, Filter } from 'lucide-react';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { toast } from 'sonner';
import { useVehicules } from '@/hooks/useVehicules';
import { getCurrentRole } from '@/lib/accessControl';
import { AvailabilityConflictDialog } from '@/components/common/AvailabilityConflictDialog';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const STATUT_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  demande: { label: 'Demande', variant: 'outline', className: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
  validee: { label: 'Validée', variant: 'default', className: 'bg-blue-500 hover:bg-blue-600 text-white' },
  rejetee: { label: 'Rejetée', variant: 'destructive', className: '' },
  en_cours: { label: 'En cours', variant: 'default', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  terminee: { label: 'Terminée', variant: 'secondary', className: 'bg-slate-200 dark:bg-slate-700' },
};

const Missions = () => {
  const queryClient = useQueryClient();
  const currentRole = getCurrentRole();
  const canCreateMission = currentRole === 'admin' || currentRole === 'manager';
  const { data: missions = [], isLoading } = useQuery({
    queryKey: ['missions'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/missions`);
      if (!res.ok) throw new Error('Erreur chargement');
      return res.json();
    },
  });
  const { data: vehicules = [] } = useVehicules();
  const { data: chauffeurs = [] } = useQuery({
    queryKey: ['chauffeurs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/chauffeurs`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>({ date_depart: new Date().toISOString().slice(0, 16) });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityConflict, setAvailabilityConflict] = useState<any>(null);

  // Filters
  const [statutFilter, setStatutFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const createMission = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE}/api/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Création impossible' }));
        const apiError = new Error(err.error || 'Création impossible') as Error & { availability?: any };
        apiError.availability = err.availability;
        throw apiError;
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Mission créée avec succès');
      setForm({ date_depart: new Date().toISOString().slice(0, 16) });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['affectations'] });
    },
    onError: (error: Error & { availability?: any }) => {
      if (error.availability) {
        setAvailabilityConflict(error.availability);
        return;
      }
      toast.error(error.message || 'Erreur lors de la création');
    },
    onSettled: () => setIsSubmitting(false),
  });

  // Filtering
  const filtered = missions.filter((m: any) => {
    if (statutFilter !== 'all' && m.statut !== statutFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const resetForm = () => {
    setForm({ date_depart: new Date().toISOString().slice(0, 16) });
    setAvailabilityConflict(null);
  };

  const isDateRangeInvalid = Boolean(
    form.date_depart &&
    form.date_retour_prevue &&
    new Date(form.date_retour_prevue) <= new Date(form.date_depart)
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">Ordres de mission</h1>
              <p className="text-muted-foreground mt-2">
                {filtered.length} mission{filtered.length !== 1 ? 's' : ''} • Demandes, validations et suivi
              </p>
            </div>
            {canCreateMission && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all duration-200"
                onClick={() => { resetForm(); setDialogOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                Nouvelle mission
              </Button>
            )}
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
                  <Label>Statut</Label>
                  <Select value={statutFilter} onValueChange={v => { setStatutFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="demande">Demande</SelectItem>
                      <SelectItem value="validee">Validée</SelectItem>
                      <SelectItem value="rejetee">Rejetée</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="terminee">Terminée</SelectItem>
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
                        <TableHead>Destination</TableHead>
                        <TableHead>Véhicule</TableHead>
                        <TableHead>Conducteur</TableHead>
                        <TableHead>Date départ</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Justification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((mission: any) => {
                        const config = STATUT_CONFIG[mission.statut] || STATUT_CONFIG.demande;
                        return (
                          <TableRow key={mission.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-md">
                                  <ClipboardList className="h-4 w-4 text-primary" />
                                </div>
                                {mission.destination}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{mission.immatriculation || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">{mission.chauffeur || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {mission.date_depart ? new Date(mission.date_depart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">{mission.motif}</TableCell>
                            <TableCell>
                              <Badge className={config.className}>{config.label}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[240px] text-muted-foreground">
                              {mission.motif_rejet ? (
                                <span className="text-destructive">{mission.motif_rejet}</span>
                              ) : (
                                '—'
                              )}
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
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune mission trouvée</p>
              {canCreateMission && (
                <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Créer une mission
                </Button>
              )}
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

      {/* Modal - Nouvelle mission */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle mission</DialogTitle>
            <DialogDescription>Créer un ordre de mission pour un véhicule et un conducteur.</DialogDescription>
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
                    <SelectItem key={v.id} value={v.id.toString()}>{v.immatriculation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conducteur <span className="text-destructive">*</span></Label>
              <Select value={form.chauffeur_id?.toString() || ''} onValueChange={v => setForm({ ...form, chauffeur_id: Number(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un conducteur" />
                </SelectTrigger>
                <SelectContent>
                  {chauffeurs.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.prenom} {c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destination <span className="text-destructive">*</span></Label>
              <Input placeholder="Ex: Antananarivo" value={form.destination || ''} onChange={e => setForm({ ...form, destination: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Date de départ <span className="text-destructive">*</span></Label>
              <Input
                type="datetime-local"
                value={form.date_depart || ''}
                max={form.date_retour_prevue || undefined}
                onChange={e => setForm({ ...form, date_depart: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Date retour prévue <span className="text-destructive">*</span></Label>
              <Input
                type="datetime-local"
                value={form.date_retour_prevue || ''}
                min={form.date_depart || undefined}
                onChange={e => setForm({ ...form, date_retour_prevue: e.target.value })}
              />
              {isDateRangeInvalid && (
                <p className="text-xs text-destructive">La date retour prévue doit être après la date de départ.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Kilométrage départ</Label>
              <Input type="number" placeholder="Ex: 125000" value={form.kilometrage_depart || ''} onChange={e => setForm({ ...form, kilometrage_depart: Number(e.target.value) })} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Motif <span className="text-destructive">*</span></Label>
              <Textarea placeholder="Motif de la mission..." value={form.motif || ''} onChange={e => setForm({ ...form, motif: e.target.value })} />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              onClick={() => createMission.mutate()}
              disabled={isSubmitting || !form.vehicule_id || !form.chauffeur_id || !form.destination || !form.motif || !form.date_retour_prevue || isDateRangeInvalid}
            >
              {isSubmitting ? 'Création...' : 'Créer la mission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AvailabilityConflictDialog
        open={Boolean(availabilityConflict)}
        onOpenChange={(isOpen) => !isOpen && setAvailabilityConflict(null)}
        availability={availabilityConflict}
      />
    </MainLayout>
  );
};

export default Missions;
