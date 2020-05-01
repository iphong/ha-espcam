"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var https = require("https");
var url = require("url");
var streamURL = process.argv[2];
if (!streamURL) {
    console.log("ERROR: MISSING REQUIRED URL ARGUMENT");
    process.exit(128);
}
var clients = {};
var connections = 0;
var counter = 0;
var options = url.parse(streamURL);
var streamResponse = null;
var stream = function () {
    console.log('---> START STREAMING SESSION');
    var frameCount = 0;
    http.get('http://10.0.0.119/resolution?sx=0&sy=0&ex=0&ey=0&offx=0&offy=132&tx=1600&ty=968&ox=1024&oy=600&scale=false&binning=false');
    (options.protocol === 'http:' ? http : https).request(options, function (res) {
        streamResponse = res;
        var contentType = res.headers['content-type'];
        var _a = contentType && contentType.match(/^multipart\/[^;]+;boundary=(.*)$/) || [], boundary = _a[1];
        if (res.statusCode !== 200 || !boundary) {
            console.log('request error');
            res.destroy();
        }
        else {
            console.log('valid stream', boundary);
            res.on('data', function (buf) {
                res.pause();
                // Only look for small size packet
                // Don't waste CPU cycle match large text
                if (buf.byteLength <= boundary.length + 6) {
                    // Make sure it includes the boundary
                    if (buf.toString().match(boundary)) {
                        frameCount++;
                        for (var id in clients) {
                            clients[id].isSynced = true;
                        }
                    }
                }
                for (var id in clients) {
                    if (!clients[id].headerSent) {
                        clients[id].headerSent = true;
                        clients[id].writeHead(200, res.headers);
                    }
                    // IMPORTANT:
                    // client need to wait until the next frame
                    // otherwise media player may think the data is corrupt
                    // and won't render the stream properly
                    if (clients[id].isSynced) {
                        if (clients[id].writable) {
                            clients[id].writable = clients[id].write(buf);
                            if (clients[id].writable == false) {
                                console.log('Buffer overflowed - skipped frame');
                                clients[id].isSynced = false;
                            }
                        }
                    }
                }
                res.resume();
            });
        }
        res.on('end', function () {
            for (var id in clients) {
                clients[id].end();
                delete clients[id];
            }
            connections = 0;
        });
    }).end();
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
        connections--;
        setTimeout(function () {
            if (!connections && streamResponse) {
                streamResponse.destroy();
                streamResponse = null;
            }
        }, 1000);
    });
    if (!connections && !streamResponse)
        stream();
    connections++;
}).listen(3000, function () { return console.log('server running at 3000'); });
