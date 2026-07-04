# Toutes les regles de gestion

Date de mise a jour: 2026-07-05  
Perimetre: regles deja presentes avant cette passe + regles implementees depuis `docs/audit-rules.md`.

## Statuts

- Deja presente: regle existante dans le code avant cette passe.
- Implementee: regle ajoutee ou renforcee dans cette passe.
- Encadree: regle securisee par blocage ou garde-fou, mais pas encore avec recalcul complet.

## Disponibilite globale

| Regle | Statut | Application |
| --- | --- | --- |
| Un vehicule inactif est indisponible. | Deja presente | `getVehicleUnavailability` |
| Un vehicule en maintenance `en_cours` est indisponible. | Deja presente | `getVehicleUnavailability` |
| Les conflits de disponibilite retournent une structure exploitable par modal. | Deja presente | `buildConflictResponse` |
| Les missions `demande` ne bloquent plus la disponibilite comme une mission acceptee. | Implementee | `ACTIVE_MISSION_STATUSES = ['validee', 'en_cours']` |
| Les missions `validee` et `en_cours` bloquent vehicule et conducteur sur leur plage. | Implementee | `getAvailabilityConflicts` |
| Les reservations `demandee` et `confirmee` bloquent vehicule et conducteur. | Implementee | `getAvailabilityConflicts` |
| Les trajets existants bloquent les chevauchements de trajets. | Implementee | `getAvailabilityConflicts` |
| La disponibilite peut etre configuree selon le flux: planning complet ou chevauchement trajet uniquement. | Implementee | options `includeAffectations`, `includeMissions`, `includeReservations`, `includeTrips` |
| La prochaine date libre est retournee pour conducteur et vehicule. | Deja presente | `next_free_start` |

## Conducteurs

| Regle | Statut | Application |
| --- | --- | --- |
| Un conducteur assignable doit exister dans `users`. | Implementee | `getDriverEligibility` |
| Un conducteur assignable doit avoir `role='conducteur'`. | Implementee | `getDriverEligibility` |
| Un conducteur assignable doit avoir un profil conducteur actif. | Implementee | `driver_profiles.statut='actif'` |
| Un conducteur avec permis expire est refuse pour mission/affectation/planning/plein/trajet. | Implementee | `getDriverEligibility` |
| Un conducteur avec visite medicale expiree est refuse pour mission/affectation/planning/plein/trajet. | Implementee | `getDriverEligibility` |
| Les erreurs conducteur utilisent `DRIVER_NOT_FOUND`, `DRIVER_NOT_ASSIGNABLE` ou `DOCUMENT_EXPIRED`. | Implementee | `buildDriverIneligibleResponse` |

## Affectations

| Regle | Statut | Application |
| --- | --- | --- |
| Une affectation doit avoir vehicule, conducteur, date debut et date fin. | Deja presente | Joi affectation |
| `date_fin` doit etre apres `date_debut`. | Deja presente | Joi affectation |
| Une affectation manuelle ne peut pas chevaucher une indisponibilite connue. | Deja presente, enrichie | `getAvailabilityConflicts` |
| Une affectation manuelle verifie maintenant conducteur assignable et documents expires. | Implementee | route `POST/PUT /api/affectations` |
| Une affectation de mission ne peut plus etre creee directement depuis l'API affectations. | Implementee | `MISSION_ASSIGNMENT_MANAGED_BY_MISSION` |
| Une affectation de mission ne peut plus etre modifiee directement depuis l'API affectations. | Implementee | `MISSION_ASSIGNMENT_MANAGED_BY_MISSION` |
| Une affectation de mission ne peut plus etre supprimee directement depuis l'API affectations. | Implementee | `MISSION_ASSIGNMENT_MANAGED_BY_MISSION` |

## Missions

| Regle | Statut | Application |
| --- | --- | --- |
| Une mission doit avoir vehicule, conducteur, destination, motif, date depart et date retour prevue. | Deja presente | route missions |
| La date retour prevue doit etre apres la date depart. | Deja presente | route missions |
| La creation d'une mission verifie vehicule hors service. | Deja presente | route missions |
| La creation d'une mission verifie disponibilite vehicule/conducteur. | Deja presente, enrichie | `getAvailabilityConflicts` |
| La creation d'une mission verifie conducteur assignable et documents expires. | Implementee | route missions |
| La creation d'une mission ne cree plus d'affectation automatiquement. | Implementee | `POST /api/missions` |
| L'affectation mission est creee uniquement quand le conducteur accepte la mission. | Implementee | `PATCH /api/missions/:id/status` vers `validee` |
| L'acceptation de mission reverifie la disponibilite dans une transaction. | Implementee | `MISSION_ACCEPTANCE_RECHECK_FAILED` |
| L'acceptation de mission reverifie vehicule disponible et conducteur assignable. | Implementee | route missions |
| Les transitions mission sont controlees. | Implementee | `MISSION_STATUS_TRANSITION_INVALID` |
| `demande -> validee` est autorise. | Implementee | route missions |
| `demande -> rejetee` est autorise avec motif obligatoire. | Implementee | route missions |
| `validee -> en_cours` est autorise. | Implementee | route missions |
| `validee -> rejetee` est autorise avec suppression de l'affectation liee. | Implementee | route missions |
| `en_cours -> terminee` est autorise avec date retour reelle et kilometrage retour. | Implementee | route missions |
| Une mission terminee exige un kilometrage retour superieur ou egal au kilometrage depart. | Implementee | route missions |
| Une mission rejetee supprime l'affectation liee si elle existe. | Deja presente, conservee | route missions |
| Une mission peut etre supprimee avec nettoyage des affectations et reservations liees. | Implementee | `DELETE /api/missions/:id` |
| Une mission en cours ne peut pas etre supprimee directement. | Implementee | `DELETE_HAS_IMPACTS` |

## Planning et reservations

| Regle | Statut | Application |
| --- | --- | --- |
| Une reservation doit avoir vehicule, motif, date debut et date fin. | Deja presente | route planning |
| La date fin doit etre apres la date debut. | Deja presente | route planning |
| Une reservation refuse un vehicule hors service. | Deja presente | route planning |
| Une reservation verifie maintenant conducteur assignable si conducteur fourni. | Implementee | route planning |
| Une reservation verifie maintenant affectations, missions, reservations, trajets et maintenance. | Implementee | `getAvailabilityConflicts` |
| Une reservation liee a une mission doit correspondre au vehicule, conducteur et dates de cette mission. | Implementee | `MISSION_RESERVATION_SCOPE_INVALID` |

## Maintenance

| Regle | Statut | Application |
| --- | --- | --- |
| Une intervention expose vehicule, type, description, date, cout, prestataire et statut. | Deja presente | route maintenance |
| Une maintenance doit avoir vehicule, type et description. | Implementee | route maintenance |
| Le vehicule d'une maintenance doit exister. | Implementee | route maintenance |
| Les statuts autorises sont `planifie`, `en_cours`, `termine`, `annule`. | Implementee | route maintenance |
| Une seule maintenance `en_cours` est autorisee par vehicule. | Implementee | `MAINTENANCE_ALREADY_ACTIVE` |
| `planifie -> en_cours`, `planifie -> termine`, `planifie -> annule` sont autorises. | Implementee | route maintenance |
| `en_cours -> termine`, `en_cours -> annule` sont autorises. | Implementee | route maintenance |
| Une maintenance terminee exige une date de realisation. | Implementee | route maintenance |
| Une maintenance terminee ou annulee ne peut plus changer de statut. | Implementee | route maintenance |

## Pleins carburant

| Regle | Statut | Application |
| --- | --- | --- |
| Un plein doit referencer un vehicule existant. | Deja presente | route pleins |
| Un plein refuse un vehicule hors service. | Deja presente | route pleins |
| Un plein verifie l'odometre par rapport au kilometrage initial. | Deja presente | route pleins |
| Un plein verifie l'odometre par rapport au dernier odometre plein. | Deja presente | route pleins |
| Un plein verifie le debordement reservoir selon niveau courant. | Deja presente | route pleins |
| Un plein cree les niveaux `avant_plein` et `apres_plein`. | Deja presente | route pleins |
| Un plein sauvegarde OCR/EXIF si disponible. | Deja presente | route pleins |
| Le schema Joi de creation plein est maintenant applique. | Implementee | route pleins |
| Les litres acceptent trois decimales. | Implementee | Joi plein |
| Un plein verifie conducteur assignable et documents expires. | Implementee | route pleins |
| Un plein exige que le conducteur soit affecte au vehicule a la date du plein. | Implementee | `DRIVER_NOT_ASSIGNED_TO_VEHICLE` |
| Les champs qui impactent l'historique carburant ne sont plus modifiables directement. | Encadree | `FUEL_LEDGER_RECALC_REQUIRED` |
| La suppression d'un plein supprime aussi niveaux carburant, OCR et EXIF lies. | Implementee | `DELETE /api/pleins/:id` |

## Trajets

| Regle | Statut | Application |
| --- | --- | --- |
| Un trajet doit referencer vehicule, conducteur, date debut, date fin, distance. | Deja presente | Joi trajet |
| Un trajet refuse un vehicule hors service. | Deja presente | route trajets |
| Un trajet verifie carburant suffisant selon consommation nominale. | Deja presente | route trajets |
| Un trajet cree les niveaux `avant_trajet` et `apres_trajet`. | Deja presente | route trajets |
| `date_fin` doit etre apres `date_debut`. | Implementee | Joi trajet + route update |
| `traceGps.trajet_id` n'est plus obligatoire a la creation. | Implementee | Joi trajet |
| Un trajet verifie conducteur assignable et documents expires. | Implementee | route trajets |
| Un trajet exige que le conducteur soit affecte au vehicule sur toute la periode. | Implementee | `DRIVER_NOT_ASSIGNED_TO_VEHICLE` |
| Un trajet refuse les chevauchements avec d'autres trajets vehicule/conducteur. | Implementee | `getAvailabilityConflicts` en mode trajet |
| Une mise a jour de trajet rejoue disponibilite, conducteur, affectation et carburant. | Implementee | `PUT /api/trajets/:id` |
| Une mise a jour de trajet reconstruit les niveaux carburant du trajet. | Implementee | `PUT /api/trajets/:id` |
| Une suppression de trajet supprime niveaux carburant et traces GPS lies. | Implementee | `DELETE /api/trajets/:id` |

## Vehicules

| Regle | Statut | Application |
| --- | --- | --- |
| Immatriculation unique. | Deja presente | schema SQL + route vehicules |
| Immatriculation non modifiable. | Deja presente | route vehicules |
| `disponibilite_statut` expose disponible, maintenance en cours ou inactif. | Deja presente | route vehicules |
| `hors_service` est expose pour le frontend. | Deja presente | route vehicules |
| Prochaine maintenance planifiee exposee sur le vehicule. | Deja presente | route vehicules |

## Documents administratifs

| Regle | Statut | Application |
| --- | --- | --- |
| Chaque type document impose un proprietaire vehicule ou conducteur. | Deja presente | route documents |
| Les rappels calculent `expire`, `bientot_expire`, `conforme`. | Deja presente | `/api/documents/rappels` |
| Permis conducteur expire bloque conducteur assignable. | Implementee | `getDriverEligibility` |
| Visite medicale conducteur expiree bloque conducteur assignable. | Implementee | `getDriverEligibility` |

## Corrections

| Regle | Statut | Application |
| --- | --- | --- |
| Une correction doit pointer un enregistrement existant. | Deja presente | route corrections |
| Une correction validee ne peut pas etre revalidee. | Deja presente | statut `pending` requis |
| Une correction rejetee exige ou genere un motif. | Deja presente | route corrections |
| Une correction pending peut etre supprimee. | Deja presente | route corrections |
| Les corrections sont limitees a une liste blanche table/champ. | Implementee | `CORRECTION_WHITELIST` |
| Les champs metier critiques sont bloques pour eviter de contourner les validations. | Implementee | `CORRECTION_RULE_VIOLATION` |

## Stock

| Regle | Statut | Application |
| --- | --- | --- |
| Une sortie de stock exige piece et quantite positive. | Deja presente | route stock |
| Une sortie de stock verrouille la piece en transaction. | Deja presente | route stock |
| Une sortie de stock refuse un stock insuffisant. | Deja presente | route stock |
| Le stock critique est expose via `niveau_critique`. | Deja presente | route stock |

## Import Excel

| Regle | Statut | Application |
| --- | --- | --- |
| Les feuilles sont normalisees par alias. | Deja presente | import service |
| Les champs requis sont verifies par type. | Deja presente | import service |
| Les formats nombre/date/booleen sont verifies. | Deja presente | import service |
| Les dependances simples sont verifiees. | Deja presente | import service |
| Le role historique `driver` est converti en `conducteur`. | Deja presente | import service |
| La colonne `fonction` est prise en charge dans le template/import. | Deja presente | import service |

## Frontend et information utilisateur

| Regle | Statut | Application |
| --- | --- | --- |
| Les conflits mission/affectation peuvent ouvrir une modal de disponibilite. | Deja presente | `AvailabilityConflictDialog` |
| La modal sait afficher missions, affectations, reservations, trajets, maintenance et hors service. | Implementee | `AvailabilityConflictDialog` |
| L'acceptation mission cote conducteur ouvre la modal de conflit si la disponibilite a change. | Implementee | `DashboardChauffeur` |
| Les vehicules hors service affichent badges et boutons desactives dans les flux conducteur principaux. | Deja presente | frontend conducteur |
| Le dashboard admin affiche hors service, maintenance et corrections en attente. | Deja presente | `Dashboard` |

## Codes d'erreur metier actifs

- `AVAILABILITY_CONFLICT`
- `VEHICLE_UNAVAILABLE`
- `VEHICLE_NOT_FOUND`
- `DRIVER_NOT_FOUND`
- `DRIVER_NOT_ASSIGNABLE`
- `DRIVER_NOT_ASSIGNED_TO_VEHICLE`
- `DOCUMENT_EXPIRED`
- `MISSION_ASSIGNMENT_MANAGED_BY_MISSION`
- `MISSION_ACCEPTANCE_RECHECK_FAILED`
- `MISSION_STATUS_TRANSITION_INVALID`
- `MISSION_RESERVATION_SCOPE_INVALID`
- `DELETE_HAS_IMPACTS`
- `MAINTENANCE_ALREADY_ACTIVE`
- `MAINTENANCE_STATUS_TRANSITION_INVALID`
- `ODOMETRE_BELOW_INITIAL`
- `ODOMETRE_INVALID`
- `RESERVOIR_OVERFLOW`
- `INSUFFICIENT_FUEL`
- `FUEL_LEDGER_RECALC_REQUIRED`
- `CORRECTION_RULE_VIOLATION`

## Limites restantes connues

- Le recalcul complet de tout l'historique carburant posterieur a une modification de plein reste encadre par blocage, pas encore automatise.
- Les documents vehicule expires ne bloquent pas encore missions/affectations; seuls les documents conducteur expirés sont branches dans l'eligibilite.
- L'import Excel ne rejoue pas encore toutes les regles metier de disponibilite; il conserve surtout des validations structurelles.
- Les alertes backend restent a finaliser pour devenir la source unique du dashboard.
- Il n'y a pas encore d'authentification serveur permettant des exceptions explicites admin/manager sur certaines regles.
