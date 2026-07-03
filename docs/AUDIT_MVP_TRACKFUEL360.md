# Audit fonctionnel TrackFuel360

Date: 2026-07-03

## Synthese

TrackFuel360 dispose deja d'un socle carburant, parc, reporting, GPS/geofence et administration. Le MVP modulaire est maintenant verifie et complete par une logique de modules activables par client, de masquage UI par module, et de separation RBAC par role. Les modules V2/V3 sont lances sous forme activable: Planning, Budgets et Atelier/stock sont desormais presents avec tables, API et ecrans dedies.

## Inventaire de l'existant

| Domaine | Web | API | Base de donnees | Statut |
| --- | --- | --- | --- | --- |
| Tableau de bord | Dashboard existant | Services frontend + routes existantes | vehicules, pleins, alertes | Disponible |
| Parc roulant | Liste, creation, edition, detail, affectations | `/api/vehicules`, `/api/affectations` | `vehicules`, `affectations` | Partiel |
| Carburant | Pleins, details, OCR/EXIF, corrections, chauffeur mobile | `/api/pleins`, `/api/plein-exif`, `/api/plein-ocr`, `/api/niveau-carbu` | `pleins`, `bons_carburant_scannes`, `plein_exif_metadata`, `niveaux_carburant` | Disponible |
| Chauffeurs | Page chauffeurs + users role `driver` | `/api/chauffeurs`, `/api/users` | `users`, `driver_profiles` | Disponible MVP |
| Ordres de mission | Page missions, validation, rejet, suivi simple | `/api/missions` | `ordres_mission` | Disponible MVP |
| Maintenance | Page interventions, statuts, couts | `/api/maintenance` | `maintenance_interventions` | Disponible MVP |
| Documents/conformite | Page conformite et rappels | `/api/documents`, `/api/documents/rappels` | `documents_administratifs` | Disponible MVP |
| Planning/reservation | Page planning, reservation, conflits simples | `/api/planning` | `vehicle_reservations` | Lance V2 |
| GPS/geofence | Carte, geofences, traces, alertes map | `/api/geofences`, `/api/trace-gps` | `geofences`, `traceGps` | Partiel V2 |
| Reporting/export | Rapports, export, comparaison flotte | `/api/import`, services reporting frontend | Tables metier existantes | Disponible |
| Budgets/couts | Page budgets prevu/reel | `/api/budgets` | `budgets_couts` | Lance V2 |
| Atelier/stock/pieces | Page stock, pieces, sorties | `/api/stock`, `/api/stock/sorties` | `stock_pieces`, `piece_sorties` | Lance V3 |
| Mobile | Dashboard chauffeur, ajout plein, demande correction, saisie trajet | APIs carburant/trajets/corrections | Tables carburant/trajets | Partiel |

## Classement par categorie

| Categorie | Fonctionnalites |
| --- | --- |
| Disponible | Carburant, pleins, OCR/EXIF, dashboard, reporting/export, gestion sites/users, geofence de base, corrections, conformite simple |
| Partielle | Parc roulant avance, GPS temps reel avance, anti-fraude avancee, historique complet vehicule/chauffeur, mobile hors-ligne complet |
| Absente avant ce lot | Planning/reservation, budgets/couts, atelier/stock/pieces |
| A corriger | RBAC UI disperse, role `supervisor` absent du schema users, doublon `POST /api/users`, Docker frontend avec `vite preview`, persistance uploads limitee a `uploads/pleins` |

## Actions realisees

| Sujet | Action |
| --- | --- |
| Modules activables | Catalogue `modules`, activation `client_modules`, permissions `role_module_permissions`, presets client |
| Configurations de vente | API `POST /api/modules/configuration/:configuration` pour `fuel_only`, `fleet_only`, `fuel_fleet_drivers`, `complete` |
| RBAC interface | Ajout `src/lib/accessControl.ts`; menus, routes et parametres filtres par role |
| V2 Planning | Table `vehicle_reservations`, API `/api/planning`, ecran `Planning` |
| V2 Budgets | Table `budgets_couts`, API `/api/budgets`, ecran `Budgets` |
| V3 Atelier/stock | Tables `stock_pieces`, `piece_sorties`, API `/api/stock`, ecran `AtelierStock` |
| Corrections techniques | Role `supervisor` ajoute au schema/validateur, doublon users supprime, enum vehicule aligne |
| Docker/uploads | Bind mount `./trackfuel-backend/uploads:/app/uploads`, `UPLOAD_DIR`, `.dockerignore`, frontend Nginx |

## Matrice d'ecart cible

| Module cible | Etat actuel | Reste a faire |
| --- | --- | --- |
| Parc roulant | CRUD et affectations disponibles | Ajouter annee, chassis, statut metier detaille, direction/service, historique accidents |
| Carburant | Pleins complets et anomalies de base | Centraliser anti-fraude avancee cote backend |
| Chauffeurs | Fiche chauffeur, permis, visite medicale | Historique missions/vehicules et formations/sanctions avances |
| Ordres de mission | Demande, validation, rejet, statuts simples | Pieces jointes et liaison automatique trajet/plein/mission |
| Maintenance | Interventions, couts, statuts | Immobilisation automatique, alertes km/date plus poussees |
| Documents | Rappels conformite | Upload/versioning documents, page rappels consolidee avancee |
| Planning | Reservations et detection conflit vehicule | Disponibilite calendrier, blocage maintenance/non-conformite |
| GPS/geofence | Geofences, carte, traces | Temps reel, heatmap, alertes avancees vitesse/ralenti/hors mission |
| Reporting | Rapports/export existants | Agregations backend et exports standardises par module |
| Budgets | Budgets prevu/reel | TCO, derives, tendances, calcul reel automatique |
| Atelier/stock | Pieces et sorties | Ordres de reparation complets, niveaux critiques avec alertes |

## Schema de donnees ajoute ou verifie

Configuration:
- `clients`
- `modules`
- `client_modules`
- `app_configuration`
- `role_module_permissions`

MVP:
- `driver_profiles`
- `ordres_mission`
- `maintenance_interventions`
- `documents_administratifs`

V2/V3:
- `vehicle_reservations`
- `budgets_couts`
- `stock_pieces`
- `piece_sorties`

## APIs ajoutees ou adaptees

| API | Usage |
| --- | --- |
| `GET /api/modules?client_id=1&role=admin` | Lister modules actifs et autorises |
| `PUT /api/modules/:code` | Activer/desactiver un module |
| `POST /api/modules/configuration/:configuration` | Appliquer une offre client |
| `GET /api/chauffeurs` | Lister les chauffeurs |
| `PUT /api/chauffeurs/:id/profile` | Mettre a jour une fiche chauffeur |
| `GET /api/missions` / `POST /api/missions` | Lister/creer une mission |
| `PATCH /api/missions/:id/status` | Changer le statut mission |
| `GET /api/maintenance` / `POST /api/maintenance` | Lister/creer une intervention |
| `PATCH /api/maintenance/:id/status` | Changer le statut maintenance |
| `GET /api/documents/rappels` / `POST /api/documents` | Rappels et documents |
| `GET /api/planning` / `POST /api/planning` | Reservations vehicules |
| `PATCH /api/planning/:id/status` | Changer le statut reservation |
| `GET /api/budgets` / `POST /api/budgets` | Budgets prevu/reel |
| `PATCH /api/budgets/:id` | Ajuster un budget |
| `GET /api/stock` / `POST /api/stock` | Pieces en stock |
| `GET /api/stock/sorties` / `POST /api/stock/sorties` | Sorties de pieces |

## Ecrans adaptes ou crees

Crees:
- `Chauffeurs`
- `Missions`
- `Maintenance`
- `Conformite`
- `Planning`
- `Budgets`
- `AtelierStock`
- `GestionModules`

Adaptes:
- `App.tsx`: routes protegees par role et module.
- `MainLayout.tsx`: menus filtres par role + module.
- `Parametres.tsx`: cartes de parametres filtrees par role.
- `useModules.ts`: client courant, presets, invalidation React Query.

## Docker et uploads

Les fichiers televerses sont persistants en Docker via:

```yaml
volumes:
  - ./trackfuel-backend/uploads:/app/uploads
```

Le backend lit `UPLOAD_DIR=/app/uploads`, Multer ecrit dans `UPLOAD_DIR/pleins`, et Express expose `/uploads`. Les uploads ne sont plus copies dans l'image grace a `trackfuel-backend/.dockerignore`, donc une reconstruction d'image n'ecrase pas les fichiers existants sur l'hote.

## Risques de regression

- Une base deja creee doit laisser `initDb()` appliquer les nouvelles tables et l'ALTER du role `supervisor`.
- Les modules V2/V3 restent desactives par defaut, sauf configuration `complete`.
- Le RBAC actuel separe l'interface et les routes frontend; une securisation API forte demanderait une authentification serveur/JWT obligatoire.
- Le GPS temps reel et l'anti-fraude avancee restent des sujets V2 incomplets.

## Checklist de validation fonctionnelle

- Connexion admin OK.
- Page Modules visible admin uniquement.
- Application configuration `fuel_only`: seuls carburant/reporting restent visibles.
- Application configuration `complete`: Planning, Budgets, GPS, Atelier/stock deviennent visibles selon role.
- Manager voit les modules operationnels autorises, pas la page Modules.
- Auditor voit reporting/conformite/budgets/import-export, pas les ecrans d'exploitation.
- Creation/edition/suppression vehicule existante OK.
- Creation plein existante OK.
- Liste Chauffeurs charge les users `driver`.
- Creation mission, validation, rejet, en cours, terminaison OK.
- Creation intervention maintenance OK.
- Ajout document et rappel conformite OK.
- Creation reservation planning avec detection conflit vehicule OK.
- Creation budget prevu/reel OK.
- Creation piece et sortie de stock OK; sortie superieure au stock refusee.
- Redemarrage `docker compose restart app`: les fichiers dans `trackfuel-backend/uploads` restent presents.
- Build frontend OK.
- Controle syntaxique backend OK.

## Lot correctif du 2026-07-03

| Sujet | Etat verifie | Action realisee | Validation |
| --- | --- | --- | --- |
| Rapports partageables | L'historique et les liens reposaient sur IndexedDB local, donc non accessibles par un autre navigateur | Ajout `rapports_generes`, `rapport_share_tokens`, API `/api/rapports`, historique limite a 5, token serveur expirant | Build frontend OK, syntaxe backend OK |
| Sidebar surchargee | Les menus etaient une liste plate filtree par module/role | Regroupement en accordeons: Accueil, Operations, Carburant & conformite, Analyse, Administration | Build frontend OK |
| Navigation | Aucun fil d'Ariane global dans `MainLayout` | Ajout d'un fil d'Ariane responsive sur les pages internes | Build frontend OK |
| Chevauchement bas ecran | Le contenu pouvait toucher une barre systeme desktop/mobile | Ajout de `app-safe-bottom` avec `env(safe-area-inset-bottom)` et reserve desktop | Build frontend OK |
| Traductions | `sites.noSites` absent et ecarts FR/EN/ES/MG | Alignement des cles de traduction; 0 cle manquante sur les 4 langues | Validation JSON + comparaison des cles OK |
| Modele Excel API | `/api/import/template` renvoyait 501 | Endpoint remplace par un vrai `.xlsx` avec donnees Site/User/Vehicule/Affectation | Validation parsing + dependances OK |
| Import Excel | Les IDs fournis par le fichier n'etaient pas conserves | Insertion preserve les IDs quand presents pour fiabiliser les dependances du modele | Validation en memoire OK |
