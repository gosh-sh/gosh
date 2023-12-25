#!/usr/bin/env node
const { glob } = require('glob')
const { statSync, writeFileSync, readFileSync, existsSync } = require('fs')

const { Command } = require('commander')
const { version } = require('./package.json')
const { spawn } = require('child_process')

const program = new Command()
program
  .version(version)
  .name('rim')
  .allowUnknownOption()
  .option(
    '-m, --minimatch <match>',
    'Files scanned for changes',
    'src/**/*.{tsx,ts,jsx,js,svg,html,css,scss,less}',
  )
  .option('-s, --snapshot <file>', 'Snapshot files', '.run-on-diff.cache.json')
  .usage("-s '.cache' -m '**/*.svg' echo \"hello world on change\"")

program.parse(process.argv)

function isEqual(a, b) {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  for (const i of ak) if (a[i] !== b[i]) return false
  for (const i of bk) if (a[i] !== b[i]) return false
  return true
}

const snapshot = Object.assign(
  {},
  ...program.minimatch.split('|').reduce((res, pattern) => {
    const found = glob
      .sync(pattern.trim())
      .map((file) => ({ [file]: statSync(file).mtime.getTime() }))
    res.push(...found)
    return res
  }, []),
)

if (existsSync(program.snapshot)) {
  const oldSnapshot = JSON.parse(readFileSync(program.snapshot).toString())
  if (isEqual(oldSnapshot, snapshot)) return
}

const arguments = [...program.args]
const command = arguments.shift()
if (!command) process.exit(0)
const child = spawn(command, arguments)
process.stdin.pipe(child.stdin)
child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)
child.on('exit', (e) => {
  if (e === 0) writeFileSync(program.snapshot, JSON.stringify(snapshot))
  process.exit(e)
})
