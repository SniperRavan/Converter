#!/usr/bin/env node

/**
 * Converter SEO Automation & Webmaster Suite
 * Supports:
 * 1. IndexNow instant ping (Bing, Yandex, Seznam, Naver)
 * 2. Bing Webmaster Tools API (crawl stats, queries, page stats)
 * 3. Google Search Console API (search analytics, index status)
 * 4. Dynamic sitemap & health inspection
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// Helper to load .env or .env.local without external dependencies
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(rootDir, file)
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim()
          let v = trimmed.slice(idx + 1).trim()
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1)
          }
          if (!process.env[k]) {
            process.env[k] = v
          }
        }
      }
    }
  }
}
loadEnv()

const SITE_URL = 'https://converter-sr.vercel.app'
const HOST = 'converter-sr.vercel.app'
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '2c8a4f91b7e34d60a5e8c1f9d2b7a4e6'
const BING_API_KEY = process.env.BING_API_KEY || ''
const GSC_KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(rootDir, 'gsc-credentials.json')

// Colors for terminal output
const cyan = (text) => `\x1b[36m${text}\x1b[0m`
const green = (text) => `\x1b[32m${text}\x1b[0m`
const yellow = (text) => `\x1b[33m${text}\x1b[0m`
const red = (text) => `\x1b[31m${text}\x1b[0m`
const bold = (text) => `\x1b[1m${text}\x1b[0m`
const dim = (text) => `\x1b[2m${text}\x1b[0m`

/**
 * 1. IndexNow Protocol: Instant Notification to Bing & Yandex
 */
async function pingIndexNow(urls = [SITE_URL + '/']) {
  console.log(bold('\n⚡ IndexNow Protocol: Instant Notification to Search Engines'))
  console.log(dim('Pinging Microsoft Bing, Yandex, Seznam, and Naver...'))

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls
  }

  const endpoints = [
    { name: 'IndexNow Global Hub', url: 'https://api.indexnow.org/indexnow' },
    { name: 'Microsoft Bing Direct', url: 'https://www.bing.com/indexnow' }
  ]

  let successCount = 0
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      })

      if (res.status === 200 || res.status === 202) {
        console.log(`  ${green('✔')} ${bold(ep.name)}: ${green(`HTTP ${res.status}`)} (Notification accepted)`)
        successCount++
      } else {
        const text = await res.text().catch(() => '')
        console.log(`  ${yellow('⚠')} ${bold(ep.name)}: ${yellow(`HTTP ${res.status}`)} ${text}`)
      }
    } catch (err) {
      console.log(`  ${red('✖')} ${bold(ep.name)}: ${red(err.message)}`)
    }
  }

  if (successCount > 0) {
    console.log(green(`\n✔ IndexNow ping completed! Bing has been queued to crawl ${SITE_URL}/ within hours.`))
  }
}

/**
 * 2. Bing Webmaster Tools API
 */
async function checkBing() {
  console.log(bold('\n🔎 Bing Webmaster Tools API Integration'))

  if (!BING_API_KEY) {
    console.log(yellow('  ⚠ BING_API_KEY not found in .env.local.'))
    console.log(dim('\n  How to connect Bing Webmaster API in 30 seconds:'))
    console.log('  1. Open https://www.bing.com/webmasters')
    console.log('  2. Click Settings (gear icon) -> API Access -> API Key')
    console.log('  3. Generate key and add to your .env.local file:')
    console.log(`     ${cyan('BING_API_KEY=your_key_here')}\n`)
    return
  }

  const baseUrl = 'https://ssl.bing.com/webmaster/api.svc/json'

  // A. Check URL submission quota
  try {
    const quotaRes = await fetch(`${baseUrl}/GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${BING_API_KEY}`)
    if (quotaRes.ok) {
      const quota = await quotaRes.json()
      const d = quota.d || {}
      console.log(`  ${green('✔')} Quota remaining: Daily ${bold(d.DailyQuota || 'N/A')}, Monthly ${bold(d.MonthlyQuota || 'N/A')}`)
    } else {
      console.log(`  ${yellow('⚠')} Quota query: HTTP ${quotaRes.status}`)
    }
  } catch (err) {
    console.log(`  ${red('✖')} Quota query failed: ${err.message}`)
  }

  // B. Check Crawl Stats
  try {
    const crawlRes = await fetch(`${baseUrl}/GetCrawlStats?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${BING_API_KEY}`)
    if (crawlRes.ok) {
      const data = await crawlRes.json()
      const entries = data.d || []
      console.log(`  ${green('✔')} Crawl history entries: ${bold(entries.length)} discovered`)
      if (entries.length > 0) {
        const latest = entries[0]
        console.log(`     Latest Crawl Date: ${latest.Date || 'Recent'}`)
        console.log(`     Crawled Pages: ${latest.CrawledPages || 0}, Errors: ${latest.CrawlErrors || 0}`)
      }
    }
  } catch (err) {
    console.log(`  ${dim('  (Crawl stats currently warming up)')}`)
  }

  // C. Check Query/Keyword Stats
  try {
    const queryRes = await fetch(`${baseUrl}/GetQueryStats?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${BING_API_KEY}`)
    if (queryRes.ok) {
      const data = await queryRes.json()
      const queries = data.d || []
      console.log(`  ${green('✔')} Tracked Search Queries: ${bold(queries.length)} queries`)
      for (const q of queries.slice(0, 5)) {
        console.log(`     Query: "${bold(q.Query)}" -> Impressions: ${q.Impressions}, Clicks: ${q.Clicks}`)
      }
    }
  } catch (err) {
    console.log(`  ${dim('  (Query stats currently warming up)')}`)
  }
}

/**
 * 3. Google Search Console API
 */
async function checkGoogle() {
  console.log(bold('\n🌐 Google Search Console API Integration'))

  if (!fs.existsSync(GSC_KEY_FILE) && !process.env.GSC_CLIENT_EMAIL) {
    console.log(yellow('  ⚠ Google Search Console credentials not found.'))
    console.log(dim('\n  How to connect Google Search Console API:'))
    console.log('  1. Go to https://console.cloud.google.com/ -> Enable "Google Search Console API"')
    console.log('  2. Create a Service Account -> Download JSON key -> save as:')
    console.log(`     ${cyan('gsc-credentials.json')}`)
    console.log('  3. In Google Search Console -> Settings -> Users -> Add Service Account email with "Full" access.\n')
    return
  }

  try {
    let creds
    if (fs.existsSync(GSC_KEY_FILE)) {
      creds = JSON.parse(fs.readFileSync(GSC_KEY_FILE, 'utf-8'))
    } else {
      creds = {
        client_email: process.env.GSC_CLIENT_EMAIL,
        private_key: process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, '\n')
      }
    }

    console.log(`  ${green('✔')} Authenticated as: ${bold(creds.client_email)}`)

    // Simple OAuth2 JWT generation without third-party libraries
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const claim = Buffer.from(JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    })).toString('base64url')

    const sign = crypto.createSign('RSA-SHA256')
    sign.update(`${header}.${claim}`)
    const signature = sign.sign(creds.private_key, 'base64url')
    const jwt = `${header}.${claim}.${signature}`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    })

    if (!tokenRes.ok) {
      console.log(`  ${red('✖')} Token exchange failed: HTTP ${tokenRes.status}`)
      return
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    // Query Search Analytics
    const queryRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL + '/')}/searchAnalytics/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 10
      })
    })

    if (queryRes.ok) {
      const data = await queryRes.json()
      const rows = data.rows || []
      console.log(`  ${green('✔')} Google Search Analytics retrieved: ${bold(rows.length)} queries active`)
      for (const row of rows) {
        console.log(`     "${bold(row.keys[0])}": Clicks ${row.clicks}, Impressions ${row.impressions}, Position ${row.position.toFixed(1)}`)
      }
    } else {
      const errText = await queryRes.text()
      console.log(`  ${yellow('⚠')} Search Console query returned HTTP ${queryRes.status}: ${errText}`)
    }
  } catch (err) {
    console.log(`  ${red('✖')} Google API error: ${err.message}`)
  }
}

/**
 * 4. Site Live Inspection
 */
async function checkHealth() {
  console.log(bold('\n🏥 Converter Live SEO Health Check'))

  // 1. Live site
  try {
    const res = await fetch(SITE_URL + '/')
    const html = await res.text()
    const titleMatch = html.match(/<title>(.*?)<\/title>/)
    const title = titleMatch ? titleMatch[1] : 'N/A'
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
    const desc = descMatch ? descMatch[1] : 'N/A'
    const h1Count = (html.match(/<h1\b/gi) || []).length

    console.log(`  ${green('✔')} Production URL: ${cyan(SITE_URL + '/')} (${green(`HTTP ${res.status}`)})`)
    console.log(`     Title (${title.length} chars): "${bold(title)}"`)
    console.log(`     Meta Desc (${desc.length} chars): "${desc}"`)
    console.log(`     HTML <h1> tags in raw source: ${h1Count === 1 ? green('1 (Optimal)') : yellow(h1Count)}`)
  } catch (err) {
    console.log(`  ${red('✖')} Production URL unreachable: ${err.message}`)
  }

  // 2. Sitemap
  try {
    const sitemapRes = await fetch(SITE_URL + '/sitemap.xml')
    const sitemapText = await sitemapRes.text()
    const lastmodMatch = sitemapText.match(/<lastmod>(.*?)<\/lastmod>/)
    const lastmod = lastmodMatch ? lastmodMatch[1] : 'N/A'
    console.log(`  ${green('✔')} Sitemap: ${cyan(SITE_URL + '/sitemap.xml')} (${green(`HTTP ${sitemapRes.status}`)})`)
    console.log(`     Live dynamic <lastmod>: ${bold(lastmod)}`)
  } catch (err) {
    console.log(`  ${red('✖')} Sitemap error: ${err.message}`)
  }

  // 3. IndexNow Key File
  try {
    const keyRes = await fetch(`${SITE_URL}/${INDEXNOW_KEY}.txt`)
    const keyText = (await keyRes.text()).trim()
    const keyOk = keyText === INDEXNOW_KEY
    console.log(`  ${keyOk ? green('✔') : yellow('⚠')} IndexNow Key File: ${cyan(`${SITE_URL}/${INDEXNOW_KEY}.txt`)} ${keyOk ? green('(Verified)') : yellow('(Pending Deploy)')}`)
  } catch (err) {
    console.log(`  ${yellow('⚠')} IndexNow file check: ${err.message}`)
  }
}

// CLI Dispatcher
const cmd = process.argv[2] || 'all'

async function main() {
  console.log(bold(`====================================================`))
  console.log(bold(`   🚀 Converter SEO & Webmaster Automation Suite`))
  console.log(bold(`====================================================`))

  switch (cmd) {
    case 'ping':
      await pingIndexNow()
      break
    case 'bing':
      await checkBing()
      break
    case 'google':
      await checkGoogle()
      break
    case 'health':
      await checkHealth()
      break
    case 'all':
    default:
      await checkHealth()
      await pingIndexNow()
      await checkBing()
      await checkGoogle()
      break
  }
}

main().catch((err) => {
  console.error(red(`Unexpected error: ${err.message}`))
  process.exit(1)
})
