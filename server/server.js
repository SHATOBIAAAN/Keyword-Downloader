const fs = require('fs')
const path = require('path')
const express = require('express')
const axios = require('axios')
const WebSocket = require('ws')
const morgan = require('morgan')

const app = express()
const port = 3000

const urlToKeywords = require('./keywords.json')

const server = require('http').createServer(app)
const wss = new WebSocket.Server({ server })

const downloadsDir = path.join(__dirname, 'downloads')
if (!fs.existsSync(downloadsDir)) {
	fs.mkdirSync(downloadsDir, { recursive: true })
}

app.use(morgan('combined'))

wss.on('connection', ws => {
	ws.on('message', message => {
		try {
			const { url, keyword } = JSON.parse(message)
			downloadContent(url, keyword, ws)
		} catch (error) {
			ws.send(JSON.stringify({ error: 'Invalid message format' }))
		}
	})
})

async function downloadContent(url, keyword, ws) {
	const outputPath = path.join(downloadsDir, `${keyword}.txt`)
	const writer = fs.createWriteStream(outputPath)

	try {
		const response = await axios({
			method: 'get',
			url,
			responseType: 'stream',
		})

		const totalLength = response.headers['content-length']
		let downloadedLength = 0

		response.data.on('data', chunk => {
			downloadedLength += chunk.length
			const progress = (downloadedLength / totalLength) * 100

			ws.send(
				JSON.stringify({
					progress: progress.toFixed(2),
					total: totalLength,
				})
			)
		})

		response.data.on('end', () => {
			ws.send(
				JSON.stringify({
					progress: '100.00',
					total: totalLength,
				})
			)
		})

		response.data.pipe(writer)

		writer.on('finish', () => {
			console.log(`Content downloaded and saved to ${outputPath}`)
		})

		writer.on('error', err => {
			console.error('Error writing to file', err)
			ws.send(JSON.stringify({ error: 'Error writing to file' }))
		})
	} catch (error) {
		console.error('Error downloading content', error)
		ws.send(JSON.stringify({ error: error.message }))
	}
}

app.use(express.static(path.join(__dirname, '..', 'client')))

app.get('/keywords', (req, res) => {
	const keyword = req.query.keyword.toLowerCase()
	console.log(`Received keyword: ${keyword}`)
	const urls = Object.keys(urlToKeywords).filter(url =>
		urlToKeywords[url].map(k => k.toLowerCase()).includes(keyword)
	)
	if (urls.length) {
		console.log(`Returning URLs: ${urls}`)
		res.json({ urls })
	} else {
		res.status(404).json({ error: 'No URLs found for this keyword' })
	}
})

app.use('/downloads', express.static(downloadsDir))

server.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`)
})
