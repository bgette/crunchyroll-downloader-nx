// avaible langs
const langCodes = {
    'en - us': { code: 'eng', lang: 'English',    local: 'English (US)'             },
    'en - gb': { code: 'eng', lang: 'English',    local: 'English (UK)'             },
    'es - la': { code: 'spa', lang: 'Spanish',    local: 'Spanish (Latin American)' },
    'es - es': { code: 'spa', lang: 'Spanish',                                      },
    'fr - fr': { code: 'fre', lang: 'French',                                       },
    'pt - br': { code: 'por', lang: 'Portuguese', local: 'Portuguese (Brazilian)'   },
    'pt - pt': { code: 'por', lang: 'Portuguese',                                   },
    'ar - me': { code: 'ara', lang: 'Arabic',                                       }, // Arabic (Mesopotamian)?
    'it - it': { code: 'ita', lang: 'Italian',                                      },
    'de - de': { code: 'ger', lang: 'German',                                       },
    'ru - ru': { code: 'rus', lang: 'Russian',                                      },
    'tr - tr': { code: 'tur', lang: 'Turkish',                                      },
    'jp - jp': { code: 'jpn', lang: 'Japanese',                                     },
    '':        { code: 'unk', lang: 'Unknown',                                      },
};

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

// construnct iso langs const
const isoLangs = (() => {
    const isoDb = [];
    for(const lk of Object.keys(dubLangs)){
        isoDb.push(dubLangs[lk]);
    }
    return isoDb;
})();

// construnct lang filter
const subsLangsFilter = (() => {
    const subsLangs = ['all', 'none'];
    for(let lc of Object.keys(langCodes)){
        lc = lc.match(/(\w{2}) - (\w{2})/);
        if(lc){
            lc = `${lc[1]}${lc[2].toUpperCase()}`;
            subsLangs.push(lc);
        }
    }
    return subsLangs;
})();

const codeToData = (extCode) => {
    const mLang = extCode.match(/(\w{2})(\w{2})/);
    const lowCode = `${mLang[1]} - ${mLang[2]}`.toLowerCase();
    const lData = langCodes[lowCode];
    lData.local = lData.local ? lData.local : lData.lang;
    lData.extCode = extCode;
    lData.lowCode = lowCode;
    return lData;
};

const subsLang2file = (data) => {
    return `${data.file}.${data.id} ${data.code} ${data.local}.ass`;
};

const sortSubtitles = (data) => {
    const subsIndex = {};
    for(const l of Object.keys(langCodes)){
        if(l == ''){ continue; }
        subsIndex[l] = Object.keys(subsIndex).length;
    }
    data.sort((a, b) => {
        const ia = subsIndex[a.langLowCode];
        const ib = subsIndex[b.langLowCode]
        return ia - ib;
    });
    subsStr(data);
    return data;
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
    dubLangs,
    isoLangs,
    subsLangsFilter,
    codeToData,
    subsLang2file,
    sortSubtitles,
};
