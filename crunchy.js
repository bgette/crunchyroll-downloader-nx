#!/usr/bin/env node

// build-in
const path = require('path');
const fs = require('fs');
const url = require('url');

// package program
const packageJson = require('./package.json');
const ua = {headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:70.0) Gecko/20100101 Firefox/70.0'}};
console.log(`\n=== Crunchyroll Downloader NX ${packageJson.version} ===\n`);

// new-cfg
const cfgFolder = __dirname + '/config';
const binCfgFile = path.join(cfgFolder,'bin-path.yml');
const dirCfgFile = path.join(cfgFolder,'dir-path.yml');
const cliCfgFile = path.join(cfgFolder,'cli-defaults.yml');
const sessCfgFile = path.join(cfgFolder,'session.yml');

// plugins
const { lookpath } = require('lookpath');
const yargs = require('yargs');
const shlp = require('sei-helper');
const got = require('got').extend(ua);
const yaml = require('yaml');
const xhtml2js = shlp.xhtml2js;

// m3u8 and subs
const m3u8 = require('m3u8-parsed');
const streamdl = require('hls-download');
const modulesFolder = __dirname + '/modules';
const fontsData = require(modulesFolder+'/module.fontsData');
const crunchySubs = require(modulesFolder+'/module.crunchySubs');

// get cfg file
function getYamlCfg(file){
    let data = {};
    if(fs.existsSync(file)){
        try{
            data = yaml.parse(fs.readFileSync(file, 'utf8'));
            return data;
        }
        catch(e){}
    }
    return data;
}

// params
let cfg = {
    bin: getYamlCfg(binCfgFile),
    dir: getYamlCfg(dirCfgFile),
    cli: getYamlCfg(cliCfgFile),
};

// sess
let session = getYamlCfg(sessCfgFile);

// langs
const dubLangs = {
    'English':    'eng',
    'Spanish':    'spa',
    'French':     'fre',
    'Portuguese': 'por',
    'Arabic':     'ara',
    'Italian':    'ita',
    'German':     'ger',
    'Russian':    'rus',
    'Turkish':    'tur',
    'Japanese':   'jpn',
    '':           'unk',
};
// dub langs
const isoLangs = [];
for(let lk of Object.keys(dubLangs)){
    isoLangs.push(dubLangs[lk]);
}
// dubRegex
const dubRegex =
    new RegExp(`\\((${Object.keys(dubLangs).join('|')})(?: Dub)?\\)$`);
// subs codes
const langCodes = {
    'en - us': ['eng','English (US)'],
    'es - la': ['spa','Spanish (Latin American)'],
    'es - es': ['spa','Spanish'],
    'fr - fr': ['fre','French'],
    'pt - br': ['por','Portuguese (Brazilian)'],
    'pt - pt': ['por','Portuguese'],
    'ar - me': ['ara','Arabic'],
    'it - it': ['ita','Italian'],
    'de - de': ['ger','German'],
    'ru - ru': ['rus','Russian'],
    'tr - tr': ['tur','Turkish'],
    '':        ['unk','Unknown']
};
// subs filter codes
const subsFilterLangs = ['all','none'];
for(let lc of Object.keys(langCodes)){
    lc = lc.match(/(\w{2}) - (\w{2})/);
    if(lc){
        lc = `${lc[1]}${lc[2].toUpperCase()}`;
        subsFilterLangs.push(lc);
    }
}

// args
let argv = yargs
    // main
    .wrap(Math.min(100))
    .usage('Usage: $0 [options]')
    .help(false).version(false)
    // auth
    .describe('auth','Enter auth mode')
    // fonts
    .describe('dlfonts','Download all required fonts for mkv muxing')
    // search
    .describe('search','Search show ids')
    .alias('search','f')
    .describe('search2','Search show ids (multi-language, experimental)')
    .alias('search2','g')
    // req params
    .describe('s','Sets the show id')
    .describe('e','Select episode ids (comma-separated, hyphen-sequence)')
    // quality
    .describe('q','Video Quality')
    .choices('q',['240p','360p','480p','720p','1080p','max'])
    .default('q',(cfg.cli.videoQuality || '720p'))
    // set dub
    .describe('dub','Set audio language by language code (sometimes not detect correctly)')
    .choices('dub', [...new Set(isoLangs)])
    .default('dub', (cfg.cli.dubLanguage || 'jpn'))
    // server
    .describe('kstream','Select specific stream')
    .choices('kstream', [1, 2, 3, 4, 5])
    .default('kstream', (cfg.cli.kStream || 1))
    .describe('x','Select server')
    .choices('x', [1, 2, 3, 4])
    .default('x', (cfg.cli.nServer || 1))
    .describe('tsparts','Download ts parts in batch')
    .choices('tsparts', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .default('tsparts', (cfg.cli.tsparts || 10))
    // old api
    .describe('oldstreams','Use old api for fetching stream')
    .boolean('oldstreams')
    .default('oldstreams', cfg.cli.oldStreams || false)
    .describe('oldsubs','Use old api for fetching subtitles')
    .boolean('oldsubs')
    .default('oldsubs', cfg.cli.oldSubs || false)
    // dl subs
    .describe('dlsubs','Download subtitles by language tag')
    .choices('dlsubs', subsFilterLangs)
    .default('dlsubs', (cfg.cli.dlSubs || 'all'))
    // skip
    .describe('skipdl','Skip downloading video (for downloading subtitles only)')
    .boolean('skipdl')
    .alias('skipdl','novids')
    .describe('skipmux','Skip muxing video and subtitles')
    .boolean('skipmux')
    // proxy
    .describe('proxy','Set http(s)/socks proxy WHATWG url')
    .default('proxy', (cfg.cli.proxy || false))
    .describe('proxy-auth','Colon-separated username and password for proxy')
    .default('proxy-auth', (cfg.cli.proxy_auth || false))
    .describe('ssp','Don\'t use proxy for stream and subtitles downloading')
    .boolean('ssp')
    .default('ssp', (cfg.cli.proxy_ssp || false))
    // muxing
    .describe('mp4','Mux into mp4')
    .boolean('mp4')
    .default('mp4',cfg.cli.mp4mux || false)
    // .describe('noaudsync','Set audio offset to 0ms')
    .boolean('noaudsync')
    .describe('mks','Add subtitles to mkv/mp4 (if available)')
    .boolean('mks')
    .default('mks',cfg.cli.muxSubs || false)
    // set title
    .describe('filename','Filenaming: Template')
    .default('filename', (cfg.cli.filenameTemplate || '[{rel_group}] {title} - {ep_num} [{suffix}]'))
    .describe('a','Filenaming: Release group')
    .default('a',cfg.cli.releaseGroup || 'CR')
    .describe('t','Filenaming: Series title override')
    .describe('ep','Filenaming: Episode number override (ignored in batch mode)')
    .describe('el','Filenaming: Episode number length')
    .choices('el', [1, 2, 3, 4])
    .default('el',cfg.cli.epNumLength || 2)
    .describe('suffix','Filenaming: Filename suffix override (first "SIZEp" will be replaced with actual video size)')
    .default('suffix',cfg.cli.fileSuffix || 'SIZEp')
    // util
    .describe('nocleanup','Move temporary files to trash folder instead of deleting')
    .boolean('nocleanup')
    .default('nocleanup',cfg.cli.noCleanUp || false)
    // help
    .describe('help','Show this help')
    .boolean('help')
    .alias('help','h')
    .argv;

// fn variables
let audDubT  = '',
    audDubE  = '',
    fnTitle  = '',
    fnEpNum  = '',
    fnSuffix = '',
    fnOutput = '',
    isBatch  = false,
    sxList   = [];

// api domains
const domain    = 'https://www.crunchyroll.com';
const apidomain = 'https://api.crunchyroll.com';

// api script urls
const api = {
    search1:     `${domain}/ajax/?req=RpcApiSearch_GetSearchCandidates`,
    search2:     `${domain}/search_page`,
    search3:     `${apidomain}/autocomplete.0.json`,
    session:     `${apidomain}/start_session.0.json`,
    collectins:  `${apidomain}/list_collections.0.json`,
    rss_cid:     `${domain}/syndication/feed?type=episodes&lang=enUS&id=`,
    rss_gid:     `${domain}/syndication/feed?type=episodes&lang=enUS&group_id=`,
    media_page:  `${domain}/media-`,
    series_page: `${domain}/series-`,
    subs_list:   `${domain}/xml/?req=RpcApiSubtitle_GetListing&media_id=`,
    subs_file:   `${domain}/xml/?req=RpcApiSubtitle_GetXml&subtitle_script_id=`,
    auth:        `${domain}/xml/?req=RpcApiUser_Login`,
    // ${domain}/showseriesmedia?id=24631
    // ${domain}/{GROUP_URL}/videos,
};

// select mode
if(argv.auth){
    doAuth();
}
else if(argv.dlfonts){
    getFonts();
}
else if(argv.search && argv.search.length > 2){
    doSearch();
}
else if(argv.search2 && argv.search2.length > 2){
    doSearch2();
}
else if(argv.s && !isNaN(parseInt(argv.s,10)) && parseInt(argv.s,10) > 0){
    getShowById();
}
else{
    yargs.showHelp();
    process.exit();
}

// auth method
async function doAuth(){
    console.log('[INFO] Authentication');
    const iLogin = await shlp.question('[Q] LOGIN/EMAIL');
    const iPsswd = await shlp.question('[Q] PASSWORD   ');
    const authData = new URLSearchParams({
        name: iLogin,
        password: iPsswd
    });
    let auth = await getData(api.auth,{ method: 'POST', body: authData.toString(), useProxy: true, skipCookies: true });
    if(!auth.ok){
        console.log('[ERROR] Authentication failed!');
        return;
    }
    setNewCookie(auth.res.headers['set-cookie'], true);
    console.log('[INFO] Authentication successful!');
}

// get cr fonts
async function getFonts(){
    console.log('[INFO] Downloading fonts...');
    for(let f of Object.keys(fontsData.fonts)){
        let fontFile = fontsData.fonts[f];
        let fontLoc  = path.join(cfg.dir.fonts, fontFile);
        if(fs.existsSync(fontLoc) && fs.statSync(fontLoc).size != 0){
            console.log(`[INFO] ${f} (${fontFile}) already downloaded!`);
        }
        else{
            if(fs.existsSync(fontLoc) && fs.statSync(fontLoc).size == 0){
                fs.unlinkSync(fontLoc);
            }
            let fontUrl = fontsData.root + fontFile;
            let getFont = await getData(fontUrl, { useProxy: true, skipCookies: true, binary: true });
            if(getFont.ok){
                fs.writeFileSync(fontLoc, getFont.res.body);
                console.log(`[INFO] Downloaded: ${f} (${fontFile})`);
            }
            else{
                console.log(`[WARN] Failed to download: ${f} (${fontFile})`);
            }
        }
    }
    console.log('[INFO] All required fonts downloaded!');
}

async function doSearch(){
    // session
    let apiSession = '';
    if(session.session_id && checkSessId(session.session_id) && !argv.nosess){
        apiSession = session.session_id.value;
    }
    // seacrh params
    const params = new URLSearchParams({
        q: argv.search,
        clases: 'series',
        media_types: 'anime',
        fields: 'series.series_id,series.name,series.year',
        offset: argv.p ? (parseInt(argv.p)-1)*100 : 0,
        limit: 100,
        locale: 'enUS',
    });
    if(apiSession != ''){
        params.append('session_id', apiSession);
    }
    else{
        const sessionParams = new URLSearchParams({
            device_type:  'com.crunchyroll.windows.desktop',
            device_id  :  '00000000-0000-0000-0000-000000000000',
            access_token: 'LNDJgOit5yaRIWN',
        });
        let reqSession = await getData(`${api.session}?${sessionParams.toString()}`,{useProxy:true});
        if(!reqSession.ok){
            console.log('[ERROR] Can\'t update session id!');
            return;
        }
        reqSession = JSON.parse(reqSession.res.body);
        if(reqSession.error){
            console.log(`[ERROR] ${aniList.message}`);
        }
        else{
            argv.nosess = false;
            console.log(`[INFO] Your country: ${reqSession.data.country_code}\n`);
            apiSession = session.session_id.value;
            params.append('session_id', apiSession);
        }
    }
    // request
    let aniList = await getData(`${api.search3}?${params.toString()}`,{useProxy:true});
    if(!aniList.ok){
        console.log('[ERROR] Can\'t get search data!');
        return;
    }
    aniList = JSON.parse(aniList.res.body);
    if(aniList.error){
        console.log(`[ERROR] ${aniList.message}`);
    }
    else{
        if(aniList.data.length > 0){
            console.log('[INFO] Search Results:');
            for(let a of aniList.data){
                await printSeasons(a,apiSession);
            }
            console.log(`\n[INFO] Total results: ${aniList.data.length}\n`);
        }
        else{
            console.log('[INFO] Nothing Found!');
        }
    }
}

async function printSeasons(a,apiSession){
    console.log(`[SERIES] #${a.series_id} ${a.name}`,(a.year?`(${a.year})`:''));
    let collParams = new URLSearchParams({
        session_id: apiSession,
        series_id:  a.series_id,
        fields:     'collection.collection_id,collection.name',
        limit:      5000,
        offset:     0,
        locale:     'enUS',
    });
    let seasonList = await getData(`${api.collectins}?${collParams.toString()}`,{useProxy:true});
    if(seasonList.ok){
        seasonList = JSON.parse(seasonList.res.body);
        if(seasonList.error){
            console.log(`  [ERROR] Can't fetch seasons list: ${seasonList.message}`);
        }
        else{
            if(seasonList.data.length>0){
                for(let s of seasonList.data){
                    console.log(`  [S:${s.collection_id}] ${s.name}`);
                }
            }
            else{
                console.log('  [ERROR] Seasons list is empty');
            }
        }
    }
    else{
        console.log('  [ERROR] Can\'t fetch seasons list (request failed)');
    }
}

async function doSearch2(){
    // search params
    const params = new URLSearchParams({
        q: argv.search2,
        sp: argv.p ? parseInt(argv.p) - 1 : 0,
        limit: 100,
        st: 'm'
    });
    // request
    let reqAniSearch  = await getData(`${api.search2}?${params.toString()}`,{useProxy:true});
    if(!reqAniSearch.ok){ return; }
    let reqRefAniList = await getData(`${api.search1}`,{useProxy:true});
    if(!reqRefAniList.ok){ return; }
    // parse fix
    let aniSearchSec  = reqAniSearch.res.body.replace(/^\/\*-secure-\n(.*)\n\*\/$/,'$1');
    let aniRefListSec = reqRefAniList.res.body.replace(/^\/\*-secure-\n(.*)\n\*\/$/,'$1');
    aniSearchSec = JSON.parse(aniSearchSec);
    aniRefListSec = JSON.parse(aniRefListSec);
    let totalResults = 0;
    // data
    const mainHtml = xhtml2js({ src: '<html>'+aniSearchSec.data.main_html+'</html>', el: 'body' }).$;
    const results0 = mainHtml.find('p');
    const results1 = results0.eq(0).text().trim();
    const results2 = results0.eq(1).text().trim();
    const resultsStr = results2 != '' ? results2 :
        results1 != '' ? results1 : 'NOTHING FOUND!';
    console.log(`[INFO] ${resultsStr}`);
    // seasons
    const searchData = mainHtml.find('li');
    for(let v=0; v<searchData.length; v++){
        let href  = searchData.eq(v).find('a')[0].attribs.href;
        let data  = aniRefListSec.data.filter(value => value.link == href).shift();
        let notLib = href.match(/^\/library\//) ? false : true;
        if(notLib && data.type == 'Series'){
            if(session.session_id && checkSessId(session.session_id) && !argv.nosess){
                await printSeasons({series_id: data.id, name: data.name},session.session_id.value);
            }
            else{
                console.log('  [ERROR] Can\'t fetch seasons list, session_id cookie required');
            }
            totalResults++;
        }
    }
    if(totalResults>0){
        console.log('[INFO] Non-anime results is hidden');
        console.log(`[INFO] Total results: ${totalResults}\n`);
    }
}

async function getShowById(){
    const epListRss = `${api.rss_cid}${argv.s}`;
    const epListReq = await getData(epListRss,{useProxy:true});
    if(!epListReq.ok){ return 0; }
    const src = epListReq.res.body;
    // title
    let seasonData = xhtml2js({ src, el: 'channel', isXml: true }).$;
    const vMainTitle = seasonData.find('title').eq(0).text().replace(/ Episodes$/i,'');
    const isSimulcast = seasonData.find('crunchyroll\\:simulcast').length > 0 ? true : false;
    // detect dub in title
    if(vMainTitle.match(dubRegex)){
        audDubT = dubLangs[vMainTitle.match(dubRegex)[1]];
        console.log(`[INFO] audio language code detected, setted to ${audDubT} for this title`);
    }
    // show title
    console.log(`[S:${argv.s}] ${vMainTitle}`,(isSimulcast?'[simulcast]':''));
    // episodes
    const epsList  = seasonData.find('item');
    const epsCount = epsList.length;
    let selEpsArr = [], spCount = 0, isSp = false, eLetter = '';
    // selected
    let selEpsInp = argv.e ? argv.e.toString().split(',') : [], selEpsInpRanges = [''];
    let epsRegex  = /^((?:|E|S))(\d{1,3})$/i;
    selEpsInp = selEpsInp.map((e)=>{
        let eSplitNum, eFirstNum, eLastNum;
        if(e.match('-')){
            let eRegx = e.split('-');
            if( eRegx.length == 2
                    && eRegx[0].match(epsRegex)
                    && eRegx[1].match(/^\d{1,3}$/)
            ){
                eSplitNum = eRegx[0].match(epsRegex);
                eLetter = eSplitNum[1].match(/s/i) ? 'S' : 'E';
                eFirstNum = parseInt(eSplitNum[2]);
                eLastNum = parseInt(eRegx[1]);
                if(eFirstNum < eLastNum){
                    for(let i=eFirstNum;i<eLastNum+1;i++){
                        selEpsInpRanges.push(eLetter + i.toString().padStart(2,'0'));
                    }
                    return '';
                }
                else{
                    return eLetter + ( eFirstNum.toString().padStart(2,'0') );
                }
            }
            return '';
        }
        else if(e.match(epsRegex)){
            eSplitNum = e.match(epsRegex);
            eLetter = eSplitNum[1].match(/s/i) ? 'S' : 'E';
            eFirstNum = eLetter + eSplitNum[2].padStart(2,'0');
            return eFirstNum;
        }
        return '';
    });
    selEpsInp = [...new Set(selEpsInp.concat(selEpsInpRanges))].sort().slice(1);
    if(selEpsInp.length>1){
        isBatch = true;
    }
    // parse list
    epsList.each(function(i1){
        let i2 = isSimulcast ? epsCount - i1 - 1 : i1;
        isSp = false;
        let epTitle = epsList.eq(i2).find('crunchyroll\\:episodeTitle').text();
        let epNum   = epsList.eq(i2).find('crunchyroll\\:episodeNumber').text();
        let airDate = new Date(epsList.eq(i2).find('crunchyroll\\:premiumPubDate').text());
        let airFree = new Date(epsList.eq(i2).find('crunchyroll\\:freePubDate').text());
        let subsArr = epsList.eq(i2).find('crunchyroll\\:subtitleLanguages').text();
        let dateNow = Date.now() + 1;
        if(!epNum.match(/^(\d+)$/)){
            isSp = true;
            spCount++;
            epNum = spCount.toString();
        }
        let epStr = ( isSp ? 'S' : 'E' ) + ( epNum.padStart(2,'0') );
        let mediaId = epsList.eq(i2).find('crunchyroll\\:mediaId').text();
        let selMark = '';
        if(selEpsInp.includes(epStr) && dateNow > airDate){
            selEpsArr.push({
                m: mediaId,
                t: vMainTitle,
                te: epTitle,
                e: epStr,
            });
            selMark = ' (selected)';
        }
        console.log(`  [${epStr}|${mediaId}] ${epTitle}${selMark}`);
        let dateStrPrem = shlp.dateString(airDate)
            + ( dateNow < airDate ? ` (in ${shlp.formatTime((airDate-dateNow)/1000)})` : '');
        let dateStrFree = shlp.dateString(airFree)
            + ( dateNow < airFree ? ` (in ${shlp.formatTime((airFree-dateNow)/1000)})` : '');
        console.log(`   - PremPubDate: ${dateStrPrem}`);
        console.log(`   - FreePubDate: ${dateStrFree}`);
        if(subsArr){
            console.log(`   - Subtitles: ${parseSubsString(subsArr)}`);
        }
    });
    console.log(`\n[INFO] Total videos: ${epsCount}\n`);
    if(selEpsArr.length > 0){
        for(let sm=0;sm<selEpsArr.length;sm++){
            await getMedia(selEpsArr[sm]);
        }
    }
}

function parseSubsString(subs){
    subs = subs.split(',');
    let subsStr = '';
    for(let lid=0;lid<subs.length;lid++){
        if ( !langCodes[subs[lid]] ) {
            console.log(`[ERROR] Language code for "${subs[lid]}" don't found.`);
        }
        else{
            subsStr += langCodes[subs[lid]][1] + (lid+1<subs.length?', ':'');
        }
    }
    return subsStr;
}

async function getMedia(mMeta){
    
    console.log(`Requesting: [${mMeta.m}] ${mMeta.t} - ${mMeta.e} - ${mMeta.te}`);
    audDubE = '';
    if(audDubT == '' && mMeta.te.match(dubRegex)){
        audDubE = dubLangs[mMeta.te.match(dubRegex)[1]];
        console.log(`[INFO] audio language code detected, setted to ${audDubE} for this episode`);
    }
    const mediaPage = await getData(`${api.media_page}${mMeta.m}`,{useProxy:true});
    if(!mediaPage.ok){ return; }
    
    let redirs   = mediaPage.res.response.redirectUrls;
    let msgItems = mediaPage.res.body.match(/Page.messaging_box_controller.addItems\((.*)\);/);
    if(msgItems){
        msgItems =  JSON.parse(msgItems[1]);
        let msgItemsArr = [];
        console.log('[INFO] PAGE MSGs:');
        for(let m of msgItems){
            msgItemsArr.push(`  [${m.type.toUpperCase()}] ${m.message_body}`);
        }
        msgItemsArr = [...new Set(msgItemsArr)];
        console.log(msgItemsArr.join('\n'));
    }
    if(redirs && redirs[redirs.length-1] == `${domain}/`){
        console.log('[ERROR] Sorry, this video is not available in your region due to licensing restrictions.\n');
        return;
    }
    
    let mediaData = mediaPage.res.body.match(/vilos.config.media = \{(.*)\};/);
    if(!mediaData && !argv.oldsubs){
        console.log('[ERROR] CAN\'T FETCH VIDEO INFO / PREMIUM LOCKED FOR YOUR REGION!');
        return;
    }
    else if(!mediaData){
        // Need for getting oldsubs for premium locked
    }
    else{
        mediaData = mediaData[1];
        mediaData = JSON.parse(`{${mediaData}}`);
        if(argv.debug){
            console.log('[debug]',mediaData);
        }
    }
    
    let epNum = mMeta.e;
    let metaEpNum = mediaData ? mediaData.metadata.episode_number : epNum.replace(/^E/,'');
    if(metaEpNum != '' && metaEpNum !== null){
        epNum = metaEpNum.match(/^\d+$/) ? metaEpNum.padStart(argv.el,'0') : metaEpNum;
    }
    
    fnTitle = argv.t ? argv.t : mMeta.t;
    fnEpNum = !isBatch && argv.ep ? argv.ep : epNum;
    fnSuffix = argv.suffix.replace('SIZEp',argv.q);
    fnOutput = fnOutputGen();
    
    let streams    = mediaData ? mediaData.streams : [],
        streamKey  = '';
    let isClip     = false,
        hlsStream  = '',
        getOldSubs = false;
    
    if(argv.oldstreams){
        let videoSrcStr = mediaPage.res.body.match(/<link rel="video_src" href="(.*)" \/>/);
        if(videoSrcStr){
            isClip = true;
            let parseCfg    = new URL(videoSrcStr[1]).searchParams;
            let parseCfgUrl = parseCfg.get('config_url') + '&current_page=' + domain;
            let streamData = await getData(parseCfgUrl,{useProxy:(argv.ssp?false:true)});
            if(streamData.ok){
                let videoDataBody = streamData.res.body.replace(/\n/g,'').replace(/ +/g,' ');
                let xmlMediaId    = videoDataBody.match(/<media_id>(\d+)<\/media_id>/);
                let xmlFileUrl    = videoDataBody.match(/<file>(.*)<\/file>/);
                let xmlError      = videoDataBody.match(/<error>(.*)<\/error>/);
                let countdown     = videoDataBody.match(/<countdown_seconds>(\d+)<\/countdown_seconds>/);
                if(countdown && countdown[1] && countdown[1] > 0){
                    console.log('[INFO] Episode not aired yet!');
                    return;
                }
                if(xmlMediaId && xmlMediaId[1] && xmlMediaId[1] != mMeta.m){
                    mMeta.m = xmlMediaId[1];
                }
                if(xmlFileUrl && xmlFileUrl[1]){
                    streamKey = 'api_hls';
                    hlsStream = xmlFileUrl[1].replace(/&amp;/g,'&');
                    console.log('[INFO] Full raw stream found!');
                }
                else if(xmlError && xmlError[1]){
                    isClip = false;
                    let xmlErrorData = xmlError[1].trim().match(/<code>(\d+)<\/code>(.*)<msg>(.*)<\/msg>/);
                    console.log(`[ERROR] CODE ${xmlErrorData[1]}: ${xmlErrorData[3]}`);
                }
            }
        }
    }
    else if(streams.length>0){
        let hlsStreams = {};
        let hlsStreamIndex = 1;
        // streams.reverse();
        for(let s in streams){
            let isHls = streams[s].format.match(/hls/)
                && !streams[s].format.match(/drm/) ? true : false;
            let checkParams = isHls && streams[s].hardsub_lang === null;
            if(streams[s].url.match(/clipFrom/)){
                isClip = true;
            }
            if(checkParams && !isClip){
                let sKeyStr = `${streams[s].format}/${streams[s].audio_lang}`;
                hlsStreams[sKeyStr] = streams[s].url;
                console.log(`[INFO] Full raw stream found! (${hlsStreamIndex}: ${sKeyStr})`);
                hlsStreamIndex++;
            }
        }
        let hlsStreamKeys     = Object.keys(hlsStreams);
        if(hlsStreamKeys.length>0){
            argv.kstream = argv.kstream > hlsStreamKeys.length ? 1 : argv.kstream;
            for(let k in hlsStreamKeys){
                k = parseInt(k);
                if(hlsStream == '' || argv.kstream == k + 1){
                    streamKey = hlsStreamKeys[k];
                    hlsStream = hlsStreams[streamKey];
                }
            }
        }
        else{
            hlsStream = '';
        }
    }
    else{
        console.log('[WARN] No streams found!');
    }
    
    // download stream
    if(hlsStream == '' && !isClip){
        console.log('[ERROR] No available full raw stream! Session expired?');
        argv.skipmux = true;
    }
    else if(hlsStream == '' && isClip){
        console.log('[ERROR] No available full raw stream! Only clip streams available.');
        argv.skipmux = true;
    }
    else{
        // get
        console.log('[INFO] Downloading video...');
        streamKey = streamKey != '' ? `(${streamKey})` : '';
        console.log('[INFO] Playlist URL:',(argv.ssu?hlsStream:''),(streamKey));
        let streamPlaylist = await getData(hlsStream,{useProxy:(argv.ssp?false:true)});
        if(!streamPlaylist.ok){
            console.log('[ERROR] CAN\'T FETCH VIDEO PLAYLISTS!');
            return;
        }
        // parse
        let plQualityLinkList = m3u8(streamPlaylist.res.body);
        // main servers
        let mainServersList = [
            'v.vrv.co',
            'a-vrv.akamaized.net'
        ];
        // variables
        let plServerList = [],
            plStreams    = {},
            plQualityStr = [],
            plMaxQuality = 240;
        // set variables
        for(let s of plQualityLinkList.playlists){
            let plResolution = s.attributes.RESOLUTION.height;
            let plResText    = `${plResolution}p`;
            plMaxQuality = plMaxQuality < plResolution ? plResolution : plMaxQuality;
            let plUrlDl  = s.uri;
            let plServer = plUrlDl.split('/')[2];
            if(!plServerList.includes(plServer)){
                plServerList.push(plServer);
            }
            if(!Object.keys(plStreams).includes(plServer)){
                plStreams[plServer] = {};
            }
            if(plStreams[plServer][plResText] && plStreams[plServer][plResText] != plUrlDl){
                console.log(`[WARN] Non duplicate url for ${plServer} detected, please report to developer!`);
            }
            else{
                plStreams[plServer][plResText] = plUrlDl;
            }
            // set plQualityStr
            let plBandwidth  = Math.round(s.attributes.BANDWIDTH/1024);
            if(plResolution<1000){
                plResolution = plResolution.toString().padStart(4,' ');
            }
            let qualityStrAdd   = `${plResolution}p (${plBandwidth}KiB/s)`;
            let qualityStrRegx  = new RegExp(qualityStrAdd.replace(/(:|\(|\)|\/)/g,'\\$1'),'m');
            let qualityStrMatch = !plQualityStr.join('\r\n').match(qualityStrRegx);
            if(qualityStrMatch){
                plQualityStr.push(qualityStrAdd);
            }
        }
        
        for(let s of mainServersList){
            if(plServerList.includes(s)){
                plServerList.splice(plServerList.indexOf(s),1);
                plServerList.unshift(s);
                break;
            }
        }
        
        argv.q = argv.q == 'max' ? `${plMaxQuality}p` : argv.q;
        
        let plSelectedServer = plServerList[argv.x-1];
        let plSelectedList   = plStreams[plSelectedServer];
        let videoUrl = argv.x < plServerList.length+1 && plSelectedList[argv.q] ? plSelectedList[argv.q] : '';
        
        plQualityStr.sort();
        console.log(`[INFO] Servers available:\n\t${plServerList.join('\n\t')}`);
        console.log(`[INFO] Available qualities:\n\t${plQualityStr.join('\n\t')}`);
        
        if(videoUrl != ''){
            console.log(`[INFO] Selected quality: ${argv.q} @ ${plSelectedServer}`);
            if(argv.ssu){
                console.log('[INFO] Stream URL:',videoUrl);
            }
            // filename
            fnSuffix = argv.suffix.replace('SIZEp',argv.q);
            fnOutput = fnOutputGen();
            console.log(`[INFO] Output filename: ${fnOutput}`);
            if(argv.skipdl){
                console.log('[INFO] Video download skipped!\n');
            }
            else{
                // request
                let chunkPage = await getData(videoUrl,{useProxy:(argv.ssp?false:true)});
                if(!chunkPage.ok){
                    console.log('[ERROR] CAN\'T FETCH VIDEO PLAYLIST!');
                    argv.skipmux = true;
                }
                else{
                    let chunkList = m3u8(chunkPage.res.body);
                    chunkList.baseUrl = videoUrl.split('/').slice(0, -1).join('/')+'/';
                    // proxy
                    let proxyHLS = false;
                    if(argv.proxy && !argv.ssp){
                        try{
                            proxyHLS = {};
                            proxyHLS.url = buildProxyUrl(argv.proxy,argv['proxy-auth']);
                        }
                        catch(e){
                            console.log(`\n[WARN] Not valid proxy URL${e.input?' ('+e.input+')':''}!`);
                            console.log('[WARN] Skiping...');
                            proxyHLS = false;
                        }
                    }
                    let tsFile = path.join(cfg.dir.content, fnOutput);
                    let resumeFile = `${tsFile}.ts.resume`;
                    let streamOffset = 0;
                    if(fs.existsSync(tsFile) && fs.existsSync(resumeFile)){
                        try{
                            let resume = JSON.parse(fs.readFileSync(resumeFile, 'utf-8'));
                            if(resume.total == chunkList.segments.length && resume.completed != resume.total){
                                streamOffset = resume.completed;
                            }
                        }
                        catch(e){
                            console.log(e);
                        }
                    }
                    
                    let streamdlParams = {
                        fn: `${tsFile}.ts`,
                        m3u8json: chunkList,
                        baseurl: chunkList.baseUrl,
                        pcount: argv.tsparts,
                        partsOffset: streamOffset,
                        proxy: ( proxyHLS ? proxyHLS : false),
                    };
                    let dldata = await new streamdl(streamdlParams).download();
                    if(!dldata.ok){
                        fs.writeFileSync(resumeFile, JSON.stringify(dldata.parts));
                        console.log(`[ERROR] ${dldata.error}\n`);
                        argv.skipmux = true;
                    }
                    else if(fs.existsSync(resumeFile) && dldata.ok){
                        fs.unlinkSync(resumeFile);
                    }
                }
            }
        }
        else if(argv.x > plServerList.length){
            console.log('[ERROR] Server not selected!\n');
            argv.skipmux = true;
        }
        else{
            console.log('[ERROR] Quality not selected!\n');
            argv.skipmux = true;
        }
    }
    
    // always get old subs
    getOldSubs = argv.oldsubs;
    
    // download subs
    sxList = [];
    if(!argv.skipsubs || argv.dlsubs != 'none'){
        console.log('[INFO] Downloading subtitles...');
        if(!getOldSubs && mediaData.subtitles.length < 1){
            console.log('[WARN] Can\'t find urls for subtitles! If you downloading subs version, try use oldsubs cli option');
        }
        if(getOldSubs){
            let mediaIdSubs = mMeta.m;
            console.log('[INFO] Trying get subtitles in old format...');
            if(hlsStream == '' && !argv.oldstreams){
                let reqParams = new URLSearchParams({
                    req:          'RpcApiVideoPlayer_GetStandardConfig',
                    media_id:      mMeta.m,
                    video_format:  106,
                    video_quality: 61,
                    aff:           'crunchyroll-website',
                    current_page:  domain
                });
                let streamData = await getData(`${domain}/xml/?${reqParams.toString()}`,{useProxy:true});
                if(!streamData.ok){
                    console.log(streamData);
                    mediaIdSubs = 0;
                }
                else{
                    mediaIdSubs = streamData.res.body.match(/<media_id>(\d+)<\/media_id>/);
                    mediaIdSubs = mediaIdSubs[1];
                }
            }
            mediaIdSubs = parseInt(mediaIdSubs);
            if(mediaIdSubs>0){
                let subsListApi = await getData(`${api.subs_list}${mediaIdSubs}`);
                if(subsListApi.ok){
                    // parse list
                    let subsListXml = xhtml2js({
                        src: subsListApi.res.body,
                        el: 'subtitles',
                        isXml: true,
                        parse: true,
                    }).data.children;
                    // subsDecrypt
                    for(let s=0;s<subsListXml.length;s++){
                        if(subsListXml[s].tagName=='subtitle'){
                            let subsId = subsListXml[s].attribs.id;
                            let subsTt = subsListXml[s].attribs.title;
                            let subsXmlApi = await getData(`${api.subs_file}${subsId}`,{useProxy:true});
                            if(subsXmlApi.ok){
                                let subXml      = crunchySubs.decrypt(subsListXml[s].attribs.id,subsXmlApi.res.body);
                                if(subXml.ok){
                                    let subsParsed  = crunchySubs.parse(subsListXml[s].attribs,subXml.data);
                                    let sLang = subsParsed.langCode.match(/(\w{2}) - (\w{2})/);
                                    sLang = `${sLang[1]}${sLang[2].toUpperCase()}`;
                                    subsParsed.langStr  = langCodes[subsParsed.langCode][1];
                                    subsParsed.langCode = langCodes[subsParsed.langCode][0];
                                    let subsExtFile = [
                                        subsParsed.id,
                                        subsParsed.langCode,
                                        subsParsed.langStr
                                    ].join(' ');
                                    subsParsed.file = `${fnOutput}.${subsExtFile}.ass`;
                                    if(argv.dlsubs == 'all' || argv.dlsubs == sLang){
                                        fs.writeFileSync(path.join(cfg.dir.content, subsParsed.file),subsParsed.src);
                                        delete subsParsed.src;
                                        console.log(`[INFO] Downloaded: ${subsParsed.file}`);
                                        sxList.push(subsParsed);
                                    }
                                    else{
                                        console.log(`[INFO] Download skipped: ${subsParsed.file}`);
                                    }
                                }
                            }
                            else{
                                console.log(`[WARN] Failed to download subtitles #${subsId} ${subsTt}`);
                            }
                        }
                    }
                    if(sxList.length<1){
                        console.log('[WARN] Subs not found!');
                    }
                }
                else{
                    console.log('[WARN] Failed to get subtitles list using old api!');
                }
            }
            else{
                console.log('[ERROR] Can\'t get video id for subtitles list!');
            }
        }
        else if(mediaData.subtitles.length > 0){
            for(let s of mediaData.subtitles ){
                let subsAssApi = await getData(s.url,{useProxy:(argv.ssp?false:true)});
                let subsParsed = {};
                subsParsed.id = s.url.match(/_(\d+)\.txt\?/)[1];
                subsParsed.fonts = fontsData.assFonts(subsAssApi.res.body);
                subsParsed.langCode = s.language.match(/(\w{2})(\w{2})/);
                subsParsed.langCode = `${subsParsed.langCode[1]} - ${subsParsed.langCode[2]}`.toLowerCase();
                subsParsed.langStr  = langCodes[subsParsed.langCode][1];
                subsParsed.langCode = langCodes[subsParsed.langCode][0];
                let subsExtFile = [
                    subsParsed.id,
                    subsParsed.langCode,
                    subsParsed.langStr
                ].join(' ');
                subsParsed.file = `${fnOutput}.${subsExtFile}.ass`;
                if(argv.dlsubs == 'all' || argv.dlsubs == s.language){
                    if(subsAssApi.ok){
                        subsParsed.title = subsAssApi.res.body.split('\r\n')[1].replace(/^Title: /,'');
                        fs.writeFileSync(path.join(cfg.dir.content, subsParsed.file), subsAssApi.res.body);
                        console.log(`[INFO] Downloaded: ${subsParsed.file}`);
                        sxList.push(subsParsed);
                    }
                    else{
                        console.log(`[WARN] Downloaded failed: ${subsParsed.file}`);
                    }
                }
                else{
                    console.log(`[INFO] Downloaded skipped: ${subsParsed.file}`);
                }
            }
        }
    }
    
    // go to muxing
    if(argv.skipmux){
        console.log();
        return;
    }
    await muxStreams();
    
}

async function muxStreams(){
    // muxing video path prefix
    let muxFile = path.join(cfg.dir.content, fnOutput);
    // skip if no ts
    if(!fs.existsSync(`${muxFile}.ts`) || fs.existsSync(`${muxFile}.ts`) && fs.statSync(`${muxFile}.ts`).size == 0){
        console.log('[INFO] TS file not found, skip muxing video...\n');
        return;
    }
    // fix variables
    let audioDub = audDubT != '' ? audDubT:
        (audDubE != '' ? audDubE : argv.dub);
    const addSubs = argv.mks && sxList.length > 0 ? true : false;
    // ftag
    argv.ftag = argv.ftag ? argv.ftag : argv.a;
    argv.ftag = shlp.cleanupFilename(argv.ftag);
    // check exec path
    let mkvmergebinfile = await lookpath(path.join(cfg.bin.mkvmerge));
    let ffmpegbinfile   = await lookpath(path.join(cfg.bin.ffmpeg));
    // check exec
    if( !argv.mp4 && !mkvmergebinfile ){
        console.log('[WARN] MKVMerge not found, skip using this...');
        cfg.bin.mkvmerge = false;
    }
    if( !mkvmergebinfile && !ffmpegbinfile || argv.mp4 && !ffmpegbinfile ){
        console.log('[WARN] FFmpeg not found, skip using this...');
        cfg.bin.ffmpeg = false;
    }
    // collect fonts info
    let fontsList = [];
    for(let s of sxList){
        fontsList = fontsList.concat(s.fonts);
    }
    fontsList = [...new Set(fontsList)];
    if(fontsList.length>0){
        console.log(`\n[INFO] Required fonts (${fontsList.length}):`,fontsList.join(', '));
    }
    // mux
    if(!argv.mp4 && cfg.bin.mkvmerge){
        let mkvmux  = [];
        // defaults
        mkvmux.push('--output',`${muxFile}.mkv`);
        mkvmux.push('--no-date','--disable-track-statistics-tags','--engage','no_variable_data');
        // video
        mkvmux.push('--track-name',`0:[${argv.ftag}]`);
        mkvmux.push('--language',`1:${audioDub}`);
        mkvmux.push('--video-tracks','0','--audio-tracks','1');
        mkvmux.push('--no-subtitles','--no-attachments');
        mkvmux.push(`${muxFile}.ts`);
        // subtitles
        if(addSubs){
            for(let t of sxList){
                let subsFile = path.join(cfg.dir.content, t.file);
                mkvmux.push('--track-name',`0:${t.langStr} / ${t.title}`);
                mkvmux.push('--language',`0:${t.langCode}`);
                mkvmux.push(`${subsFile}`);
            }
        }
        if(addSubs && fontsList.length>0){
            for(let f of fontsList){
                let fontFile = fontsData.fonts[f];
                if(fontFile){
                    let fontLoc  = path.join(cfg.dir.fonts, fontFile);
                    if(fs.existsSync(fontLoc) && fs.statSync(fontLoc).size != 0){
                        mkvmux.push('--attachment-name',fontFile);
                        mkvmux.push('--attach-file',fontLoc);
                    }
                }
            }
        }
        fs.writeFileSync(`${muxFile}.json`,JSON.stringify(mkvmux,null,'  '));
        shlp.exec('mkvmerge',`"${cfg.bin.mkvmerge}"`,`@"${muxFile}.json"`);
        fs.unlinkSync(`${muxFile}.json`);
    }
    else if(cfg.bin.ffmpeg){
        let ffmux  = [], ffext = !argv.mp4 ? 'mkv' : 'mp4';
        let ffsubs = addSubs ? true : false;
        let ffmap = [], ffmeta = [];
        ffmux.push('-i',`"${muxFile}.ts"`);
        if(ffsubs){
            let ti = 0;
            for(let t of sxList){
                let subsFile = path.join(cfg.dir.content, t.file);
                ffmux.push('-i',`"${subsFile}"`);
                ffmap.push(`-map ${ti+1}`,'-c:s',(!argv.mp4?'copy':'mov_text'));
                ffmeta.push(`-metadata:s:s:${ti}`,`language=${t.langCode}`);
                ffmeta.push(`-metadata:s:s:${ti}`,`title="${t.langStr} / ${t.title}"`);
                ti++;
            }
        }
        ffmux.push('-map 0:0 -c:v copy');
        ffmux.push('-map 0:1 -c:a copy');
        ffmux = ffmux.concat(ffmap);
        if(ffsubs && ffext == 'mkv' && fontsList.length>0){
            let attIndex = 0;
            for(let f of fontsList){
                let fontFile = fontsData.fonts[f];
                if(fontFile){
                    let fontLoc  = path.join(cfg.dir.fonts, fontFile);
                    let fontMime = fontsData.fontMime(fontFile);
                    if(fs.existsSync(fontLoc) && fs.statSync(fontLoc).size != 0){
                        ffmux.push('-attach',`"${fontLoc}"`);
                        ffmeta.push(`-metadata:s:t:${attIndex}`,`mimetype="${fontMime}"`);
                        ffmeta.push(`-metadata:s:t:${attIndex}`,`filename="${fontFile}"`);
                        attIndex++;
                    }
                }
            }
        }
        ffmux.push('-metadata','encoding_tool="no_variable_data"');
        ffmux.push('-metadata:s:v:0',`title="[${argv.ftag.replace(/"/g,'\'')}]"`);
        ffmux.push('-metadata:s:a:0',`language=${audioDub}`);
        ffmux = ffmux.concat(ffmeta);
        ffmux.push(`"${muxFile}.${ffext}"`);
        try{ shlp.exec('ffmpeg',`"${cfg.bin.ffmpeg}"`,ffmux.join(' ')); }catch(e){}
    }
    else{
        console.log('\n[INFO] Done!\n');
        return;
    }
    // cleanup
    if(argv.notrashfolder && argv.nocleanup){
        // don't move or delete temp files
    }
    else if(argv.nocleanup){
        let toTrashTS = path.join(cfg.dir.trash,`${fnOutput}.ts`);
        fs.renameSync(`${muxFile}.ts`, toTrashTS);
        if(addSubs){
            for(let t of sxList){
                let subsFile = path.join(cfg.dir.content, t.file);
                let subsTrash = path.join(cfg.dir.trash, t.file);
                fs.renameSync(subsFile, subsTrash);
            }
        }
    }
    else{
        fs.unlinkSync(`${muxFile}.ts`);
        if(addSubs){
            for(let t of sxList){
                let subsFile = path.join(cfg.dir.content, t.file);
                fs.unlinkSync(subsFile);
            }
        }
    }
    // done
    console.log('\n[INFO] Done!\n');
}

function fnOutputGen(){
    const fnPrepOutput = argv.filename.toString()
        .replace('{rel_group}', argv.a)
        .replace('{title}', fnTitle)
        .replace('{ep_num}', fnEpNum)
        .replace('{suffix}', fnSuffix);
    return shlp.cleanupFilename(fnPrepOutput);
}

// get url
async function getData(durl, params){
    params = params || {};
    // options
    let options = {
        method: params.method ? params.method : 'GET',
        headers: {},
        url: durl
    };
    // set binary
    if(params.binary == true){
        options.responseType = 'buffer';
    }
    // set headers
    if(params.headers){
        options.headers = params.headers;
    }
    // set additional headers
    if(options.method == 'POST'){
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    // set body
    if(params.body){
        options.body = params.body;
    }
    // proxy
    if(params.useProxy && argv.proxy){
        try{
            const agent = require('proxy-agent');
            let proxyUrl = buildProxyUrl(argv.proxy,argv['proxy-auth']);
            options.agent = new agent(proxyUrl);
            options.timeout = 10000;
        }
        catch(e){
            console.log(`\n[WARN] Not valid proxy URL${e.input?' ('+e.input+')':''}!`);
            console.log('[WARN] Skiping...');
            argv.proxy = false;
        }
    }
    // if auth
    let cookie = [];
    if(checkCookieVal(session.c_userid) && checkCookieVal(session.c_userkey)){
        cookie.push('c_userid', 'c_userkey');
    }
    if(checkSessId(session.session_id) && !argv.nosess){
        cookie.push('session_id');
    }
    if(!params.skipCookies){
        cookie.push('c_locale');
        options.headers.Cookie =
            shlp.cookie.make(Object.assign({c_locale:{value:'enUS'}},session),cookie);
    }
    if(argv.debug){
        console.log('[REQ]',options);
    }
    try {
        let res = await got(options);
        if(!params.skipCookies && res.headers['set-cookie']){
            setNewCookie(res.headers['set-cookie']);
        }
        return {
            ok: true,
            res,
        };
    }
    catch(error){
        if(error.response && error.response.statusCode && error.response.statusMessage){
            console.log(`[ERROR] ${error.name} ${error.response.statusCode}: ${error.response.statusMessage}`);
        }
        else{
            console.log(`[ERROR] ${error.name}: ${error.code||error.message}`);
        }
        return {
            ok: false,
            error,
        };
    }
}
function setNewCookie(setCookie, isAuth){
    let cookieUpdated = [];
    setCookie = shlp.cookie.parse(setCookie);
    if(isAuth || setCookie.c_userid){
        session.c_userid = setCookie.c_userid;
        cookieUpdated.push('c_userid');
    }
    if(isAuth || setCookie.c_userkey){
        session.c_userkey = setCookie.c_userkey;
        cookieUpdated.push('c_userkey');
    }
    if(isAuth || argv.nosess && setCookie.session_id || setCookie.session_id && !checkSessId(session.session_id)){
        const sessionExp = 60*60;
        session.session_id            = setCookie.session_id;
        session.session_id.expires    = new Date(Date.now() + sessionExp*1000);
        session.session_id['Max-Age'] = sessionExp.toString();
        cookieUpdated.push('session_id');
    }
    if(cookieUpdated.length > 0){
        session = yaml.stringify(session);
        if(argv.debug){
            console.log('[SAVE FILE]',path.join(sessCfgFile));
        }
        fs.writeFileSync(sessCfgFile, session);
        session = yaml.parse(session);
        console.log(`[INFO] Cookies were updated! (${cookieUpdated.join(', ')})\n`);
    }
}
function checkCookieVal(chcookie){
    return     chcookie
            && chcookie.toString()   == '[object Object]'
            && typeof chcookie.value == 'string'
        ?  true : false;
}
function checkSessId(session_id){
    return     session_id
            && session_id.toString()     == '[object Object]'
            && typeof session_id.expires == 'string'
            && Date.now() < new Date(session_id.expires).getTime()
            && typeof session_id.value   == 'string'
        ?  true : false;
}
function buildProxyUrl(proxyBaseUrl,proxyAuth){
    let proxyCfg = new URL(proxyBaseUrl);
    if(typeof proxyCfg.hostname != 'string' || typeof proxyCfg.port != 'string'){
        throw new Error();
    }
    if(proxyAuth && typeof proxyAuth == 'string' && proxyAuth.match(':')){
        proxyCfg.auth = proxyAuth;
    }
    return url.format({
        protocol: proxyCfg.protocol,
        slashes: true,
        auth: proxyCfg.auth,
        hostname: proxyCfg.hostname,
        port: proxyCfg.port,
    });
}
