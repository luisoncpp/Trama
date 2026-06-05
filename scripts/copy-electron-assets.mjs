import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const assets = ['electron/services/book-export-pdf-print.css']

for (const asset of assets) {
  const source = join(root, asset)
  const destination = join(root, 'dist-electron', asset)
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(source, destination)
}
