# Plan de lancement d'Atoll

Ce plan s'adresse à quelqu'un qui n'a jamais lancé de projet sur GitHub. On suit les étapes dans l'ordre. Les heures sont données **à Dakar (UTC+0, pas d'heure d'été)**, avec l'heure d'origine entre parenthèses.

> Attention au changement d'heure aux États-Unis : il a lieu le **dimanche 1er novembre 2026**.
> Avant cette date, 8 h à New York = **12 h à Dakar**, et 0 h 01 en Californie = **7 h 01 à Dakar**.
> À partir du 1er novembre : 8 h à New York = **13 h à Dakar**, et 0 h 01 en Californie = **8 h 01 à Dakar**.

Les textes à copier sont dans [`posts.md`](posts.md), la description et les sujets du dépôt dans [`github.md`](github.md).

---

## Le principe en trois phrases

1. On prépare tout **avant** d'en parler : dépôt public propre, version téléchargeable, site en ligne. Quelqu'un qui clique doit pouvoir installer Atoll en une minute.
2. On publie **un seul grand endroit par jour**, pas tout en même temps, pour pouvoir répondre à chaque commentaire.
3. On reste **honnête et disponible** : répondre vite, reconnaître les défauts, corriger ce qui est signalé. C'est ce qui fait venir les étoiles, pas la publicité.

---

## Étape 0 : la préparation (2 ou 3 jours avant)

### Sur GitHub (le dépôt `amadoubaui/atoll`)

1. **Vérifier qu'aucun secret n'est dans le dépôt**, ni dans l'historique (clés d'API, mots de passe, fichiers `.env`). Une fois public, c'est trop tard.
2. **Vérifier la visibilité du dépôt** : au 15 octobre, il est **déjà public**. Si ce n'est pas voulu avant le lancement, le repasser en privé : *Settings* → *Danger Zone* → *Change visibility*. Sinon, faire l'étape 1 sans tarder.
3. **Remplir la fiche du dépôt** : sur la page d'accueil du dépôt, roue dentée à droite de « About ».
   - *Description* : copier celle de `github.md`.
   - *Website* : `https://atoll.pixework.pro`
   - *Topics* : copier la liste de `github.md`.
4. **Image d'aperçu** : *Settings* → *General* → *Social preview* → *Edit* → téléverser `site/og.png`. C'est l'image qui s'affiche quand on partage le lien du dépôt sur X, LinkedIn, WhatsApp…
5. **Publier une version (release)** : onglet *Releases* → *Draft a new release*.
   - *Tag* : `v0.1.0`. *Titre* : `Atoll 0.1.0`.
   - Joindre `Atoll-mac.zip` et `Atoll-windows-x64.zip` (les noms doivent être exactement ceux du README et du site).
   - Dans le texte : ce que fait Atoll en 5 lignes, plus la marche à suivre pour la première ouverture sur Mac (clic droit → Ouvrir) et sur Windows (SmartScreen).
   - Tester ensuite le lien `https://github.com/amadoubaui/atoll/releases/latest` dans une fenêtre privée : il doit tomber sur cette version.
6. **Activer les Discussions** : *Settings* → *Features* → cocher *Discussions*. Les gens y posent des questions sans ouvrir de « bug ».
7. **Créer 3 à 5 tickets « good first issue »** (petites tâches faciles, par exemple une traduction, une icône manquante, un raccourci à ajouter). Ça montre que le projet est vivant et accueille les contributions.
8. **Épingler le dépôt** sur ton profil GitHub (*Customize your pins*), à côté d'Orbe et de KoraCut.
9. Appliquer aussi les descriptions et sujets proposés pour **Orbe** et **KoraCut** (voir `github.md`) : les visiteurs d'Atoll iront voir tes autres projets.

### Le site

10. Mettre en ligne le dossier `site/` sur `atoll.pixework.pro` (HTTPS). Vérifier :
    - que la vidéo se lance seule sur ordinateur et sur téléphone ;
    - que le bouton FR fonctionne, et que `https://atoll.pixework.pro/?lang=fr` ouvre directement le site en français (pratique pour WhatsApp et LinkedIn) ;
    - l'aperçu du lien : coller l'adresse dans <https://www.opengraph.xyz> ou dans un message WhatsApp envoyé à soi-même. L'image `og.png` doit s'afficher.
11. Déclarer le site dans **Google Search Console** et y envoyer `https://atoll.pixework.pro/sitemap.xml`.

### Les comptes

12. Avoir un compte **Hacker News** (<https://news.ycombinator.com>). Un compte tout neuf est vu avec méfiance : idéalement, le créer quelques jours avant et lire, voter, commenter un peu.
13. Avoir un compte **Product Hunt** (de préférence le même nom et la même photo partout), et préparer le lancement à l'avance via *Submit* → *Launch a product* en choisissant une date programmée.
14. Avoir un compte **Reddit** qui a déjà un peu d'activité (beaucoup de forums bloquent les comptes neufs ou sans « karma »).
15. Préparer les visuels pour Product Hunt : le logo en 240×240, et 3 à 6 images 1270×760 (on peut reprendre les captures de `docs/media`) plus la vidéo (à mettre sur YouTube ; Product Hunt demande un lien YouTube).

### La dernière vérification

16. Télécharger Atoll depuis la page de version, sur un Mac **qui ne l'a jamais eu**, et suivre exactement les instructions comme un inconnu le ferait. Idem sur un PC Windows si possible. Le premier retour négatif typique, c'est « ça ne s'ouvre pas ».

---

## Calendrier conseillé

Exemple sur deux semaines, à adapter. L'essentiel : **Hacker News un mardi, mercredi ou jeudi**, et **Product Hunt un autre jour**, pas le même.

| Jour | Quoi | Heure à Dakar |
|---|---|---|
| Ven. 16 → lun. 19 oct. | Étape 0 (préparation complète) | — |
| **Mar. 20 oct.** | **Show HN** + message WhatsApp/Telegram aux proches pour qu'ils essaient (pas pour voter) | **12 h** (8 h à New York) |
| Mer. 21 oct. | r/macapps et r/browsers | vers 14 h (10 h à New York) |
| Jeu. 22 oct. | X (fil), Threads, Mastodon, LinkedIn en français | X : 14 h ; LinkedIn : 9 h |
| Ven. 23 oct. | r/opensource ; article dev.to (puis Medium) | 14 h |
| **Sam. 24 oct.** | r/webdev (seulement le samedi, « Showoff Saturday ») et r/SideProject | 14 h |
| Lun. 26 oct. | Propositions aux listes « awesome » (pull requests) et aux newsletters | — |
| **Mar. 27 oct.** | **Product Hunt** | **7 h 01** (0 h 01 en Californie) |
| Semaine suivante | Bilan, version 0.1.1 avec les corrections signalées | — |

Si le Show HN ne prend pas (aucun commentaire au bout de 2 heures), ce n'est pas grave : on peut le reposter une fois quelques jours plus tard, un autre jour et à une autre heure. Hacker News tolère une nouvelle tentative si la première est passée inaperçue. Ne jamais supprimer et republier dans la foulée.

---

## Le jour du Show HN, minute par minute

1. **11 h 50** : ouvrir <https://news.ycombinator.com/submit>.
2. **12 h** : publier.
   - *title* : le titre de `posts.md` (il doit commencer par `Show HN:`).
   - *url* : `https://github.com/amadoubaui/atoll` (le dépôt plutôt que le site : sur HN, les gens veulent voir le code).
   - *text* : laisser vide.
3. **Juste après** : poster soi-même le premier commentaire (texte prêt dans `posts.md`). C'est l'usage sur HN : l'auteur se présente et explique.
4. **Les 3 heures suivantes** : rester devant l'écran et répondre à chaque commentaire, dans l'heure.
5. **À ne pas faire** : demander à des amis de voter ou de commenter, partager le lien direct du post en demandant des votes. HN détecte les votes groupés venant d'un même lien et peut enterrer le post, voire bannir le compte. On peut en revanche dire à ses proches « j'ai publié Atoll, essayez-le » avec le lien du **dépôt** ou du **site**.

### Comment répondre aux commentaires (HN, Reddit, Product Hunt)

- **Remercier, puis répondre sur le fond.** Une phrase de merci suffit, le reste doit être concret.
- **Critique juste** (« c'est juste Electron », « ça consomme de la mémoire », « pas notarié ») : la reconnaître sans se défendre. Exemple : « Oui, c'est Electron, c'est un choix : pas de fork de Chromium à maintenir seul. La mémoire dépend surtout du nombre de sites ouverts ; je n'ai pas encore de mesures sérieuses, si tu en fais je suis preneur. »
- **Bug signalé** : remercier, demander la version de macOS ou de Windows, ouvrir un ticket GitHub soi-même et donner le lien. Corriger vite et le dire dans le fil (« corrigé dans 0.1.1 »). C'est ce qui impressionne le plus.
- **Idée de fonction** : « Bonne idée, je l'ajoute aux idées » + lien vers le ticket ou les Discussions.
- **Comparaison** (Arc, Stack, Shift, Wavebox, « les PWA font déjà ça ») : expliquer la différence sans dénigrer : Atoll n'est pas un gestionnaire d'apps web ni une barre latérale, c'est un bureau complet (fenêtres libres, Dock, espaces, Mission Control) dans une seule fenêtre plein écran.
- **Commentaire agressif ou moqueur** : ne pas répondre sur le même ton. Une réponse calme et factuelle, ou pas de réponse.
- **Anglais** : réponses courtes et simples. Tu peux rédiger en français et faire traduire, mais relis : le ton doit rester le tien.
- **Ne jamais inventer** un chiffre (nombre d'utilisateurs, mesures de performance) qu'on n'a pas.

---

## Le jour de Product Hunt

- Le lancement démarre à **0 h 01 heure du Pacifique** (7 h 01 à Dakar avant le 1er novembre) et dure 24 heures. Programmer le lancement à cette heure-là dans Product Hunt.
- Publier le **premier commentaire du créateur** (texte dans `posts.md`) dès l'ouverture.
- Product Hunt interdit de demander des votes (« upvote me »). On peut écrire : « Atoll est sur Product Hunt aujourd'hui, j'aimerais beaucoup vos retours » avec le lien.
- Répondre à chaque commentaire toute la journée.
- Un bon classement n'est pas garanti, surtout pour un projet sans « chasseur » connu. Ce n'est pas l'objectif principal : l'objectif, ce sont des utilisateurs réels et des retours.

---

## Les 7 jours qui suivent

| Jour | À faire |
|---|---|
| J+1 | Répondre à tous les commentaires restants (HN, Reddit, GitHub). Trier les tickets ouverts : bug, idée, question. |
| J+2 | Corriger les 2 ou 3 bugs les plus signalés. |
| J+3 | Publier **Atoll 0.1.1** avec ces corrections, et une note de version claire. Le dire dans les fils où le bug avait été signalé. |
| J+4 | Poster sur les réseaux une courte vidéo (15 à 30 s) d'une seule fonction : le Dock qui monte, ou Mission Control. |
| J+5 | Envoyer les propositions aux listes « awesome » et aux newsletters (voir plus bas), si ce n'est pas encore fait. |
| J+6 | Remercier publiquement les premiers contributeurs (ceux qui ont ouvert un ticket utile ou une pull request). |
| J+7 | Faire le bilan : étoiles, téléchargements (*Insights* → *Traffic* sur GitHub, et le compteur de téléchargements de la version), retours les plus fréquents. Mettre à jour la feuille de route du README. |

Ensuite, garder un rythme régulier : une petite version toutes les deux à quatre semaines, chacune annoncée simplement (« Atoll 0.2 : onglets dans une fenêtre »). Chaque version est une nouvelle occasion légitime d'en parler.

---

## Obtenir les premières étoiles, honnêtement

Ce qui marche :

- **Un README irréprochable** : la vidéo en haut, une phrase claire, le bouton de téléchargement. C'est déjà le cas.
- **Demander une étoile aux gens qui ont vraiment essayé** et ont dit que ça leur plaisait. « Si Atoll te sert, une étoile sur GitHub m'aide beaucoup. »
- **Les proches et l'entourage pro** (WhatsApp, LinkedIn, PIXEWORK) : leur demander d'**essayer**, et d'étoiler seulement si ça leur plaît.
- **Répondre vite aux tickets** : un projet qui répond est un projet qu'on suit.
- **Les liens depuis Orbe et KoraCut** (déjà en place dans le README) et depuis le site PIXEWORK.
- **Les listes « awesome »** et les annuaires (ci-dessous) : ils amènent des visites pendant des années.

Ce qu'il ne faut **jamais** faire :

- Acheter des étoiles ou des votes (les plateformes le détectent ; GitHub supprime les faux comptes et peut masquer le dépôt).
- Les échanges « une étoile contre une étoile ».
- Créer des comptes secondaires.
- Poster le même message dans des dizaines de groupes ou de forums d'un coup (c'est du spam, et Reddit bannit pour ça).

---

## Listes « awesome » où proposer Atoll

Une liste « awesome » est un dépôt GitHub qui recense les meilleurs outils d'un domaine. On y propose Atoll par une **pull request** : on modifie le fichier `README.md` de la liste pour y ajouter une ligne.

**Mode d'emploi (dans le navigateur, sans rien installer) :**

1. Ouvrir le dépôt de la liste et **lire le fichier `CONTRIBUTING.md`** (ou la section « Contributing » du README) : chaque liste a ses règles (ordre alphabétique, format de la ligne, nombre d'étoiles minimum, ancienneté du projet…).
2. Ouvrir `README.md`, cliquer sur le **crayon** (*Edit this file*). GitHub crée automatiquement une copie (« fork ») dans ton compte.
3. Ajouter la ligne au bon endroit, au bon format, par exemple :
   `- [Atoll](https://github.com/amadoubaui/atoll) - Browser that boots like an operating system: every website becomes an app in its own window, with a desktop, Dock and spaces.`
4. *Commit changes* → *Propose changes* → *Create pull request*. Titre : `Add Atoll`. Dans le texte, une phrase sur ce qu'est Atoll et la confirmation que tu as lu les règles.
5. Attendre. Certaines listes répondent en un jour, d'autres en plusieurs mois. Ne pas relancer plus d'une fois.

**Listes à viser** (vérifier sur place qu'elles sont toujours actives et acceptent ce genre de projet) :

| Liste | Section probable | Remarque |
|---|---|---|
| [serhii-londar/open-source-mac-os-apps](https://github.com/serhii-londar/open-source-mac-os-apps) | Browser | Uniquement des apps Mac libres : Atoll y a sa place. |
| [jaywcjlove/awesome-mac](https://github.com/jaywcjlove/awesome-mac) | Browser | Très visitée. Il y a une icône « open source » à ajouter à la ligne. |
| [iCHAIT/awesome-macOS](https://github.com/iCHAIT/awesome-macOS) | Browsers ou Productivity | |
| [sindresorhus/awesome-electron](https://github.com/sindresorhus/awesome-electron) | Apps → Open Source | Règles strictes, à lire attentivement. |
| [0PandaDEV/awesome-windows](https://github.com/0PandaDEV/awesome-windows) | Browsers | Pour la version Windows. |
| [Awesome-Windows/Awesome](https://github.com/Awesome-Windows/Awesome) | Browsers | Idem. |

Plus tard, quand Atoll aura un peu d'historique : proposer un **cask Homebrew** (installation par `brew install --cask atoll`). Homebrew demande un projet déjà connu et se montre de plus en plus exigeant sur les applications non signées ou non notariées : à vérifier au moment voulu.

---

## Annuaires, newsletters et sites qui recensent les nouveautés

À faire **après** le Show HN (on peut citer la discussion HN si elle a bien marché). Toujours un message court et personnel, jamais un envoi groupé.

**Annuaires (on inscrit Atoll soi-même) :**

- [AlternativeTo](https://alternativeto.net) : créer la fiche d'Atoll et l'indiquer comme alternative à Arc, Safari, Chrome, Stack, Shift.
- [OpenAlternative](https://openalternative.co) : annuaire d'alternatives libres ; formulaire de proposition.
- [Uneed](https://www.uneed.best) : lancements quotidiens, proche de Product Hunt.
- [MacUpdate](https://www.macupdate.com) et [Softpedia](https://www.softpedia.com) : fiches de logiciels, très bien référencées sur Google.
- [Indie Hackers](https://www.indiehackers.com) : raconter l'histoire du projet dans la rubrique des publications.
- [DEV Community](https://dev.to) : l'article de `posts.md`.

**Newsletters et sites (on leur propose le lien) :**

- [Changelog News](https://changelog.com/news) : newsletter hebdomadaire sur le logiciel libre, avec un formulaire de proposition.
- [Console.dev](https://console.dev) : sélection d'outils pour développeurs ; ils acceptent les suggestions.
- [Hacker Newsletter](https://hackernewsletter.com) : reprend les meilleurs liens de HN de la semaine (rien à faire, sauf si le Show HN marche).
- [TLDR](https://tldr.tech) : newsletter tech quotidienne, avec un lien pour proposer un sujet.
- [Sidebar](https://sidebar.io) : liens design et interface, on peut proposer un lien.
- **En français** : [Korben](https://korben.info) (blog tech très lu, adore les logiciels libres et originaux ; contact sur le site), le [Journal du Hacker](https://www.journalduhacker.net) (l'équivalent francophone de HN, on y poste soi-même), [LinuxFr.org](https://linuxfr.org) (rubrique « Liens » ; Atoll n'a pas encore de version Linux, à garder pour plus tard).

Pour chaque proposition : 3 lignes maximum. Ce qu'est Atoll, pourquoi c'est différent (le bureau complet dans le navigateur), le lien du site et du dépôt, et la mention « libre, MIT, sans télémétrie ».

---

## Ce qu'il reste à vérifier avant de lancer

- [ ] Le dépôt est public et ne contient aucun secret, ni dans son historique.
- [ ] La version 0.1.0 est publiée avec les deux fichiers aux bons noms.
- [ ] Le site `atoll.pixework.pro` est en ligne en HTTPS, l'aperçu du lien affiche `og.png`.
- [ ] Le lien de soutien <https://buymeacoffee.com/amadouba> fonctionne.
- [ ] Les dépôts Orbe et KoraCut sont publics (le site et le README y renvoient).
- [ ] Tu as testé l'installation sur un Mac « neuf ».
- [ ] Tu as bloqué du temps libre les jours de lancement pour répondre.
