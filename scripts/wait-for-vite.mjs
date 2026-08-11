import http from 'node:http'

const url = 'http://localhost:5173'
const timeoutMs = 30_000
const intervalMs = 250
const deadline = Date.now() + timeoutMs

function probe() {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume()
      resolve(response.statusCode !== undefined && response.statusCode < 500)
    })
    request.on('error', () => resolve(false))
    request.setTimeout(2_000, () => {
      request.destroy()
      resolve(false)
    })
  })
}

while (Date.now() < deadline) {
  if (await probe()) {
    process.exit(0)
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs))
}

console.error(`Timed out waiting for Vite dev server at ${url}`)
process.exit(1)
