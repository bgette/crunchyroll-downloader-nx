// build-in
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

// req
const curlReq = async (url, options, cache) => {
    
    let curlOpt = [
        'curl',
        `"${url}"`,
    ];
    
    options = options || {};
    
    if(options.headers && Object.keys(options.headers).length > 0){
        for(let h of Object.keys(options.headers)){
            let hC = options.headers[h];
            curlOpt.push('-H', `"${h}: ${hC}"`);
        }
    }
    
    if(options.curlProxy){
        curlOpt.push('--proxy-insecure', '-x', `"${options.curlProxy}"`);
        if(options.curlProxyAuth && typeof options.curlProxyAuth == 'string' && options.curlProxyAuth.match(':')){
            curlOpt.push('-U', `"${options.curlProxyAuth}"`);
        }
    }
    
    const reqId = uuidv4();
    const headFile = path.join(cache, `/res-headers-${reqId}`);
    const bodyFile = path.join(cache, `/res-body-${reqId}`);
    const errFile = path.join(cache, `/res-err-${reqId}`);
    
    curlOpt.push('-D', `"${headFile}"`);
    curlOpt.push('-o', `"${bodyFile}"`);
    curlOpt.push('--stderr', `"${errFile}"`);
    curlOpt.push('-L', '-s', '-S');
    
    if(options.minVersion == 'TLSv1.3'){
        curlOpt.push('--tlsv1.3');
    }
    if(options.http2){
        curlOpt.push('--http2');
    }
    
    if(options.body){
        curlOpt.push('--data-urlencode', `"${options.body}"`);
    }
    
    curlOpt = curlOpt.join(' ');
    
    try{
        if(options.curlDebug){
            console.log(curlOpt);
        }
        child_process.execSync(curlOpt, { stdio: 'inherit', windowsHide: true });
    }
    catch(next){
        const errData = { name: 'RequestError', message: 'EACCES' };
        try{ 
            fs.unlinkSync(headFile);
        }
        catch(e){
            // ignore it...
        }
        try{
            errData.message = 
                fs.readFileSync(errFile, 'utf8')
                    .replace(/^curl: /, '');
            fs.unlinkSync(errFile);
        }
        catch(e){
            // ignore it...
        }
        throw errData;
    }
    
    const rawHeaders = fs.readFileSync(headFile, 'utf8');
    const rawBody    = fs.readFileSync(bodyFile);
    fs.unlinkSync(headFile);
    fs.unlinkSync(bodyFile);
    fs.unlinkSync(errFile);
    
    let res = {
        httpVersion: '',
        statusCode: '',
        statusMessage: '',
        rawHeaders: rawHeaders,
        headers: {},
        rawBody: rawBody,
        body: rawBody.toString(),
    };
    
    let headersCont = rawHeaders.replace(/\r/g, '').split('\n');
    
    for(let h of headersCont){
        if( h == '' ){ continue; }
        if(!h.match(':')){
            let statusRes = h.split(' ');
            res.httpVersion = statusRes[0].split('/')[1];
            res.statusCode = statusRes[1];
            res.statusMessage = statusRes.slice(2).join(' ');
        }
        else{
            let resHeader = h.split(': ');
            let resHeadName = resHeader[0].toLowerCase();
            let resHeadCont = resHeader.slice(1).join(': ');
            if(resHeadName == 'set-cookie'){
                if(!res.headers[resHeadName]){
                    res.headers[resHeadName] = [];
                }
                res.headers[resHeadName].push(resHeadCont);
            }
            else{
                res.headers[resHeadName] = resHeadCont;
            }
        }
    }
    
    if(!res.statusCode.match(/^(2|3)\d\d$/)){
        let httpStatusMessage = res.statusMessage ? ` (${res.statusMessage})` : '';
        throw { 
            name: 'HTTPError',
            message: `Response code ${res.statusCode}${httpStatusMessage}`,
            response: res
        };
    }
    
    return res;
    
};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = curlReq;
