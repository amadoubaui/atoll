<div align="center">

<img src="assets/icon.png" width="128" alt="Icône d'Atoll">

# Atoll

### Le navigateur qui démarre comme un système d'exploitation.

Tes applications web deviennent de vraies fenêtres, avec un bureau, un Dock, des dossiers, des espaces, Mission Control et un raccourci clavier pour tout.<br>
Moteur Chromium. Libre et gratuit.

[**Télécharger pour Mac (Apple Silicon)**](https://github.com/amadoubaui/atoll/releases/latest/download/Atoll-mac-apple-silicon.zip) · [Mac Intel](https://github.com/amadoubaui/atoll/releases/latest/download/Atoll-mac-intel.zip) · [Windows](https://github.com/amadoubaui/atoll/releases/latest/download/Atoll-windows-x64.zip) · [Site](https://atoll.pixework.pro) · [English](README.md)

<img src="docs/media/demo.gif" width="800" alt="Atoll en action">

</div>

---

## L'idée

On vit dans le navigateur : Gmail, Figma, Notion, WhatsApp, YouTube, Claude, ChatGPT. C'est ça, notre ordinateur. Pourtant, les navigateurs entassent encore tout dans une rangée d'onglets.

**Atoll renverse la logique.** Tu l'ouvres, il prend tout l'écran, comme quand on allume un Mac. Chaque site est une application dans sa propre fenêtre : on la déplace, on la met côte à côte avec une autre, on la réduit dans le Dock, on lui donne un espace entier, et on pilote tout au clavier.

## Ce qu'il sait faire

- **Démarre en plein écran**, avec un écran de démarrage, un bureau, un Dock et une barre de menus. On peut ensuite le passer en fenêtre et le redimensionner.
- **De vraies fenêtres** : déplacer, redimensionner, réduire dans le Dock (effet « génie »), agrandir, aimanter en moitiés ou en quarts contre un bord, ou au clavier.
- **Plein espace** : le bouton vert donne à une fenêtre son propre espace, bord à bord, sans bordure ni barre.
- **Un Dock qui sait se placer** : approche le pointeur du bas, sans aller jusqu'au bord, et le Dock d'Atoll monte. Va jusqu'au bord, il s'efface pour ne jamais se superposer au Dock de macOS. Même principe en haut pour la barre de menus et le Centre de contrôle.
- **Bureau et dossiers** : icônes, dossiers où l'on glisse des apps, menus au clic droit, renommer, ranger.
- **Launchpad et Recherche** (<kbd>⌘K</kbd>) : apps, fenêtres ouvertes, notes, commandes, adresses.
- **Espaces et Mission Control** (<kbd>⌘⌥↑</kbd>).
- **Tout au clavier** : plus de 60 raccourcis, tous listés avec <kbd>⌘/</kbd>.
- **N'importe quel site devient une application** (<kbd>⌘⇧D</kbd> sur la page ouverte).
- **Centre de contrôle** : thème clair ou sombre, Ne pas déranger, couper le son des apps, taille du Dock, fonds d'écran.
- **Respect de la vie privée** : aucune télémétrie, aucun compte, aucun serveur. Tout reste sur ton ordinateur.

## Installer

**macOS** : télécharge [`Atoll-mac-apple-silicon.zip`](https://github.com/amadoubaui/atoll/releases/latest/download/Atoll-mac-apple-silicon.zip) (M1, M2, M3, M4…) ou [`Atoll-mac-intel.zip`](https://github.com/amadoubaui/atoll/releases/latest/download/Atoll-mac-intel.zip), décompresse, glisse **Atoll** dans *Applications*. La première fois : clic droit sur Atoll → **Ouvrir** → **Ouvrir** (l'application n'est pas encore notariée par Apple).

**Windows** 10 ou 11 : télécharge [`Atoll-windows-x64.zip`](https://github.com/amadoubaui/atoll/releases/latest/download/Atoll-windows-x64.zip), décompresse, lance `Atoll.exe`.

## Développer

```sh
git clone https://github.com/amadoubaui/atoll && cd atoll
node scripts/dev.js          # lancer
node scripts/test-ui.js      # essais de bout en bout
node scripts/build-mac.js    # fabriquer Atoll.app
```

## Du même auteur

- [**Orbe**](https://github.com/amadoubaui/orbe) : un navigateur libre dans l'esprit d'Arc, en français.
- [**KoraCut**](https://github.com/amadoubaui/koracut) : un studio multimédia libre (montage, étalonnage, audio, motion design) pilotable par des agents IA.

Atoll est gratuit. Si Atoll te plaît, une ⭐ sur GitHub aide beaucoup, et tu peux [m'offrir un café](https://buymeacoffee.com/amadouba).

<div align="center"><sub>Créé par <a href="https://pixework.pro">Amadou Ba (PIXEWORK)</a> · Licence MIT</sub></div>
