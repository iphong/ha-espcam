const canvas = document.createElement('canvas')

class MJpegReceiver {
	url: string

	constructor(url) {
		this.url = url
		this.init().catch()
	}
	async init() {
		const req = await fetch(this.url)
		const reader = await req.body.getReader()
		while (!reader.closed) {
			const result = await reader.read()
			if (result.done) {
				console.log(result.value)
				break
			}
		}
	}
}

new MJpegReceiver('http://10.0.0.119:81/stream')