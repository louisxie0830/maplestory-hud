import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'
import { parseHpMp, parseExp, parseMeso } from './parsers'
import log from 'electron-log/main'

interface ReplayCase {
  regionId: 'hp' | 'mp' | 'exp' | 'meso'
  text: string
  expected: number | [number, number] | number[]
}

interface ReplayDataset {
  name: string
  version: 1
  cases: ReplayCase[]
}

export interface ReplayRunResult {
  dataset: string
  total: number
  passed: number
  failed: number
  accuracy: number
  failures: Array<{ index: number; regionId: string; text: string; expected: unknown; actual: unknown }>
}

function getReplayDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'data', 'ocr-replay')
  }
  return join(app.getAppPath(), 'data', 'ocr-replay')
}

function evalCase(testCase: ReplayCase): { pass: boolean; actual: unknown } {
  switch (testCase.regionId) {
    case 'hp':
    case 'mp': {
      const parsed = parseHpMp(testCase.text)
      const actual = parsed ? [parsed.current, parsed.max] : null
      return { pass: JSON.stringify(actual) === JSON.stringify(testCase.expected), actual }
    }
    case 'exp': {
      const parsed = parseExp(testCase.text)
      const actual = parsed?.percent ?? null
      return { pass: actual === testCase.expected, actual }
    }
    case 'meso': {
      const parsed = parseMeso(testCase.text)
      const actual = parsed?.amount ?? null
      return { pass: actual === testCase.expected, actual }
    }
    default:
      return { pass: false, actual: null }
  }
}

export async function listReplayDatasets(): Promise<string[]> {
  try {
    const dir = getReplayDir()
    const files = await readdir(dir)
    return files.filter((name) => name.endsWith('.json')).sort()
  } catch {
    return []
  }
}

export async function runReplayDataset(fileName: string): Promise<ReplayRunResult | null> {
  try {
    if (fileName.includes('/') || fileName.includes('\\')) return null
    const filePath = join(getReplayDir(), fileName)
    const raw = await readFile(filePath, 'utf-8')
    const dataset = JSON.parse(raw) as ReplayDataset
    if (dataset.version !== 1 || !Array.isArray(dataset.cases)) return null

    let passed = 0
    const failures: ReplayRunResult['failures'] = []
    dataset.cases.forEach((item, idx) => {
      const result = evalCase(item)
      if (result.pass) {
        passed += 1
      } else {
        failures.push({
          index: idx,
          regionId: item.regionId,
          text: item.text,
          expected: item.expected,
          actual: result.actual
        })
      }
    })

    const total = dataset.cases.length
    const failed = total - passed
    const accuracy = total > 0 ? passed / total : 0
    return { dataset: dataset.name, total, passed, failed, accuracy, failures: failures.slice(0, 30) }
  } catch (err) {
    log.warn('runReplayDataset failed', err)
    return null
  }
}
