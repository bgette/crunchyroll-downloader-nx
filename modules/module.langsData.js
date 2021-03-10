// available langs
const langCodes = {
    'enUS': { code: 'eng', tag: 'en',     name: 'English (US)',             },
    'esLA': { code: 'spa', tag: 'es-419', name: 'Español (América Latina)', },
    'esES': { code: 'spa', tag: 'es',     name: 'Español (España)',         },
    'ptBR': { code: 'por', tag: 'pt-BR',  name: 'Português (Brasil)',       },
    'ptPT': { code: 'por', tag: 'pt',     name: 'Português (Portugal)',     },
    'frFR': { code: 'fra', tag: 'fr',     name: 'Français (France)',        },
    'deDE': { code: 'deu', tag: 'de',     name: 'Deutsch',                  },
    'arME': { code: 'ara', tag: 'ar',     name: 'العربية',                  },
    'itIT': { code: 'ita', tag: 'it',     name: 'Italiano',                 },
    'ruRU': { code: 'rus', tag: 'ru',     name: 'Русский',                  },
    'trTR': { code: 'tur', tag: 'tr',     name: 'Türkçe',                   },
    'jaJP': { code: 'jpn', tag: 'ja',     name: '日本語',                   },
};

// add en lang names and local
(() =>{
    const getLangName = new Intl.DisplayNames(['en'], {type: 'language'});
    for(let lc of Object.keys(langCodes)){
        langCodes[lc].lang = getLangName.of(langCodes[lc].code);
        langCodes[lc].local = getLangName.of(langCodes[lc].tag);
    }
})();

// construct lang filter
const subsLangsFilter = (() => {
    const subsParam = ['all', 'none'];
    return [...subsParam, ...Object.keys(langCodes)];
})();

// construct iso langs const
const isoLangs = (() => {
    const isoDb = [];
    for(const lk of Object.keys(langCodes)){
        isoDb.push(langCodes[lk].code);
    }
    return [...new Set(isoDb)];
})();

// construct dub langs const
const dubLangs = (() => {
    const dubDb = {};
    for(const l of Object.keys(langCodes)){
        const lData = langCodes[l];
        if(!Object.keys(dubDb).includes(lData.lang)){
            dubDb[lData.lang] = lData.code;
        }
    }
    return dubDb;
})();

// dub regex
const dubRegExpStr =
    `\\((${Object.keys(dubLangs).join('|')})(?: Dub)?\\)$`;
const dubRegExp = new RegExp(dubRegExpStr);

// rss subs lang parser
const parseRssSubsString = (subs) => {
    subs = subs.split(',').map((s) => {
        let sLang = s.match(/(\w{2}) - (\w{2})/);
        if(sLang){
            sLang = `${sLang[1]}${sLang[2].toUpperCase()}`;
            return sLang;
        }
        else{
            return 'und';
        }
    });
    return subs.join(', ');
};

const sortSubtitles = (data) => {
    const idx = {};
    for(const l of Object.keys(langCodes)){
        idx[l] = Object.keys(idx).length + 1;
    }
    data.sort((a, b) => {
        const ia = idx[a.language] ? idx[a.language] : 50;
        const ib = idx[b.language] ? idx[b.language] : 50;
        return ia - ib;
    });
    return data;
};

const subsFile = (fnOutput, seq, lc) => {
    return `${fnOutput}.${(parseInt(seq)+1).toString().padStart(2, '0')} ${lc.code} ${lc.local}.ass`;
};

const subsStr = (data) => {
    const subs = [];
    for(let s of data){
        subs.push(s.langExtCode);
    }
    console.log('[INFO] Subtitles:', subs.join(', '));
};

// output
module.exports = {
    langCodes,
    subsLangsFilter,
    isoLangs,
    dubLangs,
    dubRegExp,
    parseRssSubsString,
    sortSubtitles,
    subsFile,
    subsStr,
};
