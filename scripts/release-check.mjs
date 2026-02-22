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
  const actualCmd = process.platform === 'win32' && cmd === 'npm' ? 'npm.cmd' : cmd
  const result = spawnSync(actualCmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  })
  if (result.status !== 0) {
    fail(`${actualCmd} ${args.join(' ')} exited with code ${result.status}`)
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
run('npm', ['run', '-s', 'test'])
run('npm', ['run', '-s', 'build'])

step('Done')
console.log('[release:check] PASS')
