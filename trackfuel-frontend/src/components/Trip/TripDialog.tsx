import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select";
import { FormControl } from "../ui/form";
import { useUsers } from "@/hooks/useUsers";
import { useAggregatedData } from "@/lib/mockData";

interface TripDialogProps {
  editingTripId: number | null;
  distanceKm: number | null;
  tStart: string;
  tEnd: string;
  typeSaisie: string;
  chauffeurId: number;
  odometreDebut: number;
  odometreFin: number;
  setDistanceKm: (value: number | null) => void;
  setTStart: (value: string) => void;
  setTEnd: (value: string) => void;
  setChauffeurId: (value: string) => void;
  setOdometreDebut: (value: number) => void;
  setOdometreFin: (value: number) => void;
  onSave: () => void;
  isSaving: boolean;
  disabled: boolean;
  id_vehicule: number
}

export function TripDialog({
  editingTripId,
  distanceKm,
  tStart,
  tEnd,
  typeSaisie,
  chauffeurId,
  setDistanceKm,
  setTStart,
  setTEnd,
  setChauffeurId,
  onSave,
  isSaving,
  disabled,
  id_vehicule
}: TripDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const { data: allUsers } = useUsers();
  const {affectations} = useAggregatedData();

  const chauffeurs = allUsers?.filter((user) => {
    return affectations.some((affectation) => {
      return ((affectation.chauffeur_id.toString() === user.id.toString()) && affectation.vehicule_id.toString() === id_vehicule.toString());
    });
  });

  const handleSave = () => {
    onSave();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled || isSaving} className="gap-2">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("trips.saving")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {editingTripId ? t("trips.editTrip") : t("trips.saveTrip")}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingTripId ? t("trips.editTrip") : t("trips.newTrip")}
          </DialogTitle>
          <DialogDescription>{t("trips.tripDetails")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="distance" className="text-right">
              {t("trips.distance")}
            </Label>
            <Input
              id="distance"
              type="number"
              value={distanceKm !== null ? distanceKm : ""}
              max={999999999} // <-- limite côté navigateur
              onChange={(e) => {
                const val = e.target.value;
                const num = val === "" ? null : Number(val);

                // sécurité côté React : on bloque si > 999999999
                if (num !== null && num > 999999999) return;

                setDistanceKm(num);
              }}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t("trips.type")}
            </Label>
            <Input
              id="type"
              value={typeSaisie}
              disabled
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tStart" className="text-right">
              {t("trips.departure")}
            </Label>
            <Input
              id="tStart"
              type="datetime-local"
              value={tStart}
              onChange={(e) => setTStart(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tEnd" className="text-right">
              {t("trips.arrival")}
            </Label>
            <Input
              id="tEnd"
              type="datetime-local"
              value={tEnd}
              onChange={(e) => setTEnd(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="chauffeur" className="text-right">
              {t("trips.driver")}
            </Label>
            <select
              id="chauffeur"
              required
              value={chauffeurId !== null ? String(chauffeurId) : ""}
              onChange={(e) => setChauffeurId(e.target.value)}
              className="col-span-3 border border-input bg-background px-3 py-2 text-sm rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="" disabled>
                {t("assignments.selectDriver")}
              </option>
              {chauffeurs
                ?.filter((c) => c.role === "conducteur")
                .map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.prenom} {c.nom} ({c.matricule})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            {t("trips.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={disabled || isSaving || chauffeurId === null || String(chauffeurId) === "" }
            className="gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("trips.saving")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t("trips.save")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
