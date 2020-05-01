"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var streamURL = process.argv[2];
if (!streamURL) {
    console.log('ERROR: MISSING REQUIRED URL ARGUMENT');
    process.exit(128);
}
var clients = {};
var connections = 0;
var counter = 0;
var streamResponse = null;
var createStream = function () {
    http.get('http://10.0.0.119/resolution?sx=0&sy=0&ex=0&ey=0&offx=0&offy=132&tx=1600&ty=968&ox=1024&oy=600&scale=false&binning=false');
    var req = http.request(streamURL, function (res) {
        streamResponse = res;
        var contentType = res.headers['content-type'];
        var _a = contentType && contentType.match(/^multipart\/[^;]+;boundary=(.*)$/) || [], boundary = _a[1];
        if (boundary) {
            res.on('data', function (buf) {
                res.pause();
                if (buf.byteLength === boundary.length + 6) {
                    if (buf.toString().match(boundary)) {
                        for (var id in clients) {
                            clients[id].isSynced = true;
                        }
                    }
                }
                for (var id in clients) {
                    if (!clients[id].headerSent) {
                        clients[id].headerSent = true;
                        clients[id].writeHead(res.statusCode, res.headers);
                    }
                    if (clients[id].writable && clients[id].isSynced) {
                        if (!(clients[id].writable = clients[id].write(buf))) {
                            clients[id].isSynced = false;
                            clients[id].writeFailedCount++;
                            console.log('client overflowed...');
                        }
                    }
                }
                res.resume();
            });
        }
        res.on('end', function () {
            for (var id in clients)
                clients[id].end();
        });
        res.on('error', function (err) { return console.error(err); });
    });
    req.on('error', function (e) { return console.error(e); });
    req.end();
};
http.createServer(function (req, res) {
    var id = counter++;
    clients[id] = res;
    res.socket.setKeepAlive(true);
    res.on('drain', function () {
        clients[id].writable = true;
    });
    res.on('close', function () {
        delete clients[id];
    });
    res.on('error', function (err) {
        console.log(err);
    });
    if (!streamResponse)
        createStream();
}).listen(3000, function () { return console.log('server running at 3000'); });
