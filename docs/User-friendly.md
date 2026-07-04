# Audit user-friendly

Date de l'audit: 2026-07-05  
Objectif: guider les utilisateurs par textes courts, badges, etats visibles et modals actionnables afin de reduire l'apprentissage necessaire.

## Synthese

L'application dispose deja de plusieurs elements utiles: badges de statut mission, badges vehicule disponible/maintenance/hors service, boutons desactives pour certains vehicules indisponibles, comparaison OCR apres plein, tableau de bord enrichi, guide d'import et modals de confirmation.

Le point a ameliorer est l'homogeneite. Certaines erreurs importantes sont affichees en toast, certaines en modal, et d'autres restent des messages generiques. Pour rendre l'application vraiment user-friendly, chaque blocage metier doit expliquer: ce qui bloque, pourquoi, depuis quand/jusqu'a quand, et quelle action l'utilisateur peut faire maintenant.

## Principes UX recommandes

- Toujours afficher l'etat avant l'action: un utilisateur ne doit pas decouvrir qu'un vehicule est indisponible uniquement apres avoir clique sur Enregistrer.
- Un bouton desactive doit toujours avoir une raison visible ou accessible: badge, texte court sous le champ, tooltip ou modal.
- Les erreurs bloquantes doivent etre en modal, pas seulement en toast.
- Les toasts doivent rester reserves aux confirmations simples: cree, modifie, supprime, synchronise.
- Chaque modal doit proposer une prochaine action claire: modifier date, choisir autre vehicule, ouvrir planning, ouvrir documents, demander correction.
- Les mots doivent etre stables: utiliser "Conducteur" dans l'interface, meme si les champs techniques restent `chauffeur_id`.
- Les badges doivent avoir une grammaire commune: couleur, libelle, priorite, emplacement.

## Vocabulaire et libelles

Vocabulaire cible:

- Role applicatif: `conducteur`.
- Libelle interface: "Conducteur".
- Fonction utilisateur: afficher "Fonction" avec valeurs metier comme Conducteur, Directeur, Assistant, Responsable flotte, Mecanicien, Comptable, Autre.
- Eviter "Chauffeur" dans les textes visibles, sauf si c'est une valeur historique importee a migrer.

Libelles de statut recommandes:

- Vehicule: Disponible, Maintenance planifiee, Maintenance en cours, Hors service, Inactif.
- Mission: En attente d'acceptation, Acceptee, Refusee, En cours, Terminee.
- Affectation: Manuelle, Creee par mission.
- Conducteur: Actif, Suspendu, Inactif, Document expire, Bientot expire.
- Documents: Conforme, Expire, Expire bientot.
- Stock: Disponible, Stock critique, Stock insuffisant.
- Corrections: En attente, Validee, Refusee.

## Badges prioritaires

### Vehicules

Afficher un badge vehicule partout ou l'utilisateur selectionne ou consulte un vehicule:

- listes vehicules;
- formulaire mission;
- formulaire affectation;
- ajout plein conducteur;
- saisie trajet;
- planning;
- maintenance;
- tableau de bord;
- detail vehicule.

Contenu minimum:

- badge "Disponible" si action possible;
- badge "Maintenance en cours" si pleins/trajets/missions sont bloques;
- badge "Maintenance planifiee" avec date si l'action reste possible mais doit avertir;
- badge "Hors service" si `actif=0`;
- phrase courte sous le badge: "Pleins et trajets desactives jusqu'a cloture de maintenance."

### Conducteurs

Dans les selects conducteur:

- afficher nom, matricule, fonction;
- badge Actif/Suspendu/Inactif;
- badge Document expire si permis ou visite medicale expire;
- desactiver les conducteurs non assignables avec raison visible.

Exemple de ligne:

`Jean Rakoto (DRV001) - Conducteur` + badge `Actif` + badge `Permis expire bientot`.

### Missions

La table mission doit guider la suite:

- En attente d'acceptation: montrer actions accepter/refuser cote conducteur.
- Acceptee: montrer affectation creee ou a creer.
- En cours: montrer date de depart et vehicule.
- Refusee: afficher motif visible.
- Terminee: afficher kilometrage retour si disponible.

Ajouter un microtexte utile:

- "L'affectation sera creee apres acceptation du conducteur."
- "La disponibilite sera reverifiee au moment de l'acceptation."

## Modals user-friendly

La modal de conflit de disponibilite existante est une bonne base. Elle devrait devenir un composant generique de regle non respectee.

Structure recommandee:

- Titre court: "Periode indisponible".
- Resume en une phrase: "Le vehicule est deja reserve sur une partie de cette plage."
- Bloc "Votre demande": vehicule, conducteur, dates.
- Bloc "Ce qui bloque": liste des conflits avec badges.
- Bloc "Solution": premiere date libre, autre vehicule disponible si possible, autre conducteur si possible.
- Actions: Modifier, Ouvrir planning, Annuler.

Modals a ajouter ou standardiser:

- Periode indisponible.
- Vehicule hors service.
- Conducteur non assignable.
- Document expire.
- Odometre invalide.
- Reservoir depasse.
- Carburant insuffisant pour trajet.
- Suppression avec impacts.
- Import echoue avec rapport de lignes.
- Correction impossible car elle viole une regle.

## Formulaires

### Mission

Avant l'enregistrement:

- afficher la disponibilite au fil de la selection vehicule/conducteur/dates;
- montrer badge vehicule;
- montrer badge conducteur;
- indiquer que l'affectation sera creee seulement apres acceptation;
- desactiver "Creer la mission" si dates invalides, vehicule hors service ou conducteur non assignable.

En cas de conflit:

- modal avec prochaine date libre;
- possibilite de garder les champs saisis;
- mettre en evidence le champ a modifier.

### Affectation

Ameliorations:

- dans le select vehicule, afficher statut et prochaine maintenance;
- dans le select conducteur, afficher statut profil/documents;
- avant enregistrement, previsualiser "Affectation du 10/07/2026 08:00 au 10/07/2026 18:00";
- si source mission, expliquer "Affectation geree par la mission".

### Plein conducteur

Ce qui est deja bien:

- badge vehicule apres selection;
- bouton enregistrement desactive si vehicule hors service;
- modal de succes avec comparaison OCR.

Ameliorations:

- remplacer les erreurs odometre/reservoir par modal persistante;
- afficher dernier odometre connu et niveau carburant estime avant saisie;
- si vehicule hors service, afficher la raison avant le formulaire;
- si aucun vehicule disponible, proposer "Voir mes vehicules" ou "Planifier maintenance".

### Trajet

Ameliorations:

- afficher date debut/date fin dans une section compacte et valider visuellement l'ordre;
- afficher carburant estime disponible et consommation estimee;
- si bouton Enregistrer desactive, montrer la raison: points manquants, vehicule hors service, dates invalides, carburant insuffisant;
- remplacer `window.confirm` de suppression par le composant `ConfirmDialog`.

### Maintenance conducteur

Ameliorations:

- afficher statut vehicule dans le formulaire de planification;
- si le vehicule est deja en maintenance, proposer "voir maintenance en cours" plutot que recreer;
- distinguer "demande de maintenance" et "maintenance validee par manager" si le process le prevoit;
- ajouter badge "Demande envoyee" apres creation.

### Corrections

Ameliorations:

- avant validation, afficher une preview de l'impact;
- si une correction casse une regle, afficher la regle violee;
- regrouper les corrections par urgence: carburant, odometre, identite OCR, document.

### Import

Le guide doit devenir plus prescriptif:

- afficher les enums autorisees: roles, fonctions, statuts mission, statuts maintenance, statuts conducteur;
- expliquer les dependances: User avant DriverProfile, Vehicule avant Affectation, Mission avant Reservation;
- ajouter une section "Erreurs frequentes";
- proposer un precontrole avant import reel;
- apres import, afficher une modal/rapport avec feuille, ligne, champ, valeur, erreur, correction conseillee.

## Tableau de bord admin

But: eviter que l'admin entre dans chaque module pour savoir quoi faire.

Blocs prioritaires:

- Actions urgentes: vehicules hors service, maintenances en cours, documents expires, corrections en attente, stock insuffisant, missions bloquees.
- Planning a risque: conflits, missions en attente d'acceptation, reservations a confirmer.
- Carburant a surveiller: anomalies OCR, surconsommation, reservoir incoherent, carburant insuffisant.
- Conformite: documents expires/bientot expires par vehicule/conducteur.
- Budget/stock: depassements budgetaires et pieces critiques.

Chaque bloc devrait afficher:

- nombre;
- severite;
- 3 a 5 elements les plus urgents;
- action: "Voir", "Traiter", "Planifier", "Valider".

Badges tableau de bord:

- Rouge: bloque ou expire.
- Ambre: attention bientot ou action attendue.
- Bleu/neutre: information.
- Vert: conforme/disponible.

## Etats vides

Les etats vides doivent guider:

- Aucune mission: "Aucune mission pour le moment." + bouton si role peut creer.
- Aucun vehicule affecte: "Aucun vehicule ne vous est affecte. Contactez votre responsable flotte."
- Aucun vehicule disponible: "Tous vos vehicules sont hors service ou en maintenance." + lien maintenance.
- Aucun document: "Ajoutez les documents pour activer les rappels de conformite."
- Import sans donnees: "Le fichier ne contient aucune ligne importable. Telechargez le modele."

## Desactivation des boutons

Boutons a desactiver avec raison visible:

- Enregistrer plein: vehicule hors service, champs manquants, odometre invalide, reservoir depasse.
- Enregistrer trajet: vehicule hors service, depart/arrivee absents, dates invalides, carburant insuffisant.
- Creer mission: vehicule indisponible, conducteur non assignable, dates invalides.
- Accepter mission: conflit apparu, documents expires, vehicule hors service.
- Supprimer mission: mission en cours sans cloture.
- Valider correction: correction casse une regle.
- Sortie stock: stock insuffisant.

Regle UX:

- Si le bouton est desactive, le libelle ou le texte proche doit dire pourquoi.
- Si le blocage est complexe, le clic sur un bouton secondaire "Pourquoi ?" ouvre une modal.

## Notifications et alertes

Toasts:

- Utiliser pour confirmations rapides: "Mission creee", "Maintenance planifiee", "Plein enregistre".
- Eviter pour erreurs bloquantes complexes.

Modals:

- Utiliser pour conflits, suppressions, corrections, import, carburant et documents expires.

Badges:

- Utiliser pour etats persistants visibles dans les listes.

Bannieres:

- Utiliser pour etats globaux: hors ligne, module desactive, import partiel, vehicule en maintenance dans une page detail.

## Accessibilite et lisibilite

- Ne pas coder l'information uniquement par couleur: toujours ajouter un libelle.
- Les badges doivent rester courts: 1 a 3 mots.
- Les dates doivent etre completes dans les modals: jour, mois, annee, heure.
- Les montants et litres doivent etre formates localement.
- Les icones seules doivent avoir un titre/tooltip.
- Les tables doivent garder les actions visibles et coherentes.

## Parcours conducteur recommande

Accueil conducteur:

- Voir immediatement mes vehicules avec badges.
- Voir mes missions en attente avec accepter/refuser.
- Voir actions rapides seulement si possibles.
- Si action impossible, afficher raison: "Aucun vehicule disponible".

Plein:

- Selection vehicule avec statut.
- Voir dernier odometre/niveau estime.
- Saisir litres ou montant.
- Prendre photo.
- Enregistrer.
- Voir modal OCR et anomalies.

Trajet:

- Choisir vehicule deja contextualise.
- Verifier statut vehicule.
- Poser depart/arrivee.
- Voir distance et carburant estime.
- Enregistrer ou voir la raison du blocage.

Maintenance:

- Selectionner vehicule.
- Voir statut actuel.
- Decrire probleme.
- Envoyer demande.
- Voir badge "Demande envoyee" ou "Maintenance planifiee".

## Parcours admin/manager recommande

Demarrage:

- Le tableau de bord liste les priorites du jour.
- Chaque carte est cliquable vers le module filtre.
- Les alertes sont triees par severite.

Mission:

- Creation avec verification de disponibilite.
- Mission envoyee au conducteur.
- Affectation visible seulement apres acceptation.
- En cas de refus, motif visible et action "replanifier".

Conformite:

- Documents expires visibles sur dashboard.
- Affectations/missions avertissent avant blocage.

Corrections:

- File d'attente avec impact.
- Validation impossible si regle metier violee.

## Priorites UX

P0:

- Generaliser les modals de regles non respectees.
- Ajouter raison visible a chaque bouton desactive.
- Harmoniser les termes "Conducteur" et "Fonction".
- Montrer badges vehicule/conducteur dans tous les formulaires de selection.
- Afficher prochain creneau libre dans les conflits de date.

P1:

- Dashboard admin en centre d'actions avec alertes backend.
- Precontrole import avec rapport lisible.
- Modals de suppression avec impacts.
- Conformite documents dans missions/affectations.
- Aide contextuelle courte dans formulaires.

P2:

- Suggestions automatiques: prochain vehicule libre, prochain conducteur libre.
- Filtres rapides par urgence.
- Historique d'audit visible dans les details mission/vehicule.
- Assistant de resolution des alertes.

## Conclusion

L'application est deja sur la bonne voie: les badges vehicules, la modal de disponibilite et le dashboard enrichi donnent une base concrete. Pour passer au niveau "tres user-friendly", il faut rendre les regles visibles avant l'erreur, transformer les blocages en modals utiles, et faire du tableau de bord le point d'entree naturel des decisions admin.
