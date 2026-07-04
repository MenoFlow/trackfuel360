import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { MotionWrapper } from '@/components/Layout/MotionWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, CheckCircle2, Clock, Plus, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useVehicules } from '@/hooks/useVehicules';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const statusLabels: Record<string, string> = {
  demandee: 'Demandee',
  confirmee: 'Confirmee',
  annulee: 'Annulee',
  terminee: 'Terminee',
};

const statusClass: Record<string, string> = {
  demandee: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  confirmee: 'bg-blue-500 hover:bg-blue-600 text-white',
  annulee: 'bg-red-500 hover:bg-red-600 text-white',
  terminee: 'bg-emerald-500 hover:bg-emerald-600 text-white',
};

const Planning = () => {
  const queryClient = useQueryClient();
  const { data: vehicules = [] } = useVehicules();
  const { data: chauffeurs = [] } = useQuery({
    queryKey: ['chauffeurs'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/chauffeurs`);
      return response.ok ? response.json() : [];
    },
  });
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['planning'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/planning`);
      if (!response.ok) throw new Error('Chargement impossible');
      return response.json();
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    date_debut: new Date().toISOString().slice(0, 16),
    date_fin: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const createReservation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/api/planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Creation impossible');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Reservation creee');
      setOpen(false);
      setForm({
        date_debut: new Date().toISOString().slice(0, 16),
        date_fin: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
    onError: (error: any) => toast.error(error.message || 'Erreur de creation'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, statut }: { id: number; statut: string }) => {
      const response = await fetch(`${API_BASE}/api/planning/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      if (!response.ok) throw new Error('Mise a jour impossible');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Statut mis a jour');
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
    onError: () => toast.error('Erreur de mise a jour'),
  });

  const actives = reservations.filter((item: any) => ['demandee', 'confirmee'].includes(item.statut)).length;
  const confirmees = reservations.filter((item: any) => item.statut === 'confirmee').length;
  const terminees = reservations.filter((item: any) => item.statut === 'terminee').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Planning</h1>
              <p className="text-muted-foreground mt-2">Disponibilite, reservations et immobilisations prevues</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Nouvelle reservation
            </Button>
          </div>
        </MotionWrapper>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Actives</p>
                <p className="text-2xl font-bold">{actives}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmees</p>
                <p className="text-2xl font-bold">{confirmees}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Terminees</p>
                <p className="text-2xl font-bold">{terminees}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reservations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicule</TableHead>
                    <TableHead>Conducteur</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Debut</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7}>Chargement...</TableCell></TableRow>
                  ) : reservations.length === 0 ? (
                    <TableRow><TableCell colSpan={7}>Aucune reservation</TableCell></TableRow>
                  ) : reservations.map((reservation: any) => (
                    <TableRow key={reservation.id}>
                      <TableCell>{reservation.immatriculation || '-'}</TableCell>
                      <TableCell>{reservation.chauffeur || '-'}</TableCell>
                      <TableCell>{reservation.motif}</TableCell>
                      <TableCell>{new Date(reservation.date_debut).toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{new Date(reservation.date_fin).toLocaleString('fr-FR')}</TableCell>
                      <TableCell>
                        <Badge className={statusClass[reservation.statut]}>{statusLabels[reservation.statut]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {reservation.statut === 'demandee' && (
                            <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: reservation.id, statut: 'confirmee' })}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {['demandee', 'confirmee'].includes(reservation.statut) && (
                            <Button size="icon" variant="ghost" onClick={() => updateStatus.mutate({ id: reservation.id, statut: 'annulee' })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle reservation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Vehicule</Label>
              <Select value={form.vehicule_id?.toString() || ''} onValueChange={value => setForm({ ...form, vehicule_id: Number(value) })}>
                <SelectTrigger><SelectValue placeholder="Selectionner" /></SelectTrigger>
                <SelectContent>
                  {vehicules.map(vehicule => (
                    <SelectItem key={vehicule.id} value={vehicule.id!.toString()}>{vehicule.immatriculation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conducteur</Label>
              <Select value={form.chauffeur_id?.toString() || ''} onValueChange={value => setForm({ ...form, chauffeur_id: Number(value) })}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  {chauffeurs.map((chauffeur: any) => (
                    <SelectItem key={chauffeur.id} value={chauffeur.id.toString()}>{chauffeur.prenom} {chauffeur.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motif</Label>
              <Input value={form.motif || ''} onChange={event => setForm({ ...form, motif: event.target.value })} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Debut</Label>
                <Input type="datetime-local" value={form.date_debut || ''} onChange={event => setForm({ ...form, date_debut: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="datetime-local" value={form.date_fin || ''} onChange={event => setForm({ ...form, date_fin: event.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => createReservation.mutate()} disabled={createReservation.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Planning;
