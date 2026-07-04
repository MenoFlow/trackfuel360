import { MainLayout } from "@/components/Layout/MainLayout";
import { useParams, useNavigate } from "react-router-dom";
import { usePleins } from "@/hooks/usePleins";
import { useVehicules } from "@/hooks/useVehicules";
import { useUsers } from "@/hooks/useUsers";
import { usePleinMetadata } from "@/hooks/usePleinMetadata";
import { useGeofences } from "@/hooks/useGeofences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  MapPin,
  Clock,
  Camera,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { isPointInGeofence } from "@/lib/utils/geolocation";
import { usePleinOcrData } from "@/hooks/usePleinOcrData";

// FONCTION DE SÉCURITÉ ULTRA-ROBUSTE
const safeFormat = (
  dateStr: string | null | undefined,
  fallback = "—"
): string => {
  if (!dateStr) return fallback;
  const date = new Date(dateStr);
  return isValid(date)
    ? format(date, "dd MMMM yyyy à HH:mm", { locale: fr })
    : fallback;
};

const API_BASE_URL = "/api/uploads/receipts/";

const PleinDetails = () => {
  const { id } = useParams<{ id: string }>();
  const pleinId = parseInt(id, 10);
  const navigate = useNavigate();

  const { data: pleins } = usePleins();
  const { data: vehicules } = useVehicules();
  const { data: users } = useUsers();
  const { data: exifMetadata, isLoading: metadataLoading } = usePleinMetadata(pleinId);
  const { data: ocr, isLoading: ocrDataLoading } = usePleinOcrData(pleinId);
  // console.log(ocr);
  const { geofences } = useGeofences();
  
  const plein = pleins?.find((p) => p.id === pleinId);
  const vehicule = vehicules?.find((v) => v.id === plein?.vehicule_id);
  const chauffeur = users?.find((u) => u.id === plein?.chauffeur_id);
  const metadata = !metadataLoading && exifMetadata?.length ? exifMetadata[0] : null;
  const ocrData = !ocrDataLoading && ocr?.length ? ocr[0] : null;
  const ocrConfidence = Number(ocrData?.ocr_confidence);
  const hasOcrConfidence = Number.isFinite(ocrConfidence);
  // DATES SÉCURISÉES
  const pleinDate = plein?.date ? new Date(plein.date) : null;
  const exifDateStr =
    metadata?.date && metadata?.heure
      ? `${metadata.date.split("T")[0]}T${metadata.heure}`
      : null;
  const exifDate = exifDateStr ? new Date(exifDateStr) : null;

  const dateEcart =
    pleinDate && exifDate && isValid(pleinDate) && isValid(exifDate)
      ? Math.abs(pleinDate.getTime() - exifDate.getTime()) / (1000 * 60 * 60)
      : 0;

  const gpsEcart =
    metadata && plein?.latitude && plein?.longitude
      ? Math.sqrt(
          Math.pow((Number(metadata.latitude) - plein.latitude) * 111, 2) +
            Math.pow(
              (Number(metadata.longitude) - plein.longitude) *
                111 *
                Math.cos((plein.latitude * Math.PI) / 180),
              2
            )
        )
      : 0;

  const stations = geofences?.filter((g) => g.type === "station") || [];
  const pleinDansStation =
    plein?.latitude && plein?.longitude
      ? stations.some((s) =>
          isPointInGeofence(
            plein.latitude!,
            plein.longitude!,
            s.lat,
            s.lon,
            s.rayon_metres
          )
        )
      : false;

  const exifDansStation =
    metadata?.latitude && metadata?.longitude
      ? stations.some((s) =>
          isPointInGeofence(
            Number(metadata.latitude),
            Number(metadata.longitude),
            s.lat,
            s.lon,
            s.rayon_metres
          )
        )
      : false;

  const hasAnomalies =
    dateEcart > 2 || gpsEcart > 0.5 || !pleinDansStation || !exifDansStation;
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

  const photo =
  typeof plein?.photo_bon === "string"
    ? API_BASE + "/" + plein?.photo_bon.replace(/\\/g, "/")
    : ""; // ou gérer le cas File différemment
  
  console.log(plein?.photo_bon);
  const handleDownloadPhoto = () => {
    if (photo) {
      const link = document.createElement("a");
      link.href = photo;
      link.download =
        typeof plein?.photo_bon === "string"
          ? plein?.photo_bon
          : plein?.photo_bon.name; // si c'est un File, utiliser son nom
      link.click();
    }
  };  

  // SI PAS DE PLEIN → PAGE 404 PROPRE
  if (!plein) {
    return (
      <MainLayout>
        <div className="space-y-6 p-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Plein non trouvé</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <Badge
            variant={hasAnomalies ? "destructive" : "secondary"}
            className="text-base px-4 py-2"
          >
            {hasAnomalies ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Plein suspect
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Plein validé
              </>
            )}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">          {/* COLONNE 1 : Données saisies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Données saisies{" "}
                {plein.type_saisie === "auto" ? "(OCR)" : "(Manuel)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Véhicule</p>
                <p className="font-semibold text-lg">
                  {vehicule?.immatriculation || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chauffeur</p>
                <p className="font-semibold">
                  {chauffeur
                    ? `${chauffeur.prenom} ${chauffeur.nom}`
                    : "Inconnu"}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date & Heure</p>
                  <p className="font-semibold">{safeFormat(plein.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Litres</p>
                  <p className="font-bold text-lg">{plein.litres}L</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prix/L</p>
                  <p className="font-semibold">
                    Ar {Number(plein.prix_unitaire).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">
                    Ar {(plein.litres * plein.prix_unitaire).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Odomètre</p>
                  <p className="font-semibold">
                    {plein.odometre.toLocaleString()} km
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Station</p>
                  <p className="font-semibold">{plein.station || "—"}</p>
                </div>
              </div>

              {plein.latitude && plein.longitude && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4" />
                      GPS saisi
                    </p>
                    <p className="font-mono text-xs">
                      {Number(plein.latitude).toFixed(6)},{" "}
                      {Number(plein.longitude).toFixed(6)}
                    </p>
                    <Badge
                      variant={pleinDansStation ? "secondary" : "destructive"}
                      className="mt-2"
                    >
                      {pleinDansStation ? "Dans station" : "Hors station"}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* COLONNE 2 : EXIF */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Métadonnées photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metadata ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Photo prise le
                    </p>
                    <p className="font-semibold">{safeFormat(exifDateStr)}</p>
                    {dateEcart > 0 && (
                      <Badge
                        variant={dateEcart < 2 ? "secondary" : "destructive"}
                        className="mt-2"
                      >
                        Écart: {dateEcart.toFixed(1)}h
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-semibold">
                      {metadata.modele_telephone || "Inconnu"}
                    </p>
                  </div>

                  <Separator />

                  {metadata.latitude && metadata.longitude && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                        <MapPin className="h-4 w-4" />
                        GPS photo
                      </p>
                      <p className="font-mono text-xs">
                        {Number(metadata.latitude).toFixed(6)},{" "}
                        {Number(metadata.longitude).toFixed(6)}
                      </p>
                      <Badge
                        variant={exifDansStation ? "secondary" : "destructive"}
                        className="mt-2"
                      >
                        {exifDansStation ? "Dans station" : "Hors station"}
                      </Badge>
                      {gpsEcart > 0 && (
                        <Badge
                          variant={gpsEcart < 0.5 ? "secondary" : "destructive"}
                          className="mt-2 ml-2"
                        >
                          GPS: {gpsEcart.toFixed(2)} km
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Aucune métadonnée EXIF pour l'instant
                  </p>
                  <Badge variant="destructive" className="mt-2">
                    Suspect
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

                    {/* COLONNE 3 : Données OCR du bon scanné */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Données OCR du bon
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ocrDataLoading ? (
                <p className="text-center text-muted-foreground py-8">
                  Chargement des données OCR...
                </p>
              ) : ocrData ? (
                <div className="space-y-5 text-sm">
                  {/* Informations principales du bon */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground">Station</p>
                      <p className="font-semibold">{ocrData.station || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date du bon</p>
                      <p className="font-semibold">
                        {ocrData.date_bon ? safeFormat(ocrData.date_bon.toString()) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Litres</p>
                      <p className="font-bold text-lg">
                        {ocrData.litres ? `${ocrData.litres} L` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prix total</p>
                      <p className="font-bold text-lg text-green-600">
                        {ocrData.prix_total ? `Ar ${Number(ocrData.prix_total).toLocaleString()}` : "—"}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  Chauffeur détecté
                  {(ocrData.chauffeur_nom || ocrData.chauffeur_prenom || ocrData.chauffeur_matricule) ? (
                    <p className="font-medium">
                      {ocrData.chauffeur_prenom} {ocrData.chauffeur_nom}
                      {ocrData.chauffeur_matricule && (
                        <span className="text-muted-foreground ml-2">
                          ({ocrData.chauffeur_matricule})
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">Non détecté</p>
                  )}

                  <Separator />

                  Véhicule détecté
                  {ocrData.vehicule_immatriculation ? (
                    <div>
                      <p className="font-medium">{ocrData.vehicule_immatriculation}</p>
                      {ocrData.vehicule_marque && (
                        <p className="text-muted-foreground text-xs">
                          {ocrData.vehicule_marque}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Non détecté</p>
                  )}

                  <Separator className="my-4" />

                  <div className="flex justify-between items-center">
                    <p className="text-muted-foreground text-xs">Confiance OCR</p>
                    <Badge
                      variant={
                        !hasOcrConfidence || ocrConfidence < 70
                          ? "destructive"
                          : ocrConfidence < 90
                          ? "secondary"
                          : "default"
                      }
                    >
                      {hasOcrConfidence ? `${ocrConfidence.toFixed(0)}%` : "—"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Aucune donnée OCR disponible (OCR pour ce bon
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PHOTO */}
        {plein?.photo_bon && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photo du bon
                </CardTitle>
                <Button
                  onClick={handleDownloadPhoto}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 flex justify-center">
              {/* <img
                src={`/api/${photo}`}
                alt="Bon"
                className="max-w-full h-auto rounded-lg shadow"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                  e.currentTarget.onerror = null;
                }}
              /> */}
              <img src={photo} alt="Bon plein" />

              </div>
            </CardContent>
          </Card>
        )}

        {/* ANOMALIES */}
        {hasAnomalies && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Anomalies détectées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dateEcart > 2 && (
                  <li className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Écart horaire : {dateEcart.toFixed(1)}h
                  </li>
                )}
                {gpsEcart > 0.5 && (
                  <li className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Écart GPS : {gpsEcart.toFixed(2)} km
                  </li>
                )}
                {!pleinDansStation && (
                  <li className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Saisie du plein hors station autorisée
                  </li>
                )}
                {!exifDansStation && metadata && (
                  <li className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Photo prise hors station
                  </li>
                )}
                {!metadata && (
                  <li className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Aucune métadonnée EXIF
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default PleinDetails;
