import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sitemapPath = path.resolve(__dirname, '../public/sitemap.xml')

const now = new Date()
const year = now.getUTCFullYear()
const month = String(now.getUTCMonth() + 1).padStart(2, '0')
const day = String(now.getUTCDate()).padStart(2, '0')
const today = `${year}-${month}-${day}`

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://converter-sr.vercel.app/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8')
console.log(`[SEO] sitemap.xml generated with lastmod: ${today}`)
