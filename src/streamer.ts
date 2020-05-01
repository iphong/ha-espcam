import * as http from 'http'

let streamURL = process.argv[2]
if (!streamURL) {
	console.log('ERROR: MISSING REQUIRED URL ARGUMENT')
	process.exit(128)
}

const clients = {}
let connections = 0
let counter = 0
let streamResponse = null

const createStream = () => {
	http.get('http://10.0.0.119/resolution?sx=0&sy=0&ex=0&ey=0&offx=0&offy=132&tx=1600&ty=968&ox=1024&oy=600&scale=false&binning=false')

	const req = http.request(streamURL, res => {

		streamResponse = res

		const contentType = res.headers['content-type']
		const [, boundary] = contentType && contentType.match(/^multipart\/[^;]+;boundary=(.*)$/) || []

		if (boundary) {
			res.on('data', (buf:ArrayBuffer) => {
				res.pause()
				if (buf.byteLength === boundary.length + 6) {
					if (buf.toString().match(boundary)) {
						for (let id in clients) {
							clients[id].isSynced = true
						}
					}
				}
				for (let id in clients) {
					if (!clients[id].headerSent) {
						clients[id].headerSent = true
						clients[id].writeHead(res.statusCode, res.headers)
					}
					if (clients[id].writable && clients[id].isSynced) {
						if (!(clients[id].writable = clients[id].write(buf))) {
							clients[id].isSynced = false
							clients[id].writeFailedCount++
							console.log('client overflowed...')
						}
					}
				}
				res.resume()
			})
		}
		res.on('end', () => {
			for (let id in clients)
				clients[id].end()
		})
		res.on('error', (err) => console.error(err))
	})
	req.on('error', e => console.error(e))
	req.end()
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
	})
	res.on('error', (err) => {
		console.log(err)
	})
	if (!streamResponse) createStream()
}).listen(3000, () => console.log('server running at 3000'))