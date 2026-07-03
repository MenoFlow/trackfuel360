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
import { PackageSearch, Plus, Upload, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useVehicules } from '@/hooks/useVehicules';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const money = (value: number) => Number(value || 0).toLocaleString('fr-FR');

const AtelierStock = () => {
  const queryClient = useQueryClient();
  const { data: vehicules = [] } = useVehicules();
  const { data: pieces = [], isLoading } = useQuery({
    queryKey: ['stock-pieces'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/stock`);
      if (!response.ok) throw new Error('Chargement impossible');
      return response.json();
    },
  });

  const [pieceOpen, setPieceOpen] = useState(false);
  const [sortieOpen, setSortieOpen] = useState(false);
  const [pieceForm, setPieceForm] = useState<any>({ quantite: 0, seuil_critique: 0, cout_unitaire: 0 });
  const [sortieForm, setSortieForm] = useState<any>({});

  const createPiece = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/api/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pieceForm),
      });
      if (!response.ok) throw new Error('Creation impossible');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Piece ajoutee');
      setPieceOpen(false);
      setPieceForm({ quantite: 0, seuil_critique: 0, cout_unitaire: 0 });
      queryClient.invalidateQueries({ queryKey: ['stock-pieces'] });
    },
    onError: () => toast.error('Erreur de creation'),
  });

  const createSortie = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/api/stock/sorties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sortieForm),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Sortie impossible');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Sortie de stock enregistree');
      setSortieOpen(false);
      setSortieForm({});
      queryClient.invalidateQueries({ queryKey: ['stock-pieces'] });
    },
    onError: (error: any) => toast.error(error.message || 'Erreur de sortie'),
  });

  const critiques = pieces.filter((piece: any) => piece.niveau_critique).length;
  const valeur = pieces.reduce((sum: number, piece: any) => sum + Number(piece.valeur_stock || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <MotionWrapper variant="slideUp">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Atelier / stock</h1>
              <p className="text-muted-foreground mt-2">Pieces, seuils critiques et sorties par vehicule</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setPieceOpen(true)}>
              <Plus className="h-4 w-4" />
              Ajouter une piece
            </Button>
          </div>
        </MotionWrapper>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <PackageSearch className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">References</p>
                <p className="text-2xl font-bold">{pieces.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Wrench className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Critiques</p>
                <p className="text-2xl font-bold">{critiques}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Upload className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Valeur stock</p>
                <p className="text-2xl font-bold">{money(valeur)} Ar</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pieces en stock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Quantite</TableHead>
                    <TableHead>Seuil</TableHead>
                    <TableHead>Cout unitaire</TableHead>
                    <TableHead>Etat</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8}>Chargement...</TableCell></TableRow>
                  ) : pieces.length === 0 ? (
                    <TableRow><TableCell colSpan={8}>Aucune piece</TableCell></TableRow>
                  ) : pieces.map((piece: any) => (
                    <TableRow key={piece.id}>
                      <TableCell className="font-medium">{piece.reference}</TableCell>
                      <TableCell>{piece.designation}</TableCell>
                      <TableCell>{piece.categorie || '-'}</TableCell>
                      <TableCell>{Number(piece.quantite)}</TableCell>
                      <TableCell>{Number(piece.seuil_critique)}</TableCell>
                      <TableCell>{money(piece.cout_unitaire)} Ar</TableCell>
                      <TableCell>
                        <Badge variant={piece.niveau_critique ? 'destructive' : 'secondary'}>
                          {piece.niveau_critique ? 'Critique' : 'OK'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSortieForm({ piece_id: piece.id, quantite: 1 });
                            setSortieOpen(true);
                          }}
                        >
                          Sortie
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pieceOpen} onOpenChange={setPieceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter une piece</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={pieceForm.reference || ''} onChange={event => setPieceForm({ ...pieceForm, reference: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Input value={pieceForm.categorie || ''} onChange={event => setPieceForm({ ...pieceForm, categorie: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={pieceForm.designation || ''} onChange={event => setPieceForm({ ...pieceForm, designation: event.target.value })} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Quantite</Label>
                <Input type="number" value={pieceForm.quantite} onChange={event => setPieceForm({ ...pieceForm, quantite: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Seuil critique</Label>
                <Input type="number" value={pieceForm.seuil_critique} onChange={event => setPieceForm({ ...pieceForm, seuil_critique: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Cout unitaire</Label>
                <Input type="number" value={pieceForm.cout_unitaire} onChange={event => setPieceForm({ ...pieceForm, cout_unitaire: Number(event.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Input value={pieceForm.fournisseur || ''} onChange={event => setPieceForm({ ...pieceForm, fournisseur: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPieceOpen(false)}>Annuler</Button>
            <Button onClick={() => createPiece.mutate()} disabled={createPiece.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sortieOpen} onOpenChange={setSortieOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sortie de stock</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Vehicule</Label>
              <Select value={sortieForm.vehicule_id?.toString() || ''} onValueChange={value => setSortieForm({ ...sortieForm, vehicule_id: Number(value) })}>
                <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                <SelectContent>
                  {vehicules.map(vehicule => (
                    <SelectItem key={vehicule.id} value={vehicule.id!.toString()}>{vehicule.immatriculation}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantite</Label>
              <Input type="number" min="1" value={sortieForm.quantite || 1} onChange={event => setSortieForm({ ...sortieForm, quantite: Number(event.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Commentaire</Label>
              <Input value={sortieForm.commentaire || ''} onChange={event => setSortieForm({ ...sortieForm, commentaire: event.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSortieOpen(false)}>Annuler</Button>
            <Button onClick={() => createSortie.mutate()} disabled={createSortie.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AtelierStock;
