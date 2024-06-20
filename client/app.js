const form = document.querySelector('form')
const input = document.querySelector('input')
const resultList = document.querySelector('#results')
const contentDisplay = document.querySelector('#contentDisplay')
const socket = new WebSocket('ws://localhost:3000')

form.addEventListener('submit', async event => {
	event.preventDefault()
	const keyword = input.value

	console.log(`Searching for keyword: ${keyword}`) 

	// Check localStorage for cached results
	const cachedResults = localStorage.getItem(keyword)
	if (cachedResults) {
		console.log(`Using cached results for keyword: ${keyword}`)
		displayResults(JSON.parse(cachedResults))
		return
	}

	try {
		const response = await fetch(`/keywords?keyword=${keyword}`)
		if (!response.ok) throw new Error('Network response was not ok')
		const data = await response.json()

		// Cache results in localStorage
		localStorage.setItem(keyword, JSON.stringify(data.urls))

		displayResults(data.urls)
	} catch (error) {
		console.error(`Error fetching keywords: ${error.message}`) 
		contentDisplay.textContent = `Error: ${error.message}`
	}
})

function displayResults(urls) {
	resultList.innerHTML = ''
	urls.forEach(url => {
		const li = document.createElement('li')
		li.textContent = url
		li.addEventListener('click', () => {
			console.log(`Selected URL: ${url}`) 
			socket.send(JSON.stringify({ url, keyword: input.value }))
		})
		resultList.appendChild(li)
	})
}

socket.addEventListener('message', event => {
	const { progress, error, total } = JSON.parse(event.data)

	if (error) {
		console.error(`Error: ${error}`) // Логирование ошибок
		contentDisplay.textContent = `Error: ${error}`
		return
	}

	contentDisplay.textContent = `Downloading... ${progress}% of ${total} bytes`
})
