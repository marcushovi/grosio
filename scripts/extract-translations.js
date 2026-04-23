#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const TRANSLATION_REGEX = /\b_\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\{[\s\S]+?\}))?\)/g
const LOCALES = ['en', 'sk', 'cs', 'de']
const SCAN_DIRS = ['app', 'hooks', 'components', 'lib']

function walkDirectory(dirPath, translations = {}) {
  if (!fs.existsSync(dirPath)) return translations
  const files = fs.readdirSync(dirPath)
  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      walkDirectory(filePath, translations)
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      let match
      while ((match = TRANSLATION_REGEX.exec(content)) !== null) {
        const key = match[1]
        if (!translations[key]) {
          translations[key] = key
        }
      }
    }
  }
  return translations
}

function updateLocale(locale, usedKeys) {
  const outputPath = path.join(process.cwd(), 'locales', `${locale}.json`)

  let existing = {}
  if (fs.existsSync(outputPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(outputPath, 'utf-8'))
    } catch {
      console.warn(`Warning: Could not parse existing ${locale}.json, starting fresh.`)
    }
  }

  const merged = { ...existing }
  let newKeys = 0

  for (const key of Object.keys(usedKeys)) {
    if (!(key in merged)) {
      merged[key] = `[[${key}]]`
      newKeys++
    }
  }

  const orphans = Object.keys(merged).filter(k => !(k in usedKeys))

  const sorted = {}
  for (const key of Object.keys(merged).sort()) {
    sorted[key] = merged[key]
  }

  fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2) + '\n')
  console.log(`${locale}.json updated (${Object.keys(sorted).length} keys)`)
  if (newKeys > 0) console.log(`  + ${newKeys} new key(s) with [[placeholder]] values`)
  if (orphans.length > 0) {
    console.log(`  ! ${orphans.length} orphan key(s) not referenced in code:`)
    for (const k of orphans) console.log(`    - ${k}`)
  }
}

function main() {
  const arg = process.argv[2]
  const targets =
    !arg || arg === '--all' ? LOCALES : LOCALES.includes(arg) ? [arg] : null

  if (!targets) {
    console.error(`Unknown locale "${arg}". Valid: ${LOCALES.join(', ')} or --all (default).`)
    process.exit(1)
  }

  const usedKeys = {}
  for (const dir of SCAN_DIRS) {
    walkDirectory(path.join(process.cwd(), dir), usedKeys)
  }
  console.log(`Found ${Object.keys(usedKeys).length} translation key(s) in code.\n`)

  for (const locale of targets) updateLocale(locale, usedKeys)
}

main()
