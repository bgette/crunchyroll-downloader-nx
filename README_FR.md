# Crunchyroll Downloader NX

Crunchyroll Downloader NX permet de télécharger des vidéos depuis *Crunchyroll*.

Par @seiya-git (page github)

## Avertissement légal

Cette application n'est pas affilié à Crunchyroll S.A.S.
Cette application permet de télécharger des vidéos pour les visionner en hors connexion, et cela est interdit dans votre pays (France).
Son utilisaion peut également entraîner une violation des *conditions d'utilisation* entre vous-même et le fournisseur.
Nous ne sommes pas responsables des dommages de vos actes; merci de réfléchir avant d'utiliser cette application.

## Prérequis

* NodeJS >= 12.2.0 (https://nodejs.org/)
* NPM >= 6.9.0 (https://www.npmjs.org/)
* ffmpeg >= 4.0.0 (https://www.videohelp.com/software/ffmpeg)
* MKVToolNix >= 20.0.0 (https://www.videohelp.com/software/MKVToolNix)

### La configuration des chemins

Par défaut, cette app utilise les chemins d'accès aux programmes suivants:
* `./bin/mkvmerge`
* `./bin/ffmpeg`

Pour changer l'emplacement, vous devez éditer le fichier `yml` dans le dossier `./config/`.

### Module de Node

Une fois l'installation de NodeJS terminé, aller dans le répertoire contenant `package.json` et tapez `npm i`.
* [vérifier les dépendances](https://david-dm.org/anidl/crunchyroll-downloader-nx)

## Les options de commandes:

### S'identifier

* `--auth` pour s'identifier

### Polices

* `--dlfonts` télécharger les polices requis pour que l'application puisse mux depuis le dossier `fonts`.

### Obtenir l'ID

* `--search <s>` ou `-f <s>` pour obtenir l'ID d'un titre
* `--search2 <s>` ou `-g <s>` pour obtenir l'ID d'un titre (multilingue, expérimentale)

### Pour télécharger les vidéos ou sous-titres

* `-s <i> -e <s>` indique l'ID de l'animé et l'ID de l'épisode (séparés par des virgules et tirets)
* `-q <s>` choisissez la qualité vidéo [240p ... 1080p, max] (optional)
* `--dub <s>` choisissez le doublage (il se peut que l'application ne puisse pas détécter correctement)
* `-x` choisissez le serveur
* `--tsparts` télécharge les ts en batch [1...10] (default: 10)
* `--dlsubs` choisissez la langue des sous-titres
* * les tags suppportées: "enUS", "esLA", "esES", "frFR", "ptBR", "ptPT", "arME", "itIT", "deDE", "ruRU", "trTR"
* `--oldstreams` utiliser une ancienne API pour récupérer le flux
* `--oldsubs` utiliser une ancienne API pour télécharger les sous-titres
* `--skipdl`/`--novids` passer le téléchargement de la vidéo (seulement si vous téléchargez des sous-titres)
* `--skipmux` passer le mux de la vidéo et le sous-titres

### Proxy

* `--proxy <s>` http(s)/socks proxy WHATWG url (ex. https://myproxyhost:1080)
* `--proxy-auth <s>` le nom d'user et mdp séparés par deux points
* `--ssp` à ne pas utiliser pour télécharger une vidéo et sous-titres

### Muxing

`[note] par défaut, cette application mux en mkv`
* `--mp4` mux en mp4
* `--mks` ajouter les sous-titres au mkv/mp4 (si dispo)

### Nommage (optionnel)

* `--filename <s>` personnaliser le nom de votre fichier
* `-a <s>` nom du groupe
* `-t <s>` personnaliser le titre de l'animé
* `--ep <s>` remplacement du numéro d'épisode (ignoré durant le batch mode)
* `--el <i>` longueur du numéro d'épisode [1...4]
* `--suffix <s>` remplacement du suffixe du nom de fichier (le premier "SIZEp" sera remplacé avec la taille de la vidéo, "SIZEp" par défaut)

### Utile

* `--ftag` tag du titre personnalisé dans le muxed file info (option "override")
* `--nocleanup` déplacer les fichiers inutiles dans la corbeille après avoir fini au lieu de les supprimer
* `-h`, `--help` voir toutes les options

## Filename Template

* Par défaut: `[{rel_group}] {title} - {ep_num} [{suffix}]`
* `{rel_group}` remplacer le nom du groupe avec l'option `-a`
* `{title}` remplacer le titre de l'animé avec l'option `-t`
* `{ep_num}` remplacer la chaîne par le nombre d'épisodes
* `{suffix}` remplacer la chaîne depuis l'option "--suffix" 

## Exemples de commandes

* `node crunchy --search "Naruto"` chercher le titre "Naruto"
* `node crunchy -s 124389 -e 1,2,3` télécharge les épisodes de 1 à 3 depuis l'ID 124389
* `node crunchy -s 124389 -e 1-3,2-7,s1-2` télécharge les épisodes de 1 à 7 et "s"-épisodes 1 à 2 depuis l'ID 124389
* `node crunchy -s 124389 -e m132223` télécharger le media_id 132223 de l'animé avec l'ID 124389

(Trad' par bgette et quelques bg)