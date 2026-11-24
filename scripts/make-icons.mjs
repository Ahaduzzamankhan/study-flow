// Generates build/icon.png and a multi-resolution build/icon.ico from build/icon.svg.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = resolve(root, 'build')

const svg = await readFile(resolve(buildDir, 'icon.svg'))
const sizes = [16, 24, 32, 48, 64, 128, 256, 512]

const pngs = []
for (const size of sizes) {
  const buffer = await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer()
  const path = resolve(buildDir, `icon-${size}.png`)
  await writeFile(path, buffer)
  pngs.push(path)
  process.stdout.write(`icon-${size}.png\n`)
}

await writeFile(resolve(buildDir, 'icon.png'), await sharp(svg, { density: 384 }).resize(512, 512).png().toBuffer())
const ico = await pngToIco([16, 24, 32, 48, 64, 128, 256].map((s) => resolve(buildDir, `icon-${s}.png`)))
await writeFile(resolve(buildDir, 'icon.ico'), ico)
process.stdout.write('icon.png + icon.ico written\n')
void pngs
