import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const targetDir = join(process.cwd(), 'public', 'models')
const targetFile = join(targetDir, 'hand_landmarker.task')
const urls = [
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  'https://huggingface.co/Leo-TX/mediapipe-hand/resolve/main/hand_landmarker.task',
  'https://github.com/sanderdesnaijer/mediapipe-model-mirrors/releases/download/v1/hand_landmarker.task',
]

await mkdir(targetDir, { recursive: true })
try {
  const existing = await stat(targetFile)
  if (existing.size > 1_000_000) {
    console.log('Hand Landmarker model already present in public/models')
    process.exit(0)
  }
} catch {}

const errors = []
for (const url of urls) {
  try {
    console.log('Downloading Hand Landmarker model from ' + new URL(url).hostname)
    const response = await fetch(url, { redirect: 'follow' })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength < 1_000_000) throw new Error('Unexpected model size: ' + bytes.byteLength)
    await writeFile(targetFile, bytes)
    console.log('Saved hand_landmarker.task (' + bytes.byteLength + ' bytes)')
    process.exit(0)
  } catch (error) {
    errors.push(url + ': ' + (error?.message || String(error)))
  }
}
throw new Error('Could not download Hand Landmarker model during build. ' + errors.join(' | '))
