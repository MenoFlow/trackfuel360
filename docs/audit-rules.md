# Audit des regles de gestion

Date de l'audit: 2026-07-05  
Perimetre lu: backend Express/MySQL, schemas d'initialisation, services d'import, routes API principales, hooks et ecrans frontend qui consomment les erreurs metier.

## Synthese

L'application possede deja plusieurs bases solides: un service de disponibilite pour les affectations/missions, un etat vehicule `hors_service` expose par l'API vehicules, des controles carburant sur odometre/niveau de reservoir, des statuts de mission, des documents administratifs avec rappels, et des badges frontend pour plusieurs etats.

Le principal risque est que ces regles ne sont pas encore appliquees partout de maniere uniforme. Certaines routes rejouent les controles, d'autres s'appuient seulement sur les contraintes SQL, et certains flux de mise a jour/suppression peuvent laisser des donnees metier incoherentes, surtout autour des missions, affectations, trajets, pleins et niveaux de carburant.

Priorite absolue: centraliser les regles bloquantes de disponibilite, appliquer les memes controles en creation et modification, et faire remonter des erreurs structurees qui alimentent une modal explicite cote frontend.

## Carte relationnelle auditee

Tables coeur:

- `users`: role applicatif `admin`, `manager`, `supervisor`, `conducteur`, `auditor`; fonction metier `conducteur`, `directeur`, `assistant`, `responsable_flotte`, `mecanicien`, `comptable`, `autre`.
- `driver_profiles`: profil conducteur lie a `users.id`, avec statut `actif`, `suspendu`, `inactif`.
- `vehicules`: capacite reservoir, consommation nominale, carburant et kilometrage initiaux, site et flag `actif`.
- `affectations`: lien vehicule/conducteur sur une plage; source `manuelle` ou `mission`; peut pointer vers `ordres_mission`.
- `ordres_mission`: mission vehicule/conducteur avec statuts `demande`, `validee`, `rejetee`, `en_cours`, `terminee`.
- `vehicle_reservations`: reservation vehicule/conducteur/mission sur une plage.
- `trips`: trajets avec vehicule/conducteur, dates, distance et traces GPS.
- `pleins`: pleins avec vehicule/conducteur, litres, prix, odometre, photo/OCR.
- `niveaux_carburant`: historique des niveaux avant/apres plein ou trajet.
- `maintenance_interventions`: interventions vehicule avec statuts `planifie`, `en_cours`, `termine`.
- `documents_administratifs`: documents vehicule/conducteur et dates d'expiration.
- `corrections`: demandes de correction qui peuvent modifier une table/champ.
- `stock_pieces`, `piece_sorties`, `budgets_couts`, `rapports_generes`: modules de support.

Points relationnels sensibles:

- `affectations.mission_id` est traite dans `initDb.js` comme FK vers `ordres_mission(id) ON DELETE SET NULL`, alors que la definition SQL initiale n'est pas parfaitement alignee. Pour la regle metier attendue, `SET NULL` est insuffisant: une suppression de mission devrait supprimer ou cloturer l'affectation associee, pas l'orpheliner.
- `niveaux_carburant.trajet_id` est un identifiant texte/non contraint selon le schema lu. La suppression d'un trajet peut laisser des niveaux carburant orphelins.
- `bons_carburant_scannes.plein_id` n'est pas toujours contraint par FK selon le schema lu. La suppression d'un plein peut laisser des donnees OCR orphelines.
- Les suppressions `ON DELETE CASCADE` sur `vehicules` et `users` peuvent supprimer beaucoup d'historique operationnel. C'est acceptable techniquement, mais dangereux fonctionnellement sans confirmation metier enrichie.

## Regles deja presentes

Disponibilite:

- `availabilityService` detecte les conflits de conducteur et vehicule sur les affectations manuelles et les missions actives.
- Les statuts mission consideres bloquants sont `demande`, `validee`, `en_cours`.
- Un vehicule inactif ou en maintenance `en_cours` est indisponible.
- Les reponses de conflit peuvent contenir les plages bloquantes et `next_free_start`.

Vehicule hors service:

- L'API vehicules expose `disponibilite_statut`, `hors_service`, maintenance en cours et prochaine maintenance.
- Le frontend des pleins/trajets/chauffeur utilise deja des badges et des boutons desactives pour les vehicules hors service.

Pleins:

- Verification de l'existence du vehicule et du conducteur.
- Blocage si vehicule indisponible.
- Odometre compare au kilometrage initial et au dernier plein.
- Controle de debordement reservoir avec niveau carburant courant.
- Creation de niveaux `avant_plein` et `apres_plein`.
- Sauvegarde possible des donnees OCR et EXIF.

Trajets:

- Verification de l'existence du vehicule et du conducteur.
- Blocage si vehicule indisponible.
- Controle de carburant suffisant selon consommation nominale et dernier niveau.
- Creation de niveaux `avant_trajet` et `apres_trajet`.

Documents:

- Un type de document impose un proprietaire: vehicule ou conducteur.
- `/api/documents/rappels` calcule `conforme`, `bientot_expire`, `expire`.

Stock:

- Les sorties de pieces sont transactionnelles.
- Le stock insuffisant est bloque.

## Ecarts et risques par module

### Missions et affectations

Constat critique:

- La creation d'une mission insere immediatement une affectation `source='mission'`.
- La regle demandee indique l'inverse: l'affectation automatique doit etre creee uniquement apres acceptation par le conducteur.
- L'acceptation d'une mission met seulement a jour le statut. Elle ne cree pas l'affectation et ne reverifie pas la disponibilite au moment exact de l'acceptation.

Risques:

- Une mission en simple demande bloque deja le vehicule/conducteur comme si elle etait acceptee.
- Plusieurs demandes peuvent etre empechees trop tot, alors que le conducteur pourrait en refuser une.
- Une acceptation tardive peut devenir incoherente si la disponibilite a change entre la demande et l'acceptation.

Regle attendue:

- Creation mission: creer seulement `ordres_mission` en statut `demande`.
- Acceptation conducteur: transaction obligatoire.
- Dans cette transaction: verrouiller mission, conducteur, vehicule et plages concernees; verifier disponibilite; passer la mission a `validee`; creer l'affectation `source='mission'`.
- Rejet conducteur: passer a `rejetee`, motif obligatoire, supprimer toute affectation liee si elle existe par securite.
- Passage `en_cours`: autorise seulement depuis `validee`.
- Passage `terminee`: exiger date retour reelle et kilometrage retour; verifier que le kilometrage retour est superieur ou egal au kilometrage depart.

Suppression:

- Il n'y a pas de route explicite de suppression mission auditee.
- Regle attendue: une suppression de mission par manager/admin doit supprimer l'affectation associee `source='mission'` dans la meme transaction, ou refuser la suppression si la mission est `en_cours` sans cloture explicite.

Modal attendue en cas de conflit:

- Titre: "Mission impossible sur cette periode".
- Afficher periode demandee, vehicule, conducteur, plages bloquantes, type de blocage: affectation, mission acceptee/en cours, maintenance, vehicule inactif.
- Afficher premiere date libre calculee.
- Proposer actions: modifier dates, choisir un autre conducteur, choisir un autre vehicule, ouvrir planning.

### Affectations manuelles

Points positifs:

- La creation et la modification appellent le service de disponibilite.
- La date de fin doit etre apres la date de debut.
- Les affectations venant de mission ne sont pas modifiables depuis la table frontend.

Manques:

- L'API ne verifie pas explicitement que `chauffeur_id` correspond a un `role='conducteur'`.
- Le statut `driver_profiles.statut` n'est pas verifie.
- Les erreurs de FK deviennent des erreurs generiques.
- Les reservations `vehicle_reservations` ne semblent pas integrees au service de disponibilite commun.

Regles attendues:

- Un conducteur assignable doit avoir `users.role='conducteur'` et `driver_profiles.statut='actif'`.
- Un conducteur avec permis ou visite medicale expire doit etre bloque ou signale selon politique metier.
- Toute affectation doit verifier missions, reservations, maintenances, vehicule inactif et affectations existantes.
- Une affectation source mission ne peut etre supprimee que par l'action mission correspondante ou par un administrateur avec confirmation enrichie.

### Planning / reservations

Constat:

- La reservation verifie seulement les chevauchements dans `vehicle_reservations`.
- Elle ne reutilise pas `availabilityService`.
- Elle ne verifie pas les affectations, missions, trajets ni la disponibilite conducteur.

Regle attendue:

- Toute reservation doit passer par un service unique de disponibilite.
- Les statuts bloquants doivent etre: reservations `demandee`/`confirmee`, missions `validee`/`en_cours`, affectations manuelles actives, maintenance `en_cours`, vehicule inactif.
- Si une reservation est rattachee a une mission, la mission doit exister et les dates doivent etre incluses dans la plage mission.

Modal attendue:

- "Vehicule deja reserve" avec plage bloquante, demandeur/conducteur si connu, mission liee si presente, prochaine plage libre.

### Maintenance et etat vehicule

Points positifs:

- Un vehicule en maintenance `en_cours` est considere hors service.
- L'API vehicules expose l'etat et la prochaine maintenance.
- Le frontend chauffeur desactive deja certains boutons de plein/trajet si hors service.

Manques:

- La creation maintenance n'a pas de validation Joi dediee.
- Les transitions de statut sont libres.
- Plusieurs maintenances `en_cours` peuvent exister pour un meme vehicule.
- Une maintenance planifiee ne reserve pas automatiquement de plage d'indisponibilite.
- La planification depuis l'espace conducteur accepte potentiellement un vehicule deja hors service sans message specifique.

Regles attendues:

- Une seule maintenance `en_cours` par vehicule.
- `planifie -> en_cours -> termine` comme chemin standard.
- Date de realisation requise pour `termine`.
- Si une maintenance planifiee a une date/plage precise, elle doit apparaitre dans les disponibilites et avertir avant affectation/mission.
- Un vehicule `actif=0` ou maintenance `en_cours` bloque pleins, trajets, missions, affectations et reservations.

Modal attendue:

- "Vehicule hors service" avec raison: inactif, maintenance en cours, type maintenance, date prevue/realisation si disponible, personne ou prestataire si disponible.
- Boutons: voir maintenance, choisir un autre vehicule, fermer.

### Pleins et niveaux carburant

Points positifs:

- Les controles de base sont bons: vehicule, indisponibilite, conducteur, odometre, reservoir.
- La reponse d'erreur contient deja des donnees utiles pour guider l'utilisateur.

Manques critiques:

- La route POST ne semble pas utiliser le `createPleinSchema` malgre son existence.
- Le conducteur n'est pas verifie comme conducteur actif.
- La date du plein n'est pas comparee aux affectations: un conducteur peut enregistrer un plein sur un vehicule non affecte a cette date.
- La modification d'un plein ne rejoue pas les controles metier principaux: indisponibilite, odometre, reservoir, coherence des niveaux.
- La suppression d'un plein peut laisser les niveaux carburant associes et l'historique de niveau incoherents.

Regles attendues:

- POST et PUT doivent appliquer les memes controles.
- Le plein doit etre autorise seulement si le conducteur est affecte au vehicule a la date du plein, sauf role admin/manager.
- Le plein doit etre refuse si vehicule hors service a la date.
- L'odometre doit etre coherent avec dernier plein, derniers trajets et kilometrage initial.
- La suppression doit soit recalculer l'historique carburant posterieur, soit etre bloquee si elle casse la chronologie.
- Les donnees OCR doivent declencher une alerte si conducteur/vehicule/litres/date divergent fortement, pas seulement une information visuelle apres coup.

Modals attendues:

- "Odometre invalide": afficher odometre saisi, minimum attendu, dernier plein/trajet connu et date.
- "Reservoir depasse": afficher capacite, niveau actuel estime, litres maximum possibles.
- "Conducteur non affecte": afficher vehicule, conducteur, date, affectation active attendue ou prochaine affectation.
- "Vehicule en maintenance": afficher raison et date de disponibilite.

### Trajets, GPS et carburant

Points positifs:

- Creation de niveaux avant/apres trajet.
- Controle carburant suffisant base sur consommation nominale.
- Blocage vehicule hors service.

Manques critiques:

- Le validateur ne force pas clairement `date_fin > date_debut`.
- Pas de verification d'affectation conducteur/vehicule sur la periode.
- Pas de detection de chevauchement avec autres trajets, missions, affectations ou reservations.
- La modification partielle peut etre dangereuse: elle ne reconstruit pas proprement la logique carburant et trace GPS.
- La suppression du trajet ne nettoie pas/recalcule pas les niveaux carburant lies.
- Les points `traceGps` demandent un `trajet_id` cote frontend alors que le backend utilise l'id cree: c'est une contrainte inutile pour l'utilisateur.

Regles attendues:

- `date_fin` strictement apres `date_debut`.
- Le conducteur doit etre affecte au vehicule pendant toute la plage du trajet, sauf saisie admin justifiee.
- Le vehicule et le conducteur ne doivent pas avoir de trajet chevauchant.
- La distance GPS et distance saisie doivent etre comparees avec seuil parametre.
- Les modifications/suppressions doivent recalculer ou invalider proprement les niveaux carburant posterieurs.

Modal attendue:

- "Trajet impossible": afficher conflit de periode, carburant insuffisant ou absence d'affectation.
- Pour carburant insuffisant: niveau actuel, consommation nominale, besoin estime, distance maximale possible.

### Utilisateurs, roles et fonctions

Points positifs:

- Le role `conducteur` remplace bien `driver` dans les schemas lus.
- La colonne `fonction` existe cote backend, frontend et guide d'import.
- L'import convertit `driver` en `conducteur`.

Manques:

- La mise a jour utilisateur rend `role` obligatoire, ce qui complique les modifications partielles.
- Pas de prevention metier avant suppression d'un utilisateur ayant missions, affectations, trajets, pleins ou corrections.
- Le statut conducteur est porte par `driver_profiles`, mais les routes metier ne le consultent pas assez.

Regles attendues:

- Suppression utilisateur: afficher impacts et bloquer si historique operationnel, ou desactiver plutot que supprimer.
- Changement de role depuis `conducteur`: refuser si affectations/missions actives existent.
- Conducteur assignable = role `conducteur` + profil conducteur `actif` + documents requis conformes selon politique.

### Documents administratifs

Points positifs:

- Les documents vehicule/conducteur sont bien distingues par type.
- L'API de rappels calcule expire/bientot/conforme.

Manques:

- Les documents expires ne bloquent pas encore les actions critiques.
- Pas de PUT/DELETE audite pour corriger ou retirer un document.
- Les missions/affectations ne consultent pas les documents conducteur/vehicule.

Regle attendue:

- Politique a definir:
  - Bloquer mission/affectation si permis conducteur expire.
  - Bloquer mission/affectation si assurance/visite technique vehicule expiree.
  - Avertir seulement si bientot expire.

Modal attendue:

- "Document expire" avec type, reference, date d'expiration et action: ouvrir conformite/document.

### Corrections

Constat critique:

- La validation d'une correction execute un `UPDATE` direct sur la table et le champ demandes.
- Les regles du module cible ne sont pas rejouees.

Risques:

- Une correction peut mettre un odometre incoherent, modifier une date pour creer un chevauchement ou casser un statut.
- Le champ `table` et `champ` sont valides en format, mais pas sur une liste blanche metier stricte.

Regles attendues:

- Liste blanche table/champ par type de correction.
- A la validation, appeler le service metier du module cible, pas un update SQL direct.
- Afficher en modal les impacts avant validation: ancienne valeur, nouvelle valeur, controles rejoues, risques.

### Import Excel

Points positifs:

- Le template contient `role=conducteur` et la colonne `fonction`.
- L'import normalise `driver -> conducteur`.
- Les formats et champs requis sont verifies.

Manques:

- Pas de controle metier avance sur les chevauchements, statuts, dates fin > debut, conducteur actif, vehicule hors service, reservoir/odometre.
- `INSERT IGNORE` peut masquer des doublons ou lignes ignorees.
- Les erreurs sont retournees par ligne mais pas toujours sous une forme directement guidante pour l'utilisateur.

Regles attendues:

- Preflight obligatoire avant insertion: toutes les erreurs et avertissements sans ecrire.
- Controle de chevauchement pour affectations, missions, reservations et trajets.
- Controle des enums role/fonction/statut.
- Controle date fin > date debut pour toute plage.
- Rapport d'import lisible: feuille, ligne, champ, valeur, raison, correction suggeree.

### Alertes et tableau de bord

Constat:

- Les routes backend alertes sont des stubs.
- Le tableau de bord frontend calcule plusieurs alertes localement depuis des donnees agregees/mock et consomme aussi maintenance/corrections via API.

Regle attendue:

- Backend unique pour les alertes: carburant, documents, maintenance, conflits de planning, corrections, stock, budget.
- Chaque alerte doit avoir statut, severite, objet lie, date, action recommandee.
- Le dashboard doit consommer cette source plutot que recalculer localement des signaux differents.

## Catalogue priorise des regles a formaliser

P0 - Bloquant avant nouvelles fonctionnalites:

- Une mission ne cree une affectation qu'apres acceptation conducteur.
- L'acceptation mission reverifie la disponibilite dans une transaction.
- Toutes les plages datees utilisent le meme detecteur de chevauchement.
- `date_fin > date_debut` partout: mission, affectation, reservation, trajet, budget.
- Vehicule hors service bloque plein, trajet, mission, affectation, reservation.
- Conducteur assignable = role conducteur + profil actif.
- Suppression mission supprime ou cloture l'affectation associee.
- Modification et suppression de plein/trajet preservent l'historique carburant.

P1 - Important pour fiabilite:

- Documents expires bloquent les missions/affectations selon type.
- Corrections passent par des services metier listes blancs.
- Import Excel ajoute un preflight metier complet.
- Suppression utilisateur/vehicule devient une desactivation ou une suppression avec impacts explicites.
- Planning/resevations integre missions, affectations, maintenance et conducteur.

P2 - Qualite et pilotage:

- Alertes backend persistantes.
- Scores et severites harmonises.
- Dashboard admin centre sur les actions a faire.
- Logs d'audit pour acceptation/refus mission, corrections, suppressions et changements d'etat maintenance.

## Contrat d'erreur recommande pour les modals

Chaque violation metier devrait retourner une structure stable:

```json
{
  "code": "AVAILABILITY_CONFLICT",
  "message": "La periode demandee chevauche une affectation existante.",
  "severity": "blocking",
  "modal": {
    "title": "Periode indisponible",
    "summary": "Le vehicule et le conducteur ne sont pas disponibles sur toute la plage.",
    "primaryAction": "Modifier les dates"
  },
  "details": {
    "requested_start": "2026-07-10T08:00:00.000Z",
    "requested_end": "2026-07-10T18:00:00.000Z",
    "vehicule": {
      "id": 1,
      "immatriculation": "1234 TAD",
      "next_free_start": "2026-07-11T08:00:00.000Z",
      "ranges": []
    },
    "conducteur": {
      "id": 2,
      "nom_complet": "Jean Rakoto",
      "next_free_start": "2026-07-12T08:00:00.000Z",
      "ranges": []
    },
    "suggestions": [
      "Choisir une date apres le 12/07/2026 08:00",
      "Selectionner un autre vehicule"
    ]
  }
}
```

Codes a standardiser:

- `AVAILABILITY_CONFLICT`
- `VEHICLE_OUT_OF_SERVICE`
- `DRIVER_NOT_ASSIGNABLE`
- `DRIVER_NOT_ASSIGNED_TO_VEHICLE`
- `MISSION_STATUS_TRANSITION_INVALID`
- `MISSION_ACCEPTANCE_RECHECK_FAILED`
- `ODOMETER_INVALID`
- `FUEL_TANK_OVERFLOW`
- `INSUFFICIENT_FUEL`
- `DOCUMENT_EXPIRED`
- `DELETE_HAS_IMPACTS`
- `IMPORT_PREFLIGHT_FAILED`
- `CORRECTION_RULE_VIOLATION`
- `STOCK_INSUFFICIENT`

## Matrice des modals attendues

| Situation | Bloquant | Donnees utiles a afficher | Action principale |
| --- | --- | --- | --- |
| Chevauchement affectation/mission/reservation | Oui | Plage demandee, conflits, premiere date libre | Modifier les dates |
| Vehicule en maintenance ou inactif | Oui | Immatriculation, raison, maintenance, date disponible | Choisir autre vehicule |
| Conducteur suspendu/inactif | Oui | Nom, statut, document/profil concerne | Choisir autre conducteur |
| Mission acceptee mais conflit apparu | Oui | Mission, conflit, disponibilite actuelle | Replanifier |
| Plein avec odometre invalide | Oui | Saisi, dernier odometre, date source | Corriger odometre |
| Plein depasse reservoir | Oui | Capacite, niveau actuel, litres max | Corriger litres |
| Trajet sans carburant suffisant | Oui | Niveau actuel, besoin estime, distance max | Reduire/corriger trajet |
| Document expire | Selon politique | Type, reference, expiration | Ouvrir documents |
| Suppression mission | Confirmation | Affectation/reservation associee | Supprimer mission et liens |
| Suppression plein/trajet | Confirmation forte | Impacts niveaux carburant | Recalculer ou annuler |
| Import invalide | Oui | Feuille, ligne, champ, valeur, correction | Telecharger rapport |
| Stock insuffisant | Oui | Stock actuel, quantite demandee, manque | Ajuster quantite |

## Recommandations d'architecture metier

- Creer un service unique `availabilityService` enrichi qui couvre affectations, missions acceptees/en cours, reservations, trajets, maintenance et etat vehicule.
- Creer un service `driverEligibilityService` pour role, profil actif et documents conducteur.
- Creer un service `vehicleEligibilityService` pour actif, maintenance, documents vehicule, capacite reservoir et statut.
- Creer un service `fuelLedgerService` responsable de l'historique `niveaux_carburant`, avec recalcul apres modification/suppression.
- Faire passer corrections et imports par les memes services que les formulaires normaux.
- Standardiser les erreurs API avec `code`, `message`, `details`, `suggestions`.
- Ajouter des transactions sur toute action qui modifie plusieurs tables: acceptation mission, creation plein, creation trajet, sortie stock, suppression mission, recalcul carburant.

## Tests metier a ajouter

P0:

- Creation mission ne cree aucune affectation.
- Acceptation mission cree l'affectation si disponible.
- Acceptation mission echoue si conflit apparu apres la demande.
- Rejet mission supprime l'affectation liee si elle existe.
- Suppression mission manager/admin supprime l'affectation liee.
- Affectation manuelle refuse chevauchement vehicule et conducteur.
- Plein refuse vehicule en maintenance, odometre invalide, reservoir depasse.
- Trajet refuse date fin avant debut, vehicule en maintenance, carburant insuffisant.

P1:

- Planning refuse une reservation qui chevauche mission/affectation.
- Correction de plein rejoue odometre/reservoir.
- Import preflight detecte chevauchement et date invalide.
- Suppression plein/trajet recalcule ou bloque les niveaux carburant.
- Documents expires bloquent les regles choisies.

## Conclusion

La logique metier est deja amorcee, mais elle est dispersee. Le prochain chantier devrait etre de transformer les controles existants en services communs, puis de brancher toutes les routes create/update/delete/import/correction dessus. Cote utilisateur, la modal de disponibilite existante est un bon modele a generaliser a toutes les violations bloquantes.
