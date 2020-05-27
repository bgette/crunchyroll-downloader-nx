// avaible langs
const langCodes = {
    'enUS': { code: 'eng', lang: 'English',    local: 'English (US)'             },
    'enGB': { code: 'eng', lang: 'English',    local: 'English (UK)'             },
    'esLA': { code: 'spa', lang: 'Spanish',    local: 'Spanish (Latin American)' },
    'esES': { code: 'spa', lang: 'Spanish',                                      },
    'frFR': { code: 'fre', lang: 'French',                                       },
    'ptBR': { code: 'por', lang: 'Portuguese', local: 'Portuguese (Brazilian)'   },
    'ptPT': { code: 'por', lang: 'Portuguese',                                   },
    'arME': { code: 'ara', lang: 'Arabic',                                       }, // Arabic (Mesopotamian)?
    'itIT': { code: 'ita', lang: 'Italian',                                      },
    'deDE': { code: 'ger', lang: 'German',                                       },
    'ruRU': { code: 'rus', lang: 'Russian',                                      },
    'trTR': { code: 'tur', lang: 'Turkish',                                      },
    'jaJP': { code: 'jpn', lang: 'Japanese',                                     },
};

// add local
(() =>{
    for(let lc of Object.keys(langCodes)){
        if(!langCodes[lc].local){
            langCodes[lc].local = langCodes[lc].lang;
        }
    }
})();

// construnct lang filter
const subsLangsFilter = (() => {
    const subsParam = ['all', 'none'];
    return [...subsParam, ...Object.keys(langCodes)];
})();

// construnct iso langs const
const isoLangs = (() => {
    const isoDb = [];
    for(const lk of Object.keys(langCodes)){
        isoDb.push(langCodes[lk].code);
    }
    return [...new Set(isoDb)];
})();

// construnct dub langs const
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
            return 'unk';
        }
    });
    return subs.join(', ');
}

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
}

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
