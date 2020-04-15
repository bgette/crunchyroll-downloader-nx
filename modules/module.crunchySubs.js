const crypto = require('crypto');
const zlib = require('zlib');
const shlp = require('sei-helper');
const xhtml2js = shlp.xhtml2js;

// decrypt
function createString(args) {
    let a = args[2];
    let b = args[3];
    let res = '';
    for (let i = 0; i < args[0]; i++) {
        b += a;
        a = b - a;
        res += String.fromCharCode(b % args[1] + 33);
    }
    return res;
}
function generateKey(mediaid) {
    let eq1 = Math.floor(Math.sqrt(6.9) * Math.pow(2, 25));
    let eq2 = (mediaid ^ eq1) ^ (mediaid ^ eq1) >> 3 ^ (eq1 ^ mediaid) * 32;
    if (eq2 < 0) {
        eq2 += 0x100000000;
    }
    let finalHash = crypto.createHash('sha1').update(createString([20, 97, 1, 2]) + eq2.toString(), 'utf8').digest();
    let res = Buffer.alloc(32);
    finalHash.copy(res);
    return res;
}
function doDecrypt(_id, _iv, _data) {
    let key  = generateKey(_id);
    let iv   = Buffer.from(_iv, 'base64');
    let dec  = crypto.createDecipheriv('aes-256-cbc', key, iv);
    dec.setAutoPadding();
    let decrypted = dec.update(_data, 'base64');
    decrypted = Buffer.concat([decrypted, dec.final()]);
    return zlib.unzipSync(decrypted).toString('utf8');
}
function decrypt(id, data) {
    let err = data.match(/<error>(.*)<\/error>/);
    if (err) {
        return { ok: false, data: `[ERROR] Unknown error, data:\n${err}` };
    }
    let res = data.match(/<iv>(.*)<\/iv>.*<data>(.*)<\/data>/);
    if (!res) {
        return { ok: false, data: `[ERROR] Unknown error, data:\n${data}` };
    }
    return { ok: true, data: doDecrypt(id, res[1], res[2]) };
}
// parse
function parse(meta, src){
    // pre default
    let subsMeta = {
        id: meta.id,
        // title: meta.title.replace(/^\[(.*)\] /,''),
        user: meta.user,
        isDefault: Boolean(parseInt(meta.default))
    };
    // parse xml
    let xml = xhtml2js({ src, el: 'subtitle_script', isXml: true }).$;
    // meta update
    subsMeta.title    = xml[0].attribs.title;
    let langCode      = xml[0].attribs.lang_code.match(/(\w{2})(\w{2})/);
    langCode          = `${langCode[1]} - ${langCode[2]}`.toLowerCase();
    subsMeta.langCode = langCode;
    subsMeta.date     = xml[0].attribs.created;
    // collect header data
    let headerData = {
        title: subsMeta.title,
        user: subsMeta.user,
        resx: xml[0].attribs.play_res_x,
        resy: xml[0].attribs.play_res_y,
        wrap:  xml[0].attribs.wrap_style
    };
    // get header data
    subsMeta.src   = getASSHeader(headerData);
    // get styles and fonts
    let stylesAndFonts = getASSStylesAndFonts(xml.find('styles'));
    subsMeta.fonts = stylesAndFonts.fonts;
    subsMeta.src  += stylesAndFonts.styles;
    // get dialogs
    subsMeta.src  += getASSDialogs(xml.find('events'));
    // save subtitle
    return subsMeta;
}
function getASSHeader(data){
    let src = [
        '\ufeff[Script Info]',
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
function getASSStylesAndFonts(data){
    let src = [
        '',
        '[V4+ Styles]',
        ( 'Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,'
        + 'Bold,Italic,Underline,Strikeout,ScaleX,ScaleY,Spacing,Angle,'
        + 'BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding' )
    ];
    let fontsList = [];
    let styleList = data.find('style');
    for(let i=0;i<styleList.length;i++){
        let s = styleList[i].attribs;
        fontsList.push(s.font_name);
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
    return {
        styles: src.join('\r\n'),
        fonts: [...new Set(fontsList)],
    };
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
