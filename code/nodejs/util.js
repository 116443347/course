var contract = require('./contract.js');
var format = function (str) {
    var length = str.length;
    while (true) {
        if (str[0] === '0') {
            str = str.substring(1, length);
        } else {
            return str;
        }
    }
}

var httpPost = function (post) {
    var http = require('http');
    var contents = JSON.stringify(post);
    var options = {
        host : '47.95.248.105',
        path : '/api/event/generate/bird',
        port : 3097,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length' : contents.length
        }
    }
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (data) {
            console.log(data)
        });
    });

    req.write(contents);
    req.end;
    return 'success';
}

var formatUrl = function(type,txHash,petId=''){
    var url = contract.SERVICE;
    if(type === 1){
        url += 'eth_getTransactionReceipt&txhash='+txHash;
    }else{
        var contractHash = contract.CONTRACT_HASH;
        url += 'eth_call&to='+contractHash+'&data='+petId+'&tag=latest';
    }
    return url;
}

module.exports.format = format;
module.exports.httpPost = httpPost;
module.exports.formatUrl = formatUrl;