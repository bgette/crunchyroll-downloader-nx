const crypto = require('crypto');
const zlib = require('zlib');
const shlp = require('sei-helper');
const xhtml2js = shlp.xhtml2js;

// decrypt
function generateKeyAux(count, modulo, start){
    // Generate String: $&).6CXzPHw=2N_+isZK
    let res = start;
    for (let i of Array(count).keys()){
        res.push(res[i] + res[i+1]);
    }
    res.splice(0, 2);
    res = res.map(x => x % modulo + 33);
    res = String.fromCharCode(...res);
    return res;
}
function generateKey(id) {
    const hashMagicConst = Math.floor(Math.sqrt(6.9) * Math.pow(2, 25)); // 0x0540E9FA
    const hashMagicBaseNum = hashMagicConst ^ id;
    const hashMagicNumber = hashMagicBaseNum ^ hashMagicBaseNum >> 3 ^ hashMagicBaseNum * 32;
    const finalHashMagicNumber = hashMagicNumber < 0 ? hashMagicNumber + 0x100000000 : hashMagicNumber;
    const keyAux  = generateKeyAux(20, 97, [1, 2]);
    const keyText = keyAux + finalHashMagicNumber;
    const keyHash = crypto.createHash('sha1').update(keyText, 'utf8').digest();
    const finalKey = Buffer.alloc(32);
    keyHash.copy(finalKey);
    return finalKey;
}
function doDecrypt(_id, _iv, _data) {
    let key  = generateKey(_id);
    let iv   = Buffer.from(_iv, 'base64');
    let dec  = crypto.createDecipheriv('aes-256-cbc', key, iv);
    dec.setAutoPadding();
    let decrypted = dec.update(_data, 'base64');
    decrypted = Buffer.concat([decrypted, dec.final()]);
    try{
        const zlibData = zlib.unzipSync(decrypted).toString('utf8');
        return { ok: true, data: zlibData };
    }
    catch(err){
        return  { ok: false, data: err };
    }
}
function decrypt(id, data) {
    let err = data.match(/<error>(.*)<\/error>/);
    if (err) {
        return { ok: false, data: err };
    }
    let res = data.match(/id='(.*)'.*<iv>(.*)<\/iv>.*<data>(.*)<\/data>/);
    if (!res) {
        return { ok: false, data: data };
    }
    id = id ? id : res[1];
    return doDecrypt(id, res[2], res[3]);
}

// parse
function parse(meta, src){
    // pre default
    let subsMeta = {};
    // parse xml
    let xml = xhtml2js({ src, el: 'subtitle_script', isXml: true }).$;
    // meta update
    subsMeta.title    = xml[0].attribs.title;
    subsMeta.language = xml[0].attribs.lang_code;
    // collect header data
    let headerData = {
        title: subsMeta.title,
        user:  meta.user,
        resx:  xml[0].attribs.play_res_x,
        resy:  xml[0].attribs.play_res_y,
        wrap:  xml[0].attribs.wrap_style,
    };
    // generate src file
    subsMeta.src  = getASSHeader(headerData);
    subsMeta.src += getASSStyles(xml.find('styles'));
    subsMeta.src += getASSDialogs(xml.find('events'));
    // save subtitle
    return subsMeta;
}
function getASSHeader(data){
    let src = [
        '[Script Info]',
        `Title: ${data.title}`,
        `Original Script: ${data.user}  [http://www.crunchyroll.com/user/${data.user}]`,
        'Original Translation: ',
        'Original Editing: ',
        'Original Timing: ',
        'Synch Point: ',
        'Script Updated By: ',
        'Update Details: ',
        'ScriptType: v4.00+',
        'Collisions: Normal',
        `PlayResX: ${data.resx}`,
        `PlayResY: ${data.resy}`,
        'Timer: 0.0000',
        `WrapStyle: ${data.wrap}`,
        ''
    ];
    return src.join('\r\n');
}
function getASSStyles(data){
    let src = [
        '',
        '[V4+ Styles]',
        ( 'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,'
        + 'Bold,Italic,Underline,Strikeout,ScaleX,ScaleY,Spacing,Angle,'
        + 'BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding' )
    ];
    let styleList = data.find('style');
    for(let i=0; i < styleList.length; i++){
        let s = styleList[i].attribs;
        let x = 'Style: ' + [
            s.name,
            s.font_name,
            s.font_size,
            s.primary_colour,
            s.secondary_colour,
            s.outline_colour,
            s.back_colour,
            (parseInt(s.bold)*-1),
            (parseInt(s.italic)*-1),
            (parseInt(s.underline)*-1),
            (parseInt(s.strikeout)*-1),
            s.scale_x,
            s.scale_y,
            s.spacing,
            s.angle,
            s.border_style,
            s.outline,
            s.shadow,
            s.alignment,
            s.margin_l,
            s.margin_r,
            s.margin_v,
            s.encoding
        ].join(',');
        src.push(x);
    }
    src.push('');
    return src.join('\r\n');
}
function getASSDialogs(data){
    let src = [
        '',
        '[Events]',
        'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
    ];
    let eventList = data.find('event');
    for(let i=0;i<eventList.length;i++){
        let e = eventList[i].attribs;
        let x = 'Dialogue: ' + [
            '0',
            e.start,
            e.end,
            e.style,
            e.name,
            e.margin_l,
            e.margin_r,
            e.margin_v,
            e.effect,
            e.text
        ].join(',');
        src.push(x);
    }
    src.push('');
    return src.join('\r\n');
}

module.exports = { decrypt, parse };
