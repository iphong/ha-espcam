import * as http from 'http'
import * as https from 'https'
import * as url from 'url'

let streamURL = process.argv[2]
if (!streamURL) {
	console.log("ERROR: MISSING REQUIRED URL ARGUMENT")
	process.exit(128)
}

const clients = {}
let connections = 0
let counter = 0
const options = url.parse(streamURL)
let streamResponse = null

const stream = () => {
	console.log('---> START STREAMING SESSION')
	let frameCount = 0

	http.get('http://10.0.0.119/resolution?sx=0&sy=0&ex=0&ey=0&offx=0&offy=132&tx=1600&ty=968&ox=1024&oy=600&scale=false&binning=false')
	;(options.protocol === 'http:' ? http : https).request(options, res => {
		streamResponse = res
		const contentType = res.headers['content-type']
		const [, boundary] = contentType && contentType.match(/^multipart\/[^;]+;boundary=(.*)$/) || []
		if (res.statusCode !== 200 || !boundary) {
			console.log('request error')
			res.destroy()
		} else {
			console.log('valid stream', boundary)
			res.on('data', (buf:ArrayBuffer) => {
				res.pause()
				// Only look for small size packet
				// Don't waste CPU cycle match large text
				if (buf.byteLength <= boundary.length + 6) {
					// Make sure it includes the boundary
					if (buf.toString().match(boundary)) {
						frameCount++
						for (let id in clients) {
							clients[id].isSynced = true
						}
					}
				}
				for (let id in clients) {
					if (!clients[id].headerSent) {
						clients[id].headerSent = true
						clients[id].writeHead(200, res.headers)
					}
					// IMPORTANT:
					// client need to wait until the next frame
					// otherwise media player may think the data is corrupt
					// and won't render the stream properly
					if (clients[id].isSynced) {
						if (clients[id].writable) {
							clients[id].writable = clients[id].write(buf)
							if (clients[id].writable == false) {
								console.log('Buffer overflowed - skipped frame')
								clients[id].isSynced = false
							}
						}
					}
				}
				res.resume()
			})
		}
		res.on('end', () => {
			for (let id in clients) {
				clients[id].end()
				delete clients[id]
			}
			connections = 0
		})
	}).end()
}

http.createServer((req, res) => {
	const id = counter++
	clients[id] = res
	res.socket.setKeepAlive(true)
	res.on('drain', () => {
		clients[id].writable = true
	})
	res.on('close', () => {
		delete clients[id]
		connections--
		setTimeout(() => {
			if (!connections && streamResponse) {
				streamResponse.destroy()
				streamResponse = null
			}
		}, 1000)
	})
	if (!connections && !streamResponse) stream()
	connections++
}).listen(3000, () => console.log('server running at 3000'))