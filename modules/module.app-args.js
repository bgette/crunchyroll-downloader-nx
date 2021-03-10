const yargs = require('yargs/yargs')(process.argv.slice(2));


const appArgv = (cfg, langsData) => {
    return yargs.parserConfiguration({
        'duplicate-arguments-array': false,
    })
        // main
        .wrap(Math.min(120)) // yargs.terminalWidth()
        .help(false).version(false)
        .usage('Usage: $0 [options]')
        // auth
        .option('auth', {
            group: 'Authentication:',
            describe: 'Enter authentication mode',
            type: 'boolean'
        })
        .option('user', {
            implies: ['auth', 'pass'],
            group: 'Authentication:',
            describe: 'Username used for un-interactive authentication (Used with --auth)',
            type: 'string'
        })
        .option('pass', {
            implies: ['auth', 'user'],
            group: 'Authentication:',
            describe: 'Password used for un-interactive authentication (Used with --auth)',
            type: 'string'
        })
        // fonts
        .option('dlfonts', {
            group: 'Fonts:',
            describe: 'Download all required fonts for mkv muxing',
            type: 'boolean'
        })
        // search
        .option('search', {
            alias: 'f',
            group: 'Search:',
            describe: 'Search show ids',
            type: 'string'
        })
        .option('search2', {
            alias: 'g',
            group: 'Search:',
            describe: 'Search show ids (multi-language, experimental)',
            type: 'string'
        })
        // select show and eps
        .option('s', {
            group: 'Downloading:',
            describe: 'Sets the show id',
            type: 'number'
        })
        .option('e', {
            group: 'Downloading:',
            describe: 'Select episode ids (comma-separated, hyphen-sequence)',
            type: 'string'
        })
        // quality
        .option('q', {
            group: 'Downloading:',
            describe: 'Set video quality',
            choices: ['240p','360p','480p','720p','1080p','max'],
            default: cfg.videoQuality || '720p',
            type: 'string'
        })
        // set dub
        .option('dub', {
            group: 'Muxing:',
            describe: 'Set audio language by language code (sometimes not detect correctly)',
            choices: langsData.isoLangs,
            default: cfg.dubLanguage || langsData.isoLangs.slice(-1)[0],
            type: 'string'
        })
        // server
        .option('kstream', {
            group: 'Downloading:',
            describe: 'Select specific stream',
            choices: [1, 2, 3, 4, 5],
            default: cfg.kStream || 1,
            type: 'number'
        })
        .option('x', {
            alias: 'server',
            group: 'Downloading:',
            describe: 'Select server',
            choices: [1, 2, 3, 4],
            default: cfg.nServer || 1,
            type: 'number'
        })
        .option('tsparts', {
            group: 'Downloading:',
            describe: 'Download ts parts in batch',
            choices: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30],
            default: cfg.tsparts || 10,
            type: 'number'
        })
        // old api
        .option('oldstreams', {
            group: 'Downloading:',
            describe: 'Use old api for fetching stream',
            default: cfg.oldStreams || false,
            type: 'boolean'
        })
        .option('oldsubs', {
            group: 'Downloading:',
            describe: 'Use old api for fetching subtitles [NOT WORKING!]',
            default: cfg.oldSubs || false,
            hidden: true,
            type: 'boolean'
        })
        // hsubs
        .option('hslang', {
            group: 'Downloading:',
            describe: 'Download video with specific hardsubs',
            choices: langsData.subsLangsFilter.slice(1, -1),
            default: cfg.hsLang || 'none',
            type: 'string'
        })
        // dl subs
        .option('dlsubs', {
            group: 'Downloading:',
            describe: 'Download subtitles by language tag',
            choices: langsData.subsLangsFilter.slice(0, -1),
            default: cfg.dlSubs || 'all',
            type: 'string'
        })
        // default subtitle language
        .option('defsublang', {
            group: 'Muxing:',
            describe: 'Set default subtitle by language',
            choices: langsData.subsLangsFilter.slice(1, -1),
            default: cfg.defSubLang || langsData.subsLangsFilter.slice(1, 2)[0],
            type: 'string'
        })
        // skip
        .option('skipdl', {
            group: 'Downloading:',
            alias: 'novids',
            describe: 'Skip downloading video (for downloading subtitles only)',
            type: 'boolean'
        })
        .option('skipmux', {
            group: 'Muxing:',
            describe: 'Skip muxing video and subtitles',
            type: 'boolean'
        })
        // proxy
        .option('proxy', {
            group: 'Proxy:',
            describe: 'Set http(s)/socks proxy WHATWG url',
            default: cfg.proxy || false,
            hidden: true,
        })
        .option('proxy-auth', {
            group: 'Proxy:',
            describe: 'Colon-separated username and password for proxy',
            default: cfg.proxy_auth || false,
            hidden: true,
        })
        .option('ssp', {
            group: 'Proxy:',
            describe: 'Don\'t use proxy for stream and subtitles downloading',
            default: cfg.proxy_ssp || false,
            hidden: true,
            type: 'boolean'
        })
        // muxing
        .option('mp4', {
            group: 'Muxing:',
            describe: 'Mux into mp4',
            default: cfg.mp4mux || false,
            type: 'boolean'
        })
        .option('noaudsync', {
            group: 'Muxing:',
            describe: 'Don\'t sync audio',
            default: cfg.noaudsync || false,
            hidden: true,
            type: 'boolean'
        })
        .option('mks', {
            group: 'Muxing:',
            describe: 'Add subtitles to mkv/mp4 (if available)',
            default: cfg.muxSubs || false,
            type: 'boolean'
        })
        .option('bcp', {
            group: 'Muxing:',
            describe: 'Use IETF BCP 47/RFC 5646 language tags instead of ISO 639-2 codes for mkv subtitles muxing',
            // https://github.com/unicode-org/cldr-json/blob/master/cldr-json/cldr-core/availableLocales.json
            default: cfg.useBCPtags || false,
            type: 'boolean'
        })
        // set title
        .option('filename', {
            group: 'Filename Template:',
            describe: 'Template',
            default: cfg.filenameTemplate || '[{rel_group}] {title} - {ep_num} [{suffix}]',
            type: 'string'
        })
        .option('a', {
            alias: 'grouptag',
            group: 'Filename Template:',
            describe: 'Release group',
            default: cfg.releaseGroup || 'CR',
            type: 'string'
        })
        .option('t', {
            alias: 'title',
            group: 'Filename Template:',
            describe: 'Series title override',
            type: 'string'
        })
        .option('ep', {
            group: 'Filename Template:',
            describe: 'Episode number override (ignored in batch mode)',
            type: 'string'
        })
        .option('el', {
            group: 'Filename Template:',
            describe: 'Episode number length',
            choices: [1, 2, 3, 4],
            default: cfg.epNumLength || 2,
            type: 'number'
        })
        .option('suffix', {
            group: 'Filename Template:',
            describe: 'Filename suffix override (first "SIZEp" will be replaced with actual video size)',
            default: cfg.fileSuffix || 'SIZEp',
            type: 'string'
        })
        // util
        .option('folder', {
            group: 'Utilities:',
            describe: 'After muxing move file to created "series title" folder',
            default: cfg.useFolder || false,
            type: 'boolean'
        })
        .option('nocleanup', {
            group: 'Utilities:',
            describe: 'Move temporary files to trash folder instead of deleting',
            default: cfg.noCleanUp || false,
            type: 'boolean'
        })
        .option('notrashfolder', {
            implies: ['nocleanup'],
            group: 'Utilities:',
            describe: 'Don\'t move temporary files to trash folder (Used with --nocleanup)',
            default: cfg.noTrashFolder || false,
            type: 'boolean'
        })
        // help
        .option('help', {
            alias: 'h',
            group: 'Help:',
            describe: 'Show this help',
            type: 'boolean'
        })
        // usage
        .example([
            ['$0 --search "Naruto"', 'search "Naruto" in title'],
            ['$0 --search2 "Naruto"', 'search "Naruto" in title using alternative search'],
            ['$0 -s 124389 -e 1,2,3', 'download episodes 1-3 from show with id 124389'],
            ['$0 -s 124389 -e 1-3,2-7,s1-2', 'download episodes 1-7 and "S"-episodes 1-2 from show with id 124389'],
            ['$0 -s 124389 -e m132223', 'download media_id 132223 from show with id 124389']
        ])
        // --
        .argv;
};

const showHelp = yargs.showHelp;

module.exports = {
    appArgv,
    showHelp
};
