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
import { Plus, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentRole } from '@/lib/accessControl';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

const money = (value: number) => Number(value || 0).toLocaleString('fr-FR');

const Budgets = () => {
  const queryClient = useQueryClient();
  const currentRole = getCurrentRole();
  const canManageBudgets = currentRole !== 'auditor';
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/budgets`);
      if (!response.ok) throw new Error('Chargement impossible');
      return response.json();
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    module_type: 'global',
    scope_type: 'global',
    periode_debut: new Date().toISOString().slice(0, 10),
    periode_fin: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
    montant_prevu: 0,
    montant_reel: 0,
  });

  const createBudget = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/api/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Creation impossible');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Budget cree');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
    onError: () => toast.error('Erreur de creation'),
  });

  const totalPrevu = budgets.reduce((sum: number, item: any) => sum + Number(item.montant_prevu || 0), 0);
  const totalReel = budgets.reduce((sum: number, item: any) => sum + Number(item.montant_reel || 0), 0);
  const ecart = totalReel - totalPrevu;
  const isPeriodInvalid = Boolean(
    form.periode_debut &&
    form.periode_fin &&
    new Date(form.periode_fin) < new Date(form.periode_debut)
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Budgets</h1>
              <p className="text-muted-foreground mt-2">Budgets carburant, maintenance et comparaison prevu / reel</p>
            </div>
            {canManageBudgets && (
              <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouveau budget
              </Button>
            )}
          </div>
        </MotionWrapper>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <WalletCards className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Prevu</p>
                <p className="text-2xl font-bold">{money(totalPrevu)} Ar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Reel</p>
                <p className="text-2xl font-bold">{money(totalReel)} Ar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Ecart</p>
                <p className="text-2xl font-bold">{money(ecart)} Ar</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suivi budgetaire</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libelle</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Prevu</TableHead>
                    <TableHead>Reel</TableHead>
                    <TableHead>Execution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7}>Chargement...</TableCell></TableRow>
                  ) : budgets.length === 0 ? (
                    <TableRow><TableCell colSpan={7}>Aucun budget</TableCell></TableRow>
                  ) : budgets.map((budget: any) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.libelle}</TableCell>
                      <TableCell>{budget.module_type}</TableCell>
                      <TableCell>{budget.scope_type}</TableCell>
                      <TableCell>{new Date(budget.periode_debut).toLocaleDateString('fr-FR')} - {new Date(budget.periode_fin).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{money(budget.montant_prevu)} Ar</TableCell>
                      <TableCell>{money(budget.montant_reel)} Ar</TableCell>
                      <TableCell>
                        <Badge variant={Number(budget.ecart || 0) > 0 ? 'destructive' : 'secondary'}>
                          {budget.taux_execution ? `${budget.taux_execution}%` : '-'}
                        </Badge>
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
            <DialogTitle>Nouveau budget</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Libelle</Label>
              <Input value={form.libelle || ''} onChange={event => setForm({ ...form, libelle: event.target.value })} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Module</Label>
                <Select value={form.module_type} onValueChange={value => setForm({ ...form, module_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="carburant">Carburant</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={form.scope_type} onValueChange={value => setForm({ ...form, scope_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="site">Site</SelectItem>
                    <SelectItem value="direction">Direction</SelectItem>
                    <SelectItem value="vehicule">Vehicule</SelectItem>
                    <SelectItem value="periode">Periode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Debut</Label>
                <Input
                  type="date"
                  value={form.periode_debut}
                  max={form.periode_fin || undefined}
                  onChange={event => setForm({ ...form, periode_debut: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input
                  type="date"
                  value={form.periode_fin}
                  min={form.periode_debut || undefined}
                  onChange={event => setForm({ ...form, periode_fin: event.target.value })}
                />
                {isPeriodInvalid && (
                  <p className="text-xs text-destructive">La fin doit être après le début.</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Montant prevu</Label>
                <Input type="number" value={form.montant_prevu} onChange={event => setForm({ ...form, montant_prevu: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Montant reel</Label>
                <Input type="number" value={form.montant_reel} onChange={event => setForm({ ...form, montant_reel: Number(event.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => createBudget.mutate()} disabled={createBudget.isPending || isPeriodInvalid}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Budgets;
