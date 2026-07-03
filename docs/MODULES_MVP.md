# Documentation des modules TrackFuel360

## Regles transverses

- Un module est declare dans `modules`.
- Son activation client est stockee dans `client_modules`.
- Son acces par role est stocke dans `role_module_permissions`.
- Le frontend consomme `/api/modules` et masque menus/ecrans quand `enabled=false` ou `allowed=false`.
- `src/lib/accessControl.ts` centralise les roles, permissions UI, client courant et utilisateur courant.
- Les configurations d'installation sont appliquees via `/api/modules/configuration/:configuration`.

## Configurations vendables

| Configuration | Modules actifs |
| --- | --- |
| `fuel_only` | `fuel`, `reporting` |
| `fleet_only` | `fleet`, `maintenance`, `documents`, `reporting` |
| `fuel_fleet_drivers` | `fuel`, `fleet`, `drivers`, `missions`, `maintenance`, `documents`, `reporting` |
| `complete` | Tous les modules MVP, V2 et V3 |

## Carburant

Statut: disponible MVP.

Fonctions:
- Gestion des pleins, justificatifs, OCR/EXIF, niveaux carburant.
- Suivi par vehicule, chauffeur, station et periode selon les ecrans existants.
- Corrections et alertes carburant.

APIs:
- `/api/pleins`
- `/api/plein-exif`
- `/api/plein-ocr`
- `/api/niveau-carbu`
- `/api/corrections`

Reste a faire:
- Anti-fraude avancee centralisee cote backend.

## Parc roulant

Statut: partiel MVP.

Fonctions:
- CRUD vehicules.
- Detail vehicule.
- Affectations.
- Trajets lies au vehicule.

APIs:
- `/api/vehicules`
- `/api/affectations`
- `/api/trajets`

Reste a faire:
- Champs avances: annee, chassis, etat detaille, direction/service.
- Historique accidents et changements d'affectation plus complet.

## Chauffeurs

Statut: disponible MVP.

Fonctions:
- Liste des utilisateurs `driver`.
- Fiche chauffeur: telephone, permis, categorie, expiration permis, visite medicale, statut.

APIs:
- `/api/chauffeurs`
- `/api/users`

Tables:
- `users`
- `driver_profiles`

Reste a faire:
- Historique vehicules/missions et suivi formations/sanctions.

## Ordres de mission

Statut: disponible MVP.

Fonctions:
- Demande de mission.
- Validation, rejet, passage en cours, terminaison.
- Vehicule, chauffeur, destination, motif, dates et kilometrages.

APIs:
- `/api/missions`

Table:
- `ordres_mission`

Reste a faire:
- Pieces jointes.
- Liaison automatique mission/trajet/plein.

## Maintenance

Statut: disponible MVP.

Fonctions:
- Planification intervention.
- Types de maintenance: vidange, pneus, freins, batterie, filtres, revision, reparation, panne, accident.
- Prestataire, cout, statut.

APIs:
- `/api/maintenance`

Table:
- `maintenance_interventions`

Reste a faire:
- Immobilisation automatique et statut vehicule.
- Alertes date/km.

## Documents et conformite

Statut: disponible MVP.

Fonctions:
- Assurance, visite technique, vignette, carte grise, permis, visite medicale.
- Etats `conforme`, `bientot_expire`, `expire`.

APIs:
- `/api/documents`
- `/api/documents/rappels`

Table:
- `documents_administratifs`

Reste a faire:
- Upload/versioning documentaire complet.
- Page rappels consolidee avancee.

## Planning / disponibilite / reservation

Statut: lance V2.

Fonctions:
- Reservation vehicule.
- Chauffeur optionnel.
- Statuts `demandee`, `confirmee`, `annulee`, `terminee`.
- Detection de conflit de reservation sur le meme vehicule.

APIs:
- `/api/planning`
- `/api/planning/:id/status`

Table:
- `vehicle_reservations`

Reste a faire:
- Vue calendrier.
- Blocage automatique maintenance/non-conformite.

## GPS / geofence

Statut: partiel V2.

Fonctions:
- Geofences.
- Carte vehicules.
- Traces GPS.
- Detection front de zones a risque.

APIs:
- `/api/geofences`
- `/api/trace-gps`

Tables:
- `geofences`
- `traceGps`

Reste a faire:
- Temps reel.
- Alertes sortie zone, vitesse, ralenti, hors mission.
- Heatmap des arrets.

## Reporting et exports

Statut: disponible MVP.

Fonctions:
- Rapports.
- Comparaison flotte.
- Export/import.

APIs:
- `/api/import`
- routes metier existantes consommees par les services frontend.

Reste a faire:
- Agregations critiques cote backend.

## Budgets / couts

Statut: lance V2.

Fonctions:
- Budget global, carburant ou maintenance.
- Scope global, site, direction, vehicule ou periode.
- Comparaison prevu/reel et taux d'execution.

APIs:
- `/api/budgets`

Table:
- `budgets_couts`

Reste a faire:
- Calcul automatique du reel depuis carburant/maintenance.
- TCO, tendances et derives.

## Atelier / stock / pieces

Statut: lance V3.

Fonctions:
- Stock de pieces.
- Seuil critique.
- Valeur de stock.
- Sortie de piece par vehicule.
- Refus des sorties superieures au stock disponible.

APIs:
- `/api/stock`
- `/api/stock/sorties`

Tables:
- `stock_pieces`
- `piece_sorties`

Reste a faire:
- Ordres de reparation complets.
- Alertes niveaux critiques.
