# WORLD CAR RANKING INTELLIGENT — starter technique

Cette version ajoute une architecture serveur à l'interface WCR :
- classement constructeurs conservé avec logos et initiales de secours ;
- deux classements pilotes : saison en cours et cumulatif depuis le lancement WCR ;
- barème pilotes 3/2/1, séparé des points constructeurs ;
- saisie manuelle des pilotes et import des pilotes F1.
- lecture des podiums officiels depuis Supabase ;
- importateur F1 intégré via l'API publique Jolpica (courses + Sprint) ;
- fonction Netlify planifiée toutes les 15 minutes ;
- import idempotent (un `external_id` unique permet de mettre à jour un résultat corrigé) ;
- seuls les résultats `final` de session `race` sont acceptés ;
- aucun résultat de test/qualification/provisoire n'est crédité.

## Ce qui n'est PAS encore actif

Le moteur inclut maintenant une première source F1 : l'API publique Jolpica, avec résultats de Grand Prix et Sprint. La couverture est volontairement limitée aux podiums dont les trois équipes peuvent être mappées sans ambiguïté vers les 20 marques ; les autres sont ignorés plutôt que mal attribués. Cela ne couvre PAS WEC, WRC, GT3, rallye-raid, Formula E ni les championnats nationaux. Pour ces séries, il faut un fournisseur supplémentaire avec droits d'utilisation et un adaptateur. L'import automatique ne tourne qu'après déploiement et configuration de Supabase/Netlify.

## 1. Créer la base Supabase

1. Crée un projet sur https://supabase.com/
2. Dans SQL Editor, exécute `supabase/schema.sql`. Si tu avais déjà créé la table, le script ajoute les trois colonnes pilotes manquantes.
3. Dans Project Settings > API, récupère l'URL du projet et la clé `service_role`.
4. Ne partage jamais la clé `service_role` et ne la mets jamais dans `index.html`.

## 2. Déployer sur Netlify

1. Mets le contenu de ce dossier dans un dépôt GitHub.
2. Dans Netlify, importe ce dépôt.
3. Build command : laisser vide. Publish directory : `.`.
4. Dans Site configuration > Environment variables, ajoute :
   - `SUPABASE_URL` = URL du projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = clé secrète service_role
   - `WCR_RESULTS_API_URL` = URL d'un fournisseur supplémentaire (facultatif, pour les séries hors F1)
   - `WCR_RESULTS_API_TOKEN` = jeton fournisseur si nécessaire
5. Redéploie le site.

Netlify Scheduled Functions ne tournent que sur un déploiement publié. Le planificateur est réglé à 15 minutes dans `netlify.toml`.

## 3. Première source déjà intégrée : F1

L'importateur interroge Jolpica pour les résultats finaux de F1 et les courses Sprint. Documentation : https://github.com/jolpica/jolpica-f1. Les identifiants d'équipe sont convertis vers les constructeurs WCR uniquement pour Ferrari, Mercedes, McLaren, Alpine, Aston Martin et Cadillac. Les podiums contenant une autre équipe sont ignorés. Ce choix prudent évite d'attribuer les points à tort. Jolpica est un projet communautaire ; consulte ses conditions d'utilisation et limites avant un usage public à grande échelle.

## 4. Contrat attendu du fournisseur de résultats

`WCR_RESULTS_API_URL` doit renvoyer du JSON dans ce format. Le fournisseur peut renvoyer plusieurs compétitions et catégories :

```json
{
  "events": [
    {
      "external_id": "provider-event-123-category-hypercar",
      "name": "Nom de la course",
      "date": "2026-11-04",
      "category": "Hypercar",
      "session_type": "race",
      "status": "final",
      "first": "Toyota",
      "second": "Ferrari",
      "third": "Porsche",
      "source_url": "https://official-results.example/race/123",
      "updated_at": "2026-11-04T18:00:00Z"
    }
  ]
}
```

`status` doit être `final`, `session_type` doit être `race`, et les trois constructeurs doivent faire partie de la liste WCR. Les résultats Sprint sont transmis comme un événement distinct avec leur propre `external_id`. Une correction du fournisseur sur le même identifiant remplace l'entrée précédente au lieu de doubler les points.

**Attention au mapping constructeur :** un fournisseur peut nommer une équipe, un concurrent ou un modèle plutôt que le constructeur. Il faut vérifier le constructeur réel de la voiture avant d'envoyer le podium dans ce format. Les compétitions multi-constructeurs et les catégories doivent être contrôlées par un adaptateur métier, pas par une simple recherche de texte.

## 5. Vérification

- Ouvre le site publié : le badge passe à « SYNCHRONISÉ » seulement si l'API de lecture répond.
- Consulte Netlify > Functions > `sync-results` pour les logs du passage automatique.
- Vérifie Supabase > Table Editor > `wcr_races`.
- Fais un test avec un résultat final officiel autorisé par ton fournisseur avant de compter sur la collecte réelle.

## Sources techniques
- Netlify Scheduled Functions : https://docs.netlify.com/build/functions/scheduled-functions/
- Supabase Cron : https://supabase.com/docs/guides/cron


## Nouveautés de cette version : pilotes et logos

- Onglet **PILOTES** : classement de la saison en cours et palmarès cumulatif WCR.
- Barème pilotes distinct : 3 points au premier, 2 au deuxième, 1 au troisième.
- Les résultats F1 importés enregistrent aussi les trois pilotes du podium.
- Les résultats saisis manuellement proposent trois champs pilotes facultatifs.
- Les 20 constructeurs affichent un logo depuis Simple Icons CDN ; si un logo ne peut pas être chargé, les initiales de la marque prennent le relais.

Le terme « meilleur pilote de tous les temps » désigne le meilleur pilote de l'historique WCR **depuis le lancement du projet**, pas le champion historique absolu de tout le sport automobile avant la création de WCR. Le meilleur pilote de la saison est calculé selon le barème WCR et peut donc différer du classement officiel d'un championnat.

### Mise à jour de ton déploiement existant
1. Remplace les fichiers du dépôt GitHub par ceux de cette archive et pousse les changements.
2. Dans Supabase SQL Editor, exécute à nouveau `supabase/schema.sql` : les trois commandes `ADD COLUMN IF NOT EXISTS` ajoutent les champs pilotes sans effacer les résultats existants.
3. Vérifie que les variables d'environnement Supabase sont toujours présentes dans Netlify, puis déclenche un nouveau déploiement.
4. Une fois publié, ouvre l'onglet PILOTES. Les scores apparaîtront au fil des podiums importés ou saisis avec les noms des pilotes.

La collecte intégrée reste limitée à une partie des équipes F1 pouvant être mappées sans ambiguïté. Les championnats WEC, WRC, GT3, Formula E, rallye-raid et séries nationales nécessitent des fournisseurs de résultats additionnels.


## Classements pilotes

Le meilleur pilote de la saison est calculé sur l'année civile en cours. Le palmarès « tous les temps » commence au lancement de WCR ; ce n'est pas un classement historique mondial antérieur au lancement. Les points pilotes ne modifient jamais les points constructeurs.
