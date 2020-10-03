const parse = (data) => {
    let res = {};
    data = data.replace(/\r/g,'').split('\n')
    for (let line of data) {
        let c = line.split('\t');
        if(c.length < 7){
            continue;
        }
        res[c[5]] = {};
        res[c[5]].value = c[6];
        res[c[5]].expires = new Date(parseInt(c[4])*1000);
        res[c[5]].path = c[2];
        res[c[5]].domain = c[0].replace(/^\./,'');
        res[c[5]].secure = c[3] == 'TRUE' ? true : false;
    }
    return res;
};

module.exports = parse;
