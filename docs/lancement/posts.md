# Textes prêts à copier

Règles communes :

- Tous les textes sont factuels : aucun chiffre d'utilisateurs, d'étoiles ou de performances, aucun témoignage. Si tu veux en ajouter plus tard, uniquement des chiffres réels.
- Liens à utiliser : dépôt <https://github.com/amadoubaui/atoll>, site <https://atoll.pixework.pro> (version française directe : <https://atoll.pixework.pro/?lang=fr>), téléchargement <https://github.com/amadoubaui/atoll/releases/latest>.
- Joindre la vidéo `docs/media/demo.mp4` (ou le GIF `demo.gif`) partout où c'est possible : c'est elle qui fait comprendre Atoll en 5 secondes.
- Avant de publier, relire chaque texte et l'ajuster à ta voix.

---

## 1. Hacker News (Show HN)

**Titre** (78 caractères) :

```
Show HN: Atoll – A browser that boots like an OS, every site in its own window
```

**URL** : `https://github.com/amadoubaui/atoll`

**Premier commentaire de l'auteur** (à poster juste après) :

```
Hi HN, I'm Amadou, I run a small design and dev studio in Dakar, Senegal.

Atoll is a browser that, when you open it, takes over the whole screen and behaves like a desktop OS: every website is an app in its own window, and there's a desktop with icons and folders, a Dock, a menu bar, a Control Center, multiple spaces, Mission Control, a Launchpad, a ⌘K search and an ⌥Tab switcher. Windows can be dragged, resized, snapped to halves and quarters, minimized into the Dock, or given a "full space" of their own (edge to edge, no chrome).

Why: most of what I use all day is a web app (mail, Figma, Notion, WhatsApp, Claude). Tabs treat them all like documents in a pile. I wanted them to behave like applications, with the window management I already know from macOS, without installing a separate wrapper per site.

How it works:
- Electron (Chromium), so no browser engine fork to maintain. Electron's RunAsNode / NODE_OPTIONS / inspector fuses are disabled in the build.
- The shell is plain JavaScript, no framework, no bundler. A few thousand lines in src/renderer.
- Each app is a sandboxed <webview> composited inside the shell. That is what lets the Dock float over a page, windows animate into the Dock, and Mission Control show live windows.
- Keyboard shortcuts (60+, ⌘/ lists them) are caught in the browser process before the page sees them, so ⌘K works while you're typing in Gmail.
- The Dock rises when the pointer gets *near* the bottom edge, and steps aside when you go all the way down, so it never fights with the macOS Dock. Same idea at the top for the menu bar.
- UI tests drive the real app with mouse and keyboard (node scripts/test-ui.js).

Privacy: no telemetry, no account, no server of its own. Data (desktop layout, notes, settings) stays local. Two outside calls worth mentioning: when a site has no usable icon, Atoll falls back to DuckDuckGo's icon service, and web searches from ⌘K go to Google.

Known limitations: it's 0.1.0. The macOS build isn't notarized yet (right-click → Open the first time). No tabs inside a window yet, no extensions, no Linux build. It's Electron, with what that implies for memory when you open many sites; I haven't done serious measurements yet.

MIT licensed. macOS (Apple Silicon and Intel) and Windows builds are on the releases page. I'd really like feedback on the window management and on what would make you use something like this daily.
```

---

## 2. Reddit

Avant chaque post : lire les règles épinglées du forum (barre latérale, « Rules »), choisir le bon « flair » (étiquette), et rester dans la discussion pour répondre. Un post par forum, espacés d'au moins un jour.

### r/macapps

Ce forum demande que le développeur se présente comme tel et indique le prix. Flair probable : *Free* ou *Developer*. Joindre la vidéo.

**Titre :**
```
[Free, open source] Atoll – a browser that boots like macOS: every website becomes an app with its own window, Dock, spaces and Mission Control
```

**Texte :**
```
Hi r/macapps, I'm the developer.

Atoll opens full screen like a Mac you just switched on. Every site (Gmail, Notion, Figma, WhatsApp…) is an app in its own window: you can drag, resize, snap to halves/quarters, minimize into the Dock with a genie effect, or give a window a full space of its own.

What's there in 0.1.0:
- Desktop with icons and folders, Dock, menu bar, Control Center
- Multiple spaces, Mission Control, Launchpad
- ⌘K search (apps, windows, notes, commands, URLs) and ⌥Tab switcher
- 60+ keyboard shortcuts (⌘/ lists them all)
- Built-in Notes and Settings
- The Dock rises when you approach the bottom without touching the edge, so it never overlaps the macOS Dock

Price: free, MIT license, no telemetry, no account.
Requirements: macOS on Apple Silicon or Intel. Not notarized yet, so the first launch needs right-click → Open.

Download: https://github.com/amadoubaui/atoll/releases/latest
Site: https://atoll.pixework.pro

It's an early version, I'd love to hear what feels off compared to the real macOS window management.
```

### r/browsers

**Titre :**
```
I built an open-source browser where every site is a window on a desktop instead of a tab
```

**Texte :**
```
Atoll is a Chromium-based browser (via Electron) that drops the tab strip entirely. You open it and get a desktop: every website is an app in its own window, with a Dock, folders, multiple spaces, Mission Control, a Launchpad and ⌘K search.

Some details that might interest this sub:
- Each site is a sandboxed webview; shortcuts are handled in the browser process so they work even while a page has focus
- No telemetry, no account, no sync server. Icons fall back to DuckDuckGo's icon service when a site has none; ⌘K web searches use Google (I'd like to make that configurable)
- No extensions yet, no tabs inside a window yet (on the roadmap)

It's not meant to replace your main browser for research-style browsing with 40 tabs. It's for the handful of web apps you live in all day.

macOS and Windows, MIT licensed: https://github.com/amadoubaui/atoll

Curious what this sub thinks of the "window instead of tab" model.
```

### r/opensource

Ce forum préfère les discussions sur le projet libre plutôt que la publicité. Mettre l'accent sur le code et les contributions.

**Titre :**
```
Atoll: an MIT-licensed browser that works like a desktop OS, written in vanilla JS (no framework) – looking for contributors
```

**Texte :**
```
I've just made Atoll public. It's a browser that opens like an operating system: desktop, Dock, windows, spaces, Mission Control, and every website runs as an app in its own window.

On the open source side:
- MIT license
- Plain JavaScript, no framework, no bundler; the shell is a few thousand readable lines
- Electron/Chromium, no engine fork
- End-to-end tests that drive the app with mouse and keyboard
- No telemetry, no account, no server

Things I'd welcome help with: tabs inside a window, desktop widgets, per-app profiles, a built-in ad blocker, and a Linux build. There are a few "good first issue" tickets too.

Repo: https://github.com/amadoubaui/atoll
```

### r/webdev

**Uniquement le samedi** (« Showoff Saturday » : l'autopromotion n'est autorisée que ce jour-là). Commencer le titre par `[Showoff Saturday]`.

**Titre :**
```
[Showoff Saturday] I built a browser that boots like an OS, in vanilla JS with Electron webviews
```

**Texte :**
```
Atoll turns web apps into windows on a desktop: Dock, folders, spaces, Mission Control, ⌘K search, snapping, 60+ shortcuts.

A few implementation notes for web devs:
- The whole shell is vanilla JS + CSS, no framework, no bundler
- Each app is an Electron <webview>, composited in the shell; that's what makes the Dock float over pages and lets Mission Control show live windows
- Shortcuts are intercepted in the main process (before-input-event) so they work while a page has focus
- Icons: Atoll parses the page's <link rel=icon>, apple-touch-icon and web app manifest, and picks the largest
- E2E tests drive the real app like a user would

MIT, macOS + Windows: https://github.com/amadoubaui/atoll
Demo video on the site: https://atoll.pixework.pro

Happy to go into detail on any part.
```

> Vérifie le dernier point (« before-input-event ») dans `src/main/` avant de publier, et retire-le si ce n'est pas exactement le mécanisme utilisé.

### r/SideProject

**Titre :**
```
My side project: Atoll, a browser that boots like an operating system
```

**Texte :**
```
I run a small studio in Dakar, and I spend my days in web apps. So I built Atoll: you open it, it goes full screen like a computer booting up, and every website becomes an app in its own window, with a Dock, a desktop with folders, spaces, Mission Control and a keyboard shortcut for everything.

Stack: Electron (Chromium) + vanilla JavaScript, no framework.
Status: 0.1.0, macOS and Windows, free and MIT licensed, no telemetry.

What I learned building it: the hard part wasn't the windows, it was making the Dock and the menu bar appear at the right moment without fighting the macOS Dock and menu bar.

Site: https://atoll.pixework.pro
Code: https://github.com/amadoubaui/atoll

Feedback welcome, especially on what would make you open it every morning.
```

---

## 3. Product Hunt

**Nom :** `Atoll`

**Tagline** (47 caractères, limite 60) :
```
The browser that boots like an operating system
```

**Description** (courte, Product Hunt limite la longueur) :
```
Atoll opens full screen like a computer you just switched on. Every website becomes an app in its own window, with a desktop, folders, a Dock, spaces, Mission Control, Launchpad, ⌘K search and 60+ shortcuts. Chromium engine. Free, open source, no telemetry.
```

**Catégories / sujets suggérés :** Browsers, Mac, Productivity, Open Source, Windows.

**Liens :** site `https://atoll.pixework.pro`, GitHub `https://github.com/amadoubaui/atoll`.

**Visuels :** logo 240×240 (`assets/icon.png` réduit), puis dans l'ordre : vidéo (lien YouTube de `demo.mp4`), `02-fenetres.jpg`, `04-launchpad.jpg`, `06-dock-revele.jpg`, `08-mission-control.jpg`, `09-recherche.jpg`, `11-raccourcis.jpg` (redimensionnées en 1270×760).

**Premier commentaire du créateur :**
```
Hi Product Hunt 👋 I'm Amadou, I run PIXEWORK, a small studio in Dakar.

Like many of you, my "computer" is mostly web apps: mail, Figma, Notion, WhatsApp, Claude. Browsers still stack them as tabs. So I built Atoll, a browser that boots like an operating system:

• Every site is an app in its own window: drag, resize, snap, minimize into the Dock
• A desktop with icons and folders, a menu bar and a Control Center
• Spaces, Mission Control, Launchpad, ⌘K search, ⌥Tab
• "Full space": one window, edge to edge, in its own space
• The Dock rises when you approach the bottom, and never overlaps the macOS Dock
• 60+ keyboard shortcuts (⌘/ shows them all)

It's free and MIT licensed, with no telemetry, no account and no server. macOS and Windows.

It's version 0.1.0, so I'm especially interested in what feels missing or awkward. Next on the list: tabs inside a window, desktop widgets and per-app profiles. What would you want first?
```

---

## 4. X / Twitter (fil de 5 messages)

Joindre la vidéo au premier message.

**1/5**
```
I built a browser that boots like an operating system.

You open it, it takes the whole screen like a Mac you just switched on, and every website becomes an app in its own window.

It's called Atoll. Free and open source. 🧵
```

**2/5**
```
There's a desktop with icons and folders, a Dock, a menu bar and a Control Center.

Windows drag, resize, snap to halves and quarters, and minimize into the Dock. The green button gives a window its own full space, edge to edge.
```

**3/5**
```
Multiple spaces. Mission Control. Launchpad. ⌘K to search apps, windows, notes and URLs. ⌥Tab to switch.

60+ keyboard shortcuts, and ⌘/ lists them all.
```

**4/5**
```
Small detail I'm proud of: the Dock rises when your pointer gets near the bottom, without touching the edge. Go all the way down and it steps aside, so it never overlaps the macOS Dock.
```

**5/5**
```
Chromium engine via Electron, vanilla JS, MIT license. No telemetry, no account, no server.

macOS + Windows:
https://atoll.pixework.pro
Code: https://github.com/amadoubaui/atoll

A ⭐ on GitHub helps a lot if you like it.
```

---

## 5. LinkedIn (en français)

Joindre la vidéo directement (pas un lien YouTube : LinkedIn met davantage en avant les vidéos téléversées). Mettre le lien dans le texte.

```
Je publie aujourd'hui Atoll, un navigateur libre et gratuit qui démarre comme un système d'exploitation.

L'idée est partie d'un constat simple : nos journées se passent dans des applications web (Gmail, Figma, Notion, WhatsApp, ChatGPT…), mais les navigateurs les empilent toujours dans une rangée d'onglets.

Avec Atoll, on ouvre le navigateur et il prend tout l'écran, comme un ordinateur qu'on allume. Chaque site devient une application dans sa propre fenêtre, avec :
→ un bureau avec des icônes et des dossiers
→ un Dock, une barre de menus et un Centre de contrôle
→ plusieurs espaces, Mission Control et un Launchpad
→ une recherche ⌘K et plus de 60 raccourcis clavier
→ le « plein espace » : une fenêtre bord à bord, dans son propre espace

Atoll est open source (licence MIT), sans télémétrie, sans compte, sans serveur. Disponible pour macOS et Windows.

Il a été conçu et développé à Dakar, chez PIXEWORK. C'est une première version : vos retours m'intéressent beaucoup.

Télécharger et découvrir : https://atoll.pixework.pro/?lang=fr
Le code : https://github.com/amadoubaui/atoll

#OpenSource #Navigateur #Productivité #Dakar #Sénégal #Tech
```

---

## 6. Threads

```
I built a browser that boots like an operating system.

Open it → full screen, like turning on a Mac. Every website is an app in its own window, with a Dock, folders, spaces, Mission Control and ⌘K search.

Free, open source, no telemetry. It's called Atoll.
https://atoll.pixework.pro
```

---

## 7. Mastodon

Mastodon aime le libre et n'aime pas le ton commercial. Les mots-dièse servent à la recherche (il n'y a pas d'algorithme). Joindre la vidéo avec une description pour l'accessibilité (texte alternatif ci-dessous).

```
I've just released Atoll, a free software browser (MIT) that boots like an operating system: every website runs as an app in its own window, on a desktop with a Dock, folders, spaces, Mission Control and 60+ keyboard shortcuts.

No telemetry, no account, no server. Chromium engine via Electron, vanilla JS. macOS and Windows for now, Linux is on the roadmap.

https://github.com/amadoubaui/atoll

#FOSS #OpenSource #Browser #macOS #JavaScript
```

**Texte alternatif de la vidéo :**
```
Screen recording of Atoll: a desktop with icons and a Dock; Wikipedia and Excalidraw open as separate windows; the Launchpad grid of web apps; YouTube in full space with the Dock rising from the bottom; Mission Control showing every window.
```

---

## 8. Groupes WhatsApp / Telegram (en français)

```
Salut à tous 👋 Je viens de sortir Atoll, un navigateur gratuit que j'ai créé : on l'ouvre et il démarre comme un ordinateur. Chaque site (Gmail, WhatsApp Web, YouTube…) s'ouvre dans sa propre fenêtre, avec un Dock, des dossiers et des raccourcis clavier.

Pour Mac et Windows, libre et sans pub ni pistage.
👉 https://atoll.pixework.pro/?lang=fr

Si vous l'essayez, dites-moi ce que vous en pensez, même (surtout) ce qui ne va pas 🙏
```

---

## 9. Article dev.to / Medium (anglais, ~800 mots)

Sur dev.to : sujets (tags) `opensource`, `javascript`, `electron`, `showdev`. Image de couverture : `site/og.png`. Sur Medium, republier le même texte quelques jours plus tard en indiquant l'original de dev.to comme « canonical link » (*Story settings* → *Advanced* → *Customize canonical link*).

```markdown
# I built a browser that boots like an OS

Open most browsers and you get the same thing: an address bar and a row of tabs. That made sense when the web was documents. It doesn't match how I actually work anymore.

My day happens in web apps. Mail, Figma, Notion, WhatsApp, Claude, a couple of dashboards. They're applications, but the browser treats them like pages stacked in a pile. I kept wanting to do things I take for granted on my Mac: put two of them side by side, minimize one, send one to another desktop, see everything at a glance.

So I built **Atoll**, a browser that boots like an operating system. You open it, it takes over the screen like a computer you just switched on, and every website becomes an app in its own window.

It's free, MIT licensed, and on GitHub: https://github.com/amadoubaui/atoll

## What it looks like

When Atoll starts, you get a boot screen, then a desktop. There are icons and folders on the desktop, a Dock at the bottom, a menu bar and a Control Center at the top.

Click an app and it opens in a window. From there it behaves the way you'd expect:

- **Windows** drag, resize, zoom, and snap to halves or quarters when you push them against an edge (or with ⌃⌥ + arrows).
- **Minimize** sends a window into the Dock with a genie animation.
- **Full space** (the green button, or ⌘⇧F) gives a window its own space, edge to edge, no border.
- **Spaces** let you keep several desktops; **Mission Control** (⌘⌥↑) shows every window at once.
- **Launchpad** (⌘⇧A) shows all your apps in a grid.
- **⌘K** searches apps, open windows, notes, commands, or takes a URL. **⌥Tab** switches windows.

There are more than 60 keyboard shortcuts, and ⌘/ lists them all. Any site can become an app: add a URL, or install the page you're on with ⌘⇧D, and Atoll goes looking for its best icon.

## The details that took the longest

**The Dock that knows its place.** On macOS there's already a Dock at the bottom of the screen. If Atoll's Dock appeared whenever the pointer hit the bottom edge, the two would fight. So Atoll's Dock rises when the pointer gets *near* the bottom, without touching the edge. Go all the way down and Atoll's Dock steps aside to let the macOS one through. The menu bar and Control Center at the top work the same way. It sounds like a small thing; it's the thing that makes Atoll feel like it belongs on the machine instead of fighting it.

**Shortcuts that always work.** In a normal browser, a focused page gets your keystrokes first. That's a problem if ⌘K should open search while you're typing an email. Atoll intercepts its shortcuts in the browser process, before any page sees them.

**Windows that are really webviews.** Each app is a sandboxed `<webview>` composited inside the shell. That's what allows the Dock to float over a page, windows to animate into the Dock, and Mission Control to show live windows rather than screenshots.

## The stack

- **Electron**, so the engine is Chromium. I didn't want to maintain a browser engine fork alone; with Electron, Chromium security updates arrive with each Electron release. Electron's riskier switches (RunAsNode, NODE_OPTIONS, the inspector) are disabled in the build.
- **Vanilla JavaScript**, no framework, no bundler. The whole shell is a few thousand lines you can read in an afternoon.
- **End-to-end tests** that launch Atoll and drive it with the mouse and keyboard, the way a user would.

Running it from source is three commands:

    git clone https://github.com/amadoubaui/atoll && cd atoll
    node scripts/dev.js
    node scripts/test-ui.js

## Privacy

Atoll has no telemetry, no account and no server of its own. Your desktop layout, notes and settings stay on your computer. In the interest of full transparency: when a website exposes no usable icon, Atoll asks DuckDuckGo's icon service for one, and web searches typed into ⌘K go to Google.

## What it isn't (yet)

This is version 0.1.0. The macOS build isn't notarized by Apple yet, so the first launch needs a right-click → Open. There are no tabs inside a window, no extensions, and no Linux build. It's Electron, with the memory cost that implies when you open lots of sites.

The roadmap: tabs inside a window for those who want them, desktop widgets, dragging windows between spaces in Mission Control, per-app profiles (two Gmail accounts side by side), a built-in ad blocker, and Linux.

## Try it

Atoll runs on macOS (Apple Silicon and Intel) and Windows 10/11.

- Website: https://atoll.pixework.pro
- Download: https://github.com/amadoubaui/atoll/releases/latest
- Code: https://github.com/amadoubaui/atoll

I'd love feedback, especially on the window management and on what would make you open Atoll every morning. Issues and pull requests are welcome. And if you like it, a star on GitHub helps more than you'd think.
```
