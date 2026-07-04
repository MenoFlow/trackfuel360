import { XCircle, AlertCircle } from "lucide-react";

import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChauffeurAccess } from "@/hooks/useChauffeurAccess";
import { useVehicules } from "@/hooks/useVehicules";
import { useAffectations } from "@/hooks/useAffectations";
import { useCreatePlein } from "@/hooks/usePleins";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import Header from "./Header";
import { Camera } from "lucide-react";
import Tesseract from "tesseract.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getVehicleStatusBadgeVariant, getVehicleStatusLabel, getVehicleUnavailableReason, isVehicleOutOfService } from "@/lib/vehicleStatus";

// PRIX UNITAIRE FIXE (modifiable ici si besoin)
const PRIX_UNITAIRE_FIXE = 6000.0; // Ariary par litre

export default function AjoutPleinForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, logout, filterVehiculesForDriver } =
    useChauffeurAccess();
  const { data: allVehicules, isLoading: loadingVehicules } = useVehicules();
  const { data: affectations, isLoading: loadingAffectations } =
    useAffectations();
  const createPlein = useCreatePlein();
  const isOnline = useOnlineStatus();

  // État pour le modal de succès + données OCR
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [pleinId, setPleinId] = useState(null);
  const [ocrExtractedData, setOcrExtractedData] = useState<{
    station?: string;
    date?: string;
    litres?: string;
    prixTotal?: string;
    rawText?: string;
    chauffeur?: {
      matricule?: string;
      nom?: string;
      prenom?: string;
    };
    vehicule?: {
      immatriculation?: string;
      marque?: string;
    };
  }>({});

  const isLoading = loadingVehicules || loadingAffectations;

  const [vehiculeId, setVehiculeId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [litres, setLitres] = useState("");
  const [prixTotal, setPrixTotal] = useState("");
  const [odometre, setOdometre] = useState("");
  const [station, setStation] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  // Contrôle quel champ est "maître"
  const [modeSaisie, setModeSaisie] = useState<"litres" | "prixTotal" | null>(
    null
  );

  const mesVehicules = useMemo(() => {
    if (!allVehicules || !affectations) return [];
    return filterVehiculesForDriver(allVehicules, affectations);
  }, [allVehicules, affectations, filterVehiculesForDriver]);
  const selectedVehicule = mesVehicules.find((v) => String(v.id) === vehiculeId);

  // Calcul automatique en fonction du champ modifié
  useEffect(() => {
    if (!litres && !prixTotal) {
      setModeSaisie(null);
      return;
    }

    const l = parseFloat(litres);
    const p = parseFloat(prixTotal);

    if (modeSaisie === "litres" && !isNaN(l)) {
      const totalCalc = l * PRIX_UNITAIRE_FIXE;
      setPrixTotal(totalCalc.toFixed(3));
    }

    if (modeSaisie === "prixTotal" && !isNaN(p)) {
      const litresCalc = p / PRIX_UNITAIRE_FIXE;
      setLitres(litresCalc.toFixed(3));
    }
  }, [litres, prixTotal, modeSaisie]);

  const handleLitresChange = (value: string) => {
    setLitres(value);
    if (value) {
      setModeSaisie("litres");
      setPrixTotal(""); // On recalculera via useEffect
    } else {
      setModeSaisie(null);
      setPrixTotal("");
    }
  };

  const handlePrixTotalChange = (value: string) => {
    setPrixTotal(value);
    if (value) {
      setModeSaisie("prixTotal");
      setLitres(""); // On recalculera via useEffect
    } else {
      setModeSaisie(null);
      setLitres("");
    }
  };

  // Dans le handlePhotoChange, remplace la partie OCR par ceci :
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);

      const { data } = await Tesseract.recognize(file, "eng+fra", {
        logger: (m) => {},
      });
      const text = data.text.toUpperCase(); // Normalisation

      // Extraction des champs existants
      const stationMatch = text.match(/STATION\s*:\s*(.+)/i);
      const dateMatch = text.match(/DATE\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
      const litresMatch = text.match(/LITRES\s*:\s*([\d,]+\.?\d*)/i);
      const prixTotalMatch = text.match(/PRIX TOTAL\s*:\s*([\d\.,]+)/i);

      // Nouveaux champs : Conducteur
      const matriculeChauffeurMatch = text.match(/MATRICULE\s*:\s*CH(\d+)/i);
      const nomChauffeurMatch = text.match(/NOM\s*:\s*([A-ZÀ-Ÿ-]+)/i);
      const prenomChauffeurMatch = text.match(/PRENOM\s*:\s*([A-ZÀ-Ÿ-]+)/i);

      // Nouveaux champs : Véhicule
      const immatriculationMatch = text.match(
        /IMMATRICULATION\s*:\s*(\d+T[A-Z]{2})/i
      );
      const marqueVehiculeMatch = text.match(/MARQUE\s*:\s*([A-ZÀ-Ÿ\s]+)/i);

      // Application des valeurs extraites
      if (stationMatch) setStation(stationMatch[1].trim());
      if (dateMatch) {
        const [day, month, year] = dateMatch[1].split("/");
        setDate(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
      }
      if (litresMatch) {
        const l = litresMatch[1].replace(",", ".");
        handleLitresChange(l);
      }
      if (prixTotalMatch) {
        const p = prixTotalMatch[1].replace(/[^\d.-]/g, "");
        handlePrixTotalChange(p);
      }

      // Sauvegarde complète pour comparaison finale
      setOcrExtractedData({
        station: stationMatch?.[1]?.trim(),
        date: dateMatch?.[1],
        litres: litresMatch?.[1],
        prixTotal: prixTotalMatch?.[1],
        rawText: text,
        chauffeur: {
          matricule: matriculeChauffeurMatch?.[1]
            ? `CH${matriculeChauffeurMatch[1]}`
            : undefined,
          nom: nomChauffeurMatch?.[1]?.trim(),
          prenom: prenomChauffeurMatch?.[1]?.trim(),
        },
        vehicule: {
          immatriculation: immatriculationMatch?.[1],
          marque: marqueVehiculeMatch?.[1]?.trim(),
        },
      });
    }
  };

  type Position = {
    latitude: number | null;
    longitude: number | null;
    source: "ipapi" | "navigator" | "none" | "unsupported";
  };
  
  const getCurrentPosition = async (): Promise<Position> => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        source: "ipapi",
      };
    } catch (err) {
      console.warn("Pas de connexion, fallback local:", err);
  
      return new Promise<Position>((resolve) => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                source: "navigator",
              });
            },
            () => {
              resolve({ latitude: null, longitude: null, source: "none" });
            }
          );
        } else {
          resolve({ latitude: null, longitude: null, source: "unsupported" });
        }
      });
    }
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehiculeId || !odometre || !litres || !prixTotal) {
      toast({ title: "Champs manquants", variant: "destructive" });
      return;
    }

    if (isVehicleOutOfService(selectedVehicule)) {
      toast({
        title: "Véhicule indisponible",
        description: getVehicleUnavailableReason(selectedVehicule),
        variant: "destructive",
      });
      return;
    }

    try {
      // Récupération de la position actuelle (via navigator.geolocation ou API IP)
      const { latitude, longitude, source } = await getCurrentPosition();
      console.log(source);
      const pleinData = {
        vehicule_id: Number(vehiculeId),
        chauffeur_id: currentUser?.id || 0,
        date,
        litres: parseFloat(litres),
        prix_unitaire: PRIX_UNITAIRE_FIXE,
        odometre: parseInt(odometre),
        station,
        type_saisie: "manuelle" as const,
        latitude,
        longitude,
      };

      const ocrDataForBackend =
        photo && ocrExtractedData.rawText
          ? {
              station: ocrExtractedData.station || null,
              date_bon: ocrExtractedData.date
                ? formatOcrDate(ocrExtractedData.date)
                : null,
              litres: ocrExtractedData.litres
                ? parseFloat(ocrExtractedData.litres.replace(",", "."))
                : null,
              prix_total: ocrExtractedData.prixTotal
                ? parseFloat(ocrExtractedData.prixTotal.replace(/[^\d.-]/g, ""))
                : null,
              chauffeur_matricule:
                ocrExtractedData.chauffeur?.matricule || null,
              chauffeur_nom: ocrExtractedData.chauffeur?.nom || null,
              chauffeur_prenom: ocrExtractedData.chauffeur?.prenom || null,
              vehicule_immatriculation:
                ocrExtractedData.vehicule?.immatriculation || null,
              vehicule_marque: ocrExtractedData.vehicule?.marque || null,
            }
          : undefined;

      const pleinId = await createPlein.mutateAsync({
        pleinData,
        ocrData: ocrDataForBackend,
        photoFile: photo || undefined,
      });

      setPleinId(pleinId);
      setSuccessModalOpen(true);

      toast({
        title: "Plein enregistré avec succès",
        description: ocrDataForBackend
          ? "Données OCR sauvegardées (contrôle anti-fraude actif)"
          : "Plein enregistré",
      });
    } catch (error: any) {
      if (error.details?.error === "Odomètre invalide") {
        toast({
          title: t("fuel.odometerInvalid"),
          description: t("fuel.lastOdometerWas", {
            odo: error.details.dernier_odometre,
          }),
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      toast({
        title: t("errors.generic"),
        description: error.message || t("errors.tryAgain"),
        variant: "destructive",
      });
    }
  };

  if (!currentUser) return null;

  const formatOcrDate = (ocrDate: string) => {
    if (!ocrDate) return "";
    const match = ocrDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [_, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
    return ocrDate;
  };

  const allMatch =
    (!ocrExtractedData.station ||
      station?.trim().toLowerCase() ===
        ocrExtractedData.station?.trim().toLowerCase()) &&
    (!ocrExtractedData.date || date === formatOcrDate(ocrExtractedData.date)) &&
    (!ocrExtractedData.litres ||
      Math.abs(
        parseFloat(litres) -
          parseFloat(ocrExtractedData.litres.replace(",", "."))
      ) < 0.1) &&
    (!ocrExtractedData.prixTotal ||
      Math.abs(
        parseFloat(prixTotal) -
          parseFloat(ocrExtractedData.prixTotal.replace(/[^\d.-]/g, ""))
      ) < 10);

  return (
    <div className="min-h-screen bg-background">
      <Header currentUser={currentUser} logout={logout} isDashboard={false} />

      <div className="md:mx-12 px-6 py-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("driver.newFuelTitle")}</CardTitle>
            <CardDescription>
              Veuillez remplir les informations suivantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isOnline && (
              <Alert className="mb-4">
                <AlertDescription>
                  {t("offline.workingOffline")}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Véhicule */}
              <div className="space-y-2">
                <Label htmlFor="vehiculeId">{t("reports.vehicle")}</Label>
                <Select
                  value={vehiculeId || ""}
                  onValueChange={setVehiculeId}
                  required
                >
                  <SelectTrigger id="vehiculeId">
                    <SelectValue placeholder={t("driver.selectVehicle")} />
                  </SelectTrigger>
                  <SelectContent>
                    {mesVehicules.map((v) => (
                      <SelectItem key={v.id} value={v.id.toString()} disabled={isVehicleOutOfService(v)}>
                        {v.immatriculation} - {v.marque} {v.modele}
                        {isVehicleOutOfService(v) ? ' (hors service)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVehicule && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getVehicleStatusBadgeVariant(selectedVehicule)}>
                      {getVehicleStatusLabel(selectedVehicule)}
                    </Badge>
                    {isVehicleOutOfService(selectedVehicule) && (
                      <span className="text-sm text-destructive">{getVehicleUnavailableReason(selectedVehicule)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Date & Odomètre */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">{t("driver.fuelDate")}</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odometre">{t("fuel.odometer")} (km)</Label>
                  <Input
                    id="odometre"
                    type="number"
                    placeholder="125000"
                    value={odometre}
                    onChange={(e) => setOdometre(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Litres & Prix Total */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="litres">{t("fuel.liters")}</Label>
                  <Input
                    id="litres"
                    type="number"
                    step="0.001"
                    placeholder="45.500"
                    value={litres}
                    onChange={(e) => handleLitresChange(e.target.value)}
                    disabled={modeSaisie === "prixTotal"}
                    className={modeSaisie === "prixTotal" ? "bg-muted" : ""}
                  />
                  {modeSaisie === "prixTotal" && (
                    <p className="text-xs text-muted-foreground">
                      {t("fuel.autoCalculation")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prixTotal">{t("fuel.total")} (Ar)</Label>
                  <Input
                    id="prixTotal"
                    type="number"
                    step="0.001"
                    placeholder="9921.000"
                    value={prixTotal}
                    onChange={(e) => handlePrixTotalChange(e.target.value)}
                    disabled={modeSaisie === "litres"}
                    className={modeSaisie === "litres" ? "bg-muted" : ""}
                  />
                  {modeSaisie === "litres" && (
                    <p className="text-xs text-muted-foreground">
                      {t("fuel.autoCalculation")}
                    </p>
                  )}
                </div>
              </div>

              {/* Station */}
              <div className="space-y-2">
                <Label htmlFor="station">{t("fuel.station")}</Label>
                <Input
                  id="station"
                  type="text"
                  placeholder="Total - Avenue Mohammed V"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                />
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <Label htmlFor="photo">{t("driver.receiptPhoto")}</Label>
                <div className="flex justify-center items-center text-center border-2 border-dashed border-border rounded-lg p-6">
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    // capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  {photo ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {photo.name}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          document.getElementById("photo")?.click()
                        }
                      >
                        {t("driver.changePhoto")}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => document.getElementById("photo")?.click()}
                      className="flex flex-col items-center gap-2"
                    >
                      <Camera className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {t("driver.takePhoto")}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/chauffeur")}
                  className="flex-1"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createPlein.isPending || ocrExtractedData === null || isVehicleOutOfService(selectedVehicule)}
                  className="flex-1"
                >
                  {createPlein.isPending
                    ? t("driver.recording")
                    : t("driver.recordFuel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      {/* Modal de succès avec données OCR */}
      <Dialog
        open={successModalOpen}
        onOpenChange={() => {
          setSuccessModalOpen(false);
          navigate("/chauffeur");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              {t("driver.fuelRecorded")}
            </DialogTitle>
            <DialogDescription>
              Vérification des données du bon de carburant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 max-h-96 overflow-y-auto">
            {photo && ocrExtractedData.rawText ? (
              <div className="space-y-5">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Comparaison Bon vs Données réelles
                </h4>

                <div className="bg-muted/50 rounded-lg p-4 space-y-4 text-sm">
                  {/* === CHAUFEUR === */}
                  {ocrExtractedData.chauffeur && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Conducteur (Matricule)
                        </span>
                        <div className="flex items-center gap-3">
                          {ocrExtractedData.chauffeur.matricule !==
                            currentUser?.matricule && (
                            <span className="text-xs line-through text-red-600">
                              {ocrExtractedData.chauffeur.matricule}
                            </span>
                          )}
                          <span className="font-medium">
                            {currentUser?.matricule}
                          </span>
                          {ocrExtractedData.chauffeur.matricule ===
                          currentUser?.matricule ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Nom & Prénom
                        </span>
                        <div className="flex items-center gap-3">
                          {(ocrExtractedData.chauffeur.nom?.toUpperCase() !==
                            currentUser?.nom.toUpperCase() ||
                            ocrExtractedData.chauffeur.prenom?.toUpperCase() !==
                              currentUser?.prenom.toUpperCase()) && (
                            <span className="text-xs line-through text-red-600">
                              {ocrExtractedData.chauffeur.prenom}{" "}
                              {ocrExtractedData.chauffeur.nom}
                            </span>
                          )}
                          <span className="font-medium">
                            {currentUser?.prenom} {currentUser?.nom}
                          </span>
                          {ocrExtractedData.chauffeur.nom?.toUpperCase() ===
                            currentUser?.nom.toUpperCase() &&
                          ocrExtractedData.chauffeur.prenom?.toUpperCase() ===
                            currentUser?.prenom.toUpperCase() ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* === VÉHICULE === */}
                  {ocrExtractedData.vehicule &&
                    vehiculeId &&
                    (() => {
                      const vehiculeReel = mesVehicules.find(
                        (v) => v.id.toString() === vehiculeId
                      );
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Immatriculation
                            </span>
                            <div className="flex items-center gap-3">
                              {ocrExtractedData.vehicule.immatriculation !==
                                vehiculeReel?.immatriculation && (
                                <span className="text-xs line-through text-red-600">
                                  {ocrExtractedData.vehicule.immatriculation}
                                </span>
                              )}
                              <span className="font-medium">
                                {vehiculeReel?.immatriculation}
                              </span>
                              {ocrExtractedData.vehicule.immatriculation ===
                              vehiculeReel?.immatriculation ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Marque & Modèle
                            </span>
                            <div className="flex items-center gap-3">
                              {ocrExtractedData.vehicule.marque?.toUpperCase() !==
                                vehiculeReel?.marque.toUpperCase() && (
                                <span className="text-xs line-through text-red-600">
                                  {ocrExtractedData.vehicule.marque}
                                </span>
                              )}
                              <span className="font-medium">
                                {vehiculeReel?.marque} {vehiculeReel?.modele}
                              </span>
                              {ocrExtractedData.vehicule.marque?.toUpperCase() ===
                              vehiculeReel?.marque.toUpperCase() ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}

                  {/* === AUTRES CHAMPS (inchangés) === */}
                  {ocrExtractedData.station && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Station</span>
                      <div className="flex items-center gap-3">
                        {station?.trim().toLowerCase() !==
                          ocrExtractedData.station?.trim().toLowerCase() && (
                          <span className="text-xs line-through text-red-600">
                            {ocrExtractedData.station}
                          </span>
                        )}
                        <span className="font-medium">{station || "-"}</span>
                        {station?.trim().toLowerCase() ===
                        ocrExtractedData.station?.trim().toLowerCase() ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  )}

                  {ocrExtractedData.date && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <div className="flex items-center gap-3">
                        {date !== formatOcrDate(ocrExtractedData.date) && (
                          <span className="text-xs line-through text-red-600">
                            {ocrExtractedData.date}
                          </span>
                        )}
                        <span className="font-medium">{date}</span>
                        {date === formatOcrDate(ocrExtractedData.date) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  )}

                  {ocrExtractedData.litres && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Litres</span>
                      <div className="flex items-center gap-3">
                        {Math.abs(
                          parseFloat(litres) -
                            parseFloat(
                              ocrExtractedData.litres.replace(",", ".")
                            )
                        ) >= 0.1 && (
                          <span className="text-xs line-through text-red-600">
                            {ocrExtractedData.litres} L
                          </span>
                        )}
                        <span className="font-medium">{litres} L</span>
                        {Math.abs(
                          parseFloat(litres) -
                            parseFloat(
                              ocrExtractedData.litres.replace(",", ".")
                            )
                        ) < 0.1 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  )}

                  {ocrExtractedData.prixTotal && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Prix total</span>
                      <div className="flex items-center gap-3">
                        {Math.abs(
                          parseFloat(prixTotal) -
                            parseFloat(
                              ocrExtractedData.prixTotal.replace(/[^\d.-]/g, "")
                            )
                        ) >= 10 && (
                          <span className="text-xs line-through text-red-600">
                            {ocrExtractedData.prixTotal} Ar
                          </span>
                        )}
                        <span className="font-medium">
                          {(parseFloat(litres) * PRIX_UNITAIRE_FIXE).toFixed(0)}{" "}
                          Ar
                        </span>
                        {Math.abs(
                          parseFloat(prixTotal) -
                            parseFloat(
                              ocrExtractedData.prixTotal.replace(/[^\d.-]/g, "")
                            )
                        ) < 10 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Message final */}
                {allMatch &&
                ocrExtractedData.chauffeur?.matricule ===
                  currentUser?.matricule &&
                (!ocrExtractedData.vehicule?.immatriculation ||
                  ocrExtractedData.vehicule?.immatriculation ===
                    mesVehicules.find((v) => v.id.toString() === vehiculeId)
                      ?.immatriculation) ? (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle2 className="h-6 w-6" />
                    Aucune anomalie détectée – Bon valide
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 font-medium">
                    <AlertCircle className="h-6 w-6" />
                    Incohérence détectée – Vérification recommandée
                  </div>
                )}
              </div>
            ) : photo ? (
              <p className="text-sm text-muted-foreground italic">
                Photo prise, mais aucune donnée lisible détectée.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSuccessModalOpen(false);
                navigate("/chauffeur");
              }}
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                setSuccessModalOpen(false);
                navigate("/chauffeur/demande-correction", {
                  state: {
                    pleinId,
                    isNotEditable: true,
                    oldVal: litres,
                    newVal: litres,
                  },
                });
              }}
            >
              Demander une correction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
