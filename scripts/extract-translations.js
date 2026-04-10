#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const TRANSLATION_REGEX = /\b_\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\{[\s\S]+?\}))?\)/g

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

function main() {
  const locale = process.argv[2]
  if (!locale) {
    console.error('Usage: node scripts/extract-translations.js <locale>')
    console.error('Example: node scripts/extract-translations.js en')
    process.exit(1)
  }

  const dirs = ['app', 'hooks', 'components', 'lib']
  const allTranslations = {}

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir)
    walkDirectory(dirPath, allTranslations)
  }

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

  for (const key of Object.keys(allTranslations)) {
    if (!(key in merged)) {
      merged[key] = `[[${key}]]`
      newKeys++
    }
  }

  const sorted = {}
  for (const key of Object.keys(merged).sort()) {
    sorted[key] = merged[key]
  }

  fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2) + '\n')
  console.log(`Translation file ${locale}.json has been updated successfully.`)
  if (newKeys > 0) {
    console.log(`  ${newKeys} new key(s) added with [[placeholder]] values.`)
  }
}

main()
