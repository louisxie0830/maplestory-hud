#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()

function step(title) {
  console.log(`\n[release:check] ${title}`)
}

function fail(message) {
  console.error(`\n[release:check] FAILED: ${message}`)
  process.exit(1)
}

function run(cmd, args) {
  const quote = (value) => {
    if (!value.includes(' ') && !value.includes('"')) return value
    return `"${value.replace(/"/g, '\\"')}"`
  }

  const display = `${cmd} ${args.join(' ')}`.trim()
  const result = process.platform === 'win32'
    ? spawnSync(
      'cmd.exe',
      ['/d', '/s', '/c', [cmd, ...args].map(quote).join(' ')],
      { cwd: ROOT, stdio: 'inherit', env: process.env }
    )
    : spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env })

  if (result.error) {
    fail(`${display} failed to start: ${result.error.message}`)
  }
  if (result.status === null) {
    fail(`${display} terminated by signal ${result.signal ?? 'unknown'}`)
  }
  if (result.status !== 0) {
    fail(`${display} exited with code ${result.status}`)
  }
}

function checkPath(path) {
  const abs = resolve(ROOT, path)
  if (!existsSync(abs)) {
    fail(`Required file not found: ${path}`)
  }
}

step('Reading package.json')
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
const win = pkg?.build?.win
if (!win) fail('Missing build.win configuration in package.json')
if (!pkg?.version || typeof pkg.version !== 'string') {
  fail('package.json version is missing')
}

const tagName = process.env.GITHUB_REF_NAME
if (tagName && /^v\d+\.\d+\.\d+$/.test(tagName)) {
  const expected = `v${pkg.version}`
  if (tagName !== expected) {
    fail(`Tag/version mismatch: tag=${tagName}, package.json version=${pkg.version}`)
  }
}

step('Validating Windows target and icons')
const targets = Array.isArray(win.target) ? win.target : []
if (!targets.includes('nsis')) {
  fail('build.win.target must include "nsis"')
}

if (!win.icon || typeof win.icon !== 'string') {
  fail('build.win.icon is missing')
}
checkPath(win.icon)

const macIcon = pkg?.build?.mac?.icon
if (typeof macIcon === 'string') {
  checkPath(macIcon)
}

step('Running static quality gates')
run('npm', ['run', '-s', 'typecheck'])
run('npm', ['run', '-s', 'lint'])
run('npm', ['run', '-s', 'test:coverage'])
run('npm', ['run', '-s', 'build'])

step('Done')
console.log('[release:check] PASS')
