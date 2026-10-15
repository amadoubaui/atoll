# Fiches GitHub : Atoll, Orbe, KoraCut

Où les saisir : page d'accueil du dépôt → roue dentée à droite de **About** → *Description*, *Website*, *Topics*. Les sujets (« topics ») se tapent un par un, en minuscules, avec des tirets à la place des espaces ; GitHub en accepte 20 au plus.

Pourquoi ça compte : la description est ce qui s'affiche dans les résultats de recherche GitHub et Google, et les sujets font apparaître le dépôt sur les pages thématiques de GitHub (par exemple <https://github.com/topics/browser>).

> Constat au 15 octobre 2026 (lecture seule) : le dépôt **atoll est déjà public**, avec une description et le site renseignés, mais **sans sujets**. Orbe est public sans sujets ni site. KoraCut est public avec 8 sujets.

---

## Atoll

**Description** (en anglais, 283 caractères, limite 350) :

```
The browser that boots like an operating system. Every website becomes an app in its own window, with a desktop, folders, a Dock, spaces, Mission Control, Launchpad, ⌘K search and 60+ keyboard shortcuts. Chromium engine via Electron, vanilla JS. No telemetry. MIT. macOS and Windows.
```

**Website** : `https://atoll.pixework.pro`

**Sujets** (20) :

```
browser
web-browser
chromium
electron
desktop-environment
web-desktop
webos
window-manager
web-apps
macos
windows
productivity
keyboard-shortcuts
keyboard-first
mission-control
dock
launcher
privacy
vanilla-javascript
open-source
```

**Image d'aperçu** (*Settings* → *General* → *Social preview*) : `site/og.png`.

---

## Orbe

Description actuelle : « Orbe — un navigateur Chromium à barre latérale, en français, inspiré d'Arc. Libre (MIT). »

Elle est correcte mais courte, et seulement en français : la recherche GitHub et le public international passent à côté. Proposition bilingue, l'anglais d'abord (environ 260 caractères) :

```
Open-source browser inspired by Arc: sidebar, Spaces, pinned tabs, command bar, split view, gradient themes with grain. French-first interface (English available). Chromium-based. macOS and Windows. MIT. · Navigateur libre inspiré d'Arc, en français.
```

**Website** : à renseigner si Orbe a un site (sinon laisser vide, ou mettre `https://pixework.pro`).

**Sujets** (20) :

```
browser
web-browser
arc-browser
arc-alternative
chromium
electron
sidebar
tabs
spaces
split-view
command-palette
themes
keyboard-shortcuts
productivity
french
francais
macos
windows
javascript
open-source
```

> Le README d'Orbe précise qu'il ne contient aucun code d'Arc et n'a pas de lien avec The Browser Company : c'est important de garder cette mention, puisque les sujets `arc-browser` et `arc-alternative` attirent justement ce public.

---

## KoraCut

Description actuelle : « KoraCut : application de création multimédia libre (montage, étalonnage, audio, motion design), pilotable par des agents IA avec le modèle de ton choix. PIXEWORK, Dakar. GPL v3. »

Même remarque : uniquement en français, alors que les sujets sont en anglais. Proposition bilingue (276 caractères) :

```
Free, open-source multimedia studio: video editing, color grading, audio, VFX, motion design. Every module can be driven by AI agents, with the language model of your choice. Qt 6 + MLT. GPL v3. Made in Dakar by PIXEWORK. · Studio multimédia libre pilotable par des agents IA.
```

**Website** : `https://koracut.org` (déjà renseigné).

**Sujets** (20 ; les 8 actuels sont conservés et complétés) :

```
video-editor
video-editing
color-grading
motion-design
audio-editing
vfx
ai-agents
llm
mcp
agentic-ai
ai-video-editing
mlt
qt6
kde
nle
multimedia
cross-platform
gpl3
open-source
creative-tools
```

> À vérifier avant de les ajouter : `mcp` (si KoraCut expose bien un serveur MCP aux agents) et `kde` (si l'application s'appuie bien sur KDE Frameworks, ce que suggère la page « Construire » du README).
