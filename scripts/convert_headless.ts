import fs from 'fs'
import path from 'path'
import { parseUniversalDocument } from '../src/parsers'
import { renderToHtml } from '../src/renderers/html'
import { renderToMarkdown } from '../src/renderers/markdown'
import { renderToLatex } from '../src/renderers/latex'
import { renderToPlainText } from '../src/renderers/text'
import { renderToDocx } from '../src/renderers/docx'
import type { SupportedInputFormat, SupportedOutputFormat } from '../src/core/types'

function printHelp() {
  console.log(`
Usage: npx tsx scripts/convert_headless.ts [options] <inputFile>

Options:
  --from <format>   Input format: auto, latex, markdown, html, text (default: auto)
  --to <format>     Output format: html, markdown, latex, json, text, docx (default: html)
  --out <file>      Write output to file instead of stdout
  --ast             Output raw canonical AST JSON
  --help            Show this help message
`)
}

async function main() {
  if (typeof globalThis.DOMParser === 'undefined') {
    try {
      const { DOMParser } = await import('linkedom')
      globalThis.DOMParser = DOMParser as any
    } catch {}
  }

  const args = process.argv.slice(2)
  if (args.includes('--help') || args.length === 0) {
    printHelp()
    process.exit(0)
  }

  let fromFormat: SupportedInputFormat = 'auto'
  let toFormat: SupportedOutputFormat = 'html'
  let outFile: string | null = null
  let dumpAst = false
  let inputFile: string | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && i + 1 < args.length) {
      fromFormat = args[++i] as SupportedInputFormat
    } else if (args[i] === '--to' && i + 1 < args.length) {
      toFormat = args[++i] as SupportedOutputFormat
    } else if (args[i] === '--out' && i + 1 < args.length) {
      outFile = args[++i]
    } else if (args[i] === '--ast') {
      dumpAst = true
    } else if (!args[i].startsWith('--')) {
      inputFile = args[i]
    }
  }

  if (!inputFile) {
    console.error('Error: No input file specified.')
    process.exit(1)
  }

  const resolvedInputPath = path.resolve(process.cwd(), inputFile)
  if (!fs.existsSync(resolvedInputPath)) {
    console.error(`Error: File not found: ${resolvedInputPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(resolvedInputPath, 'utf-8')
  const astDoc = parseUniversalDocument(content, fromFormat)

  if (dumpAst || toFormat === 'json') {
    const jsonOutput = JSON.stringify(astDoc, null, 2)
    if (outFile) {
      fs.writeFileSync(path.resolve(process.cwd(), outFile), jsonOutput)
    } else {
      console.log(jsonOutput)
    }
    return
  }

  if (toFormat === 'docx') {
    const docxUint8 = renderToDocx(astDoc)
    const targetOut = outFile || 'output.docx'
    fs.writeFileSync(path.resolve(process.cwd(), targetOut), Buffer.from(docxUint8))
    console.log(`Saved DOCX to: ${targetOut}`)
    return
  }

  let outputText = ''
  switch (toFormat) {
    case 'html':
      outputText = renderToHtml(astDoc, { includeWrapper: true, mathMode: 'semantic' })
      break
    case 'markdown':
      outputText = renderToMarkdown(astDoc)
      break
    case 'latex':
      outputText = renderToLatex(astDoc, { includePreamble: true, documentClass: 'article' })
      break
    case 'text':
      outputText = renderToPlainText(astDoc, { mathMode: 'unicode' })
      break
    default:
      outputText = renderToHtml(astDoc, { includeWrapper: true, mathMode: 'semantic' })
      break
  }

  if (outFile) {
    fs.writeFileSync(path.resolve(process.cwd(), outFile), outputText, 'utf-8')
    console.log(`Saved to ${outFile}`)
  } else {
    console.log(outputText)
  }
}

main().catch((err) => {
  console.error('Conversion error:', err)
  process.exit(1)
})
