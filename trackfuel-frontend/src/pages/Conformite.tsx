import { useState } from 'react';
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
import { FileCheck, Plus, Filter, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { toast } from 'sonner';
import { useVehicules } from '@/hooks/useVehicules';
import { getCurrentRole } from '@/lib/accessControl';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const TYPES_DOC = ['assurance', 'visite_technique', 'vignette', 'carte_grise', 'permis', 'visite_medicale'] as const;

const TYPE_LABELS: Record<string, string> = {
  assurance: 'Assurance',
  visite_technique: 'Visite technique',
  vignette: 'Vignette',
  carte_grise: 'Carte grise',
  permis: 'Permis',
  visite_medicale: 'Visite médicale',
};

const DOC_RULES: Record<string, {
  owner: 'vehicule' | 'chauffeur';
  rappelJours: number;
  validityMonths: number;
  referencePlaceholder: string;
  helper: string;
}> = {
  assurance: {
    owner: 'vehicule',
    rappelJours: 30,
    validityMonths: 12,
    referencePlaceholder: 'Ex: POL-2026-1234',
    helper: 'Document lié à un véhicule. Rappel fixe 30 jours avant expiration.',
  },
  visite_technique: {
    owner: 'vehicule',
    rappelJours: 30,
    validityMonths: 12,
    referencePlaceholder: 'Ex: VT-2026-045',
    helper: 'Document lié à un véhicule. Rappel fixe 30 jours avant expiration.',
  },
  vignette: {
    owner: 'vehicule',
    rappelJours: 15,
    validityMonths: 12,
    referencePlaceholder: 'Ex: VIG-2026-001',
    helper: 'Document lié à un véhicule. Rappel fixe 15 jours avant expiration.',
  },
  carte_grise: {
    owner: 'vehicule',
    rappelJours: 365,
    validityMonths: 120,
    referencePlaceholder: 'Ex: CG-1234-TAD',
    helper: 'Document lié à un véhicule. Rappel fixe 365 jours avant la date de contrôle saisie.',
  },
  permis: {
    owner: 'chauffeur',
    rappelJours: 60,
    validityMonths: 60,
    referencePlaceholder: 'Ex: P-1234567',
    helper: 'Document lié à un chauffeur. Sa date alimente automatiquement la page Chauffeurs.',
  },
  visite_medicale: {
    owner: 'chauffeur',
    rappelJours: 30,
    validityMonths: 12,
    referencePlaceholder: 'Ex: VM-2026-001',
    helper: 'Document lié à un chauffeur. Sa date alimente automatiquement la page Chauffeurs.',
  },
};

const ETAT_CONFIG: Record<string, { label: string; className: string; icon: typeof ShieldCheck }> = {
  conforme: { label: 'Conforme', className: 'bg-emerald-500 hover:bg-emerald-600 text-white', icon: ShieldCheck },
  bientot_expire: { label: 'Bientôt expiré', className: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30', icon: Clock },
  expire: { label: 'Expiré', className: 'bg-red-500 hover:bg-red-600 text-white', icon: AlertTriangle },
};

const addMonthsToDate = (dateStr: string, months: number) => {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
};

const Conformite = () => {
  const queryClient = useQueryClient();
  const currentRole = getCurrentRole();
  const canManageDocuments = currentRole !== 'auditor';
  const { data: vehicules = [] } = useVehicules();
  const { data: chauffeurs = [] } = useQuery({
    queryKey: ['chauffeurs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/chauffeurs`);
      if (!res.ok) return [];
      return res.json();
    },
  });
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents-rappels'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/documents/rappels`);
      if (!res.ok) throw new Error('Erreur chargement');
      return res.json();
    },
  });

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: 'assurance', rappel_jours: DOC_RULES.assurance.rappelJours });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [etatFilter, setEtatFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const createDocument = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      const rule = DOC_RULES[form.type] || DOC_RULES.assurance;
      const payload = {
        ...form,
        rappel_jours: rule.rappelJours,
        vehicule_id: rule.owner === 'vehicule' ? form.vehicule_id : null,
        chauffeur_id: rule.owner === 'chauffeur' ? form.chauffeur_id : null,
      };
      const response = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Creation impossible');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Document ajouté avec succès');
      setForm({ type: 'assurance', rappel_jours: DOC_RULES.assurance.rappelJours });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['documents-rappels'] });
    },
    onError: () => toast.error('Erreur lors de la création'),
    onSettled: () => setIsSubmitting(false),
  });

  // Filtering
  const filtered = documents.filter((d: any) => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (etatFilter !== 'all' && d.etat_conformite !== etatFilter) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const resetForm = () => {
    setForm({ type: 'assurance', rappel_jours: DOC_RULES.assurance.rappelJours });
  };

  const currentRule = DOC_RULES[form.type] || DOC_RULES.assurance;
  const ownerSelected = currentRule.owner === 'vehicule' ? Boolean(form.vehicule_id) : Boolean(form.chauffeur_id);
  const isDocumentDateInvalid = Boolean(
    form.delivre_le &&
    form.expire_le &&
    new Date(form.expire_le) <= new Date(form.delivre_le)
  );
  const handleTypeChange = (type: string) => {
    const rule = DOC_RULES[type] || DOC_RULES.assurance;
    setForm((prev: any) => ({
      ...prev,
      type,
      rappel_jours: rule.rappelJours,
      vehicule_id: rule.owner === 'vehicule' ? prev.vehicule_id : null,
      chauffeur_id: rule.owner === 'chauffeur' ? prev.chauffeur_id : null,
      expire_le: prev.delivre_le ? addMonthsToDate(prev.delivre_le, rule.validityMonths) : prev.expire_le,
    }));
  };

  const handleDeliveryDateChange = (delivre_le: string) => {
    setForm((prev: any) => ({
      ...prev,
      delivre_le,
      expire_le: delivre_le ? addMonthsToDate(delivre_le, currentRule.validityMonths) : prev.expire_le,
    }));
  };

  // Stats
  const expires = documents.filter((d: any) => d.etat_conformite === 'expire').length;
  const bientotExpires = documents.filter((d: any) => d.etat_conformite === 'bientot_expire').length;
  const conformes = documents.filter((d: any) => d.etat_conformite === 'conforme').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-foreground">Conformité</h1>
              <p className="text-muted-foreground mt-2">
                Assurance, visite technique, documents obligatoires et visites médicales
              </p>
            </div>
            {canManageDocuments && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all duration-200"
                onClick={() => { resetForm(); setDialogOpen(true); }}
              >
                <Plus className="h-4 w-4" />
                Ajouter un document
              </Button>
            )}
          </div>
        </MotionWrapper>

        {/* Stats cards */}
        <MotionWrapper variant="slideUp" delay={0.05}>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-950/40 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expirés</p>
                    <p className="text-2xl font-bold text-red-600">{expires}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bientôt expirés</p>
                    <p className="text-2xl font-bold text-amber-600">{bientotExpires}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conformes</p>
                    <p className="text-2xl font-bold text-emerald-600">{conformes}</p>
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
                  <Label>Type de document</Label>
                  <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {TYPES_DOC.map(t => (
                        <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>État</Label>
                  <Select value={etatFilter} onValueChange={v => { setEtatFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="conforme">Conforme</SelectItem>
                      <SelectItem value="bientot_expire">Bientôt expiré</SelectItem>
                      <SelectItem value="expire">Expiré</SelectItem>
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
                        <TableHead>Référence</TableHead>
                        <TableHead>Véhicule / Chauffeur</TableHead>
                        <TableHead>Délivré le</TableHead>
                        <TableHead>Expire le</TableHead>
                        <TableHead>Rappel</TableHead>
                        <TableHead>État</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((doc: any) => {
                        const config = ETAT_CONFIG[doc.etat_conformite] || ETAT_CONFIG.conforme;
                        const EtatIcon = config.icon;
                        return (
                          <TableRow key={doc.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-md">
                                  <FileCheck className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium">{TYPE_LABELS[doc.type] || doc.type}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{doc.reference || '—'}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {doc.immatriculation || doc.chauffeur || 'Non associé'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {doc.delivre_le ? new Date(doc.delivre_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {doc.expire_le ? new Date(doc.expire_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{doc.rappel_jours}j avant</TableCell>
                            <TableCell>
                              <Badge className={config.className}>
                                <EtatIcon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
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
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun document trouvé</p>
              {canManageDocuments && (
                <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Ajouter un document
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

      {/* Modal - Ajouter un document */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>Enregistrer un document administratif avec rappel d'expiration.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2 py-4">
            <div className="space-y-2">
              <Label>Type de document <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_DOC.map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Référence</Label>
              <Input placeholder={currentRule.referencePlaceholder} value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} />
            </div>

            {currentRule.owner === 'vehicule' && (
            <div className="space-y-2 md:col-span-2">
              <Label>Véhicule associé <span className="text-destructive">*</span></Label>
              <Select value={form.vehicule_id?.toString() || 'none'} onValueChange={v => setForm({ ...form, vehicule_id: v === 'none' ? null : Number(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicules.map((v: any) => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.immatriculation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}

            {currentRule.owner === 'chauffeur' && (
            <div className="space-y-2 md:col-span-2">
              <Label>Chauffeur associé <span className="text-destructive">*</span></Label>
              <Select value={form.chauffeur_id?.toString() || 'none'} onValueChange={v => setForm({ ...form, chauffeur_id: v === 'none' ? null : Number(v) })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  {chauffeurs.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.prenom} {c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}

            <div className="md:col-span-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              {currentRule.helper}
            </div>

            <div className="space-y-2">
              <Label>Date de délivrance</Label>
              <Input
                type="date"
                value={form.delivre_le || ''}
                max={form.expire_le || undefined}
                onChange={e => handleDeliveryDateChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Date d'expiration <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.expire_le || ''}
                min={form.delivre_le || undefined}
                onChange={e => setForm({ ...form, expire_le: e.target.value })}
              />
              {isDocumentDateInvalid && (
                <p className="text-xs text-destructive">La date d'expiration doit être après la date de délivrance.</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Rappel</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Fixe: {currentRule.rappelJours} jour(s) avant expiration
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              onClick={() => createDocument.mutate()}
              disabled={isSubmitting || !form.expire_le || !ownerSelected || isDocumentDateInvalid}
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter le document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Conformite;
