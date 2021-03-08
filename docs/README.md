# Crunchyroll Downloader NX

Crunchyroll Downloader NX is capable of downloading videos from the *Crunchyroll* streaming service.

Fork of @seiya-dev's Crunchyroll Downloader NX

## Legal Warning

This application is not endorsed by or affiliated with *Crunchyroll*. This application enables you to download videos for offline viewing which may be forbidden by law in your country. The usage of this application may also cause a violation of the *Terms of Service* between you and the stream provider. This tool is not responsible for your actions; please make an informed decision before using this application.

## Prerequisites

* ffmpeg >= 4.0.0 (https://www.videohelp.com/software/ffmpeg)
* MKVToolNix >= 20.0.0 (https://www.videohelp.com/software/MKVToolNix)
* NodeJS >= 14.5.0 (https://nodejs.org/) (Not needed for binary version)
* NPM >= 6.9.0 (https://www.npmjs.org/) (Not needed for binary version)

### Paths Configuration

By default this application uses the following paths to programs (main executables):
* `./bin/mkvmerge`
* `./bin/ffmpeg`

To change these paths you need to edit `yml` file in `./config/` directory.

### Node Modules (Only for source code)

After installing NodeJS with NPM go to directory with `package.json` file and type: `npm i`.
* [check dependencies](https://david-dm.org/anidl/crunchyroll-downloader-nx)

## CLI Options & CLI Examples

* use `--help` option to see all available options

## Filename Template

* Default: `[{rel_group}] {title} - {ep_num} [{suffix}]`
* `{rel_group}` replace string from `-a` option
* `{title}` replace string by title or from `-t` option
* `{ep_num}` replace string by episode number
* `{ep_titl}` replace string by episode name
* `{suffix}` replace string from `--suffix` option

## Load custom cookies to application

Put your `cookies.txt` file to `config` folder
application will overwrite your cookie with txt file
