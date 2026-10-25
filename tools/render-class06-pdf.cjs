'use strict';
// Usage: NODE_PATH=/path/to/node_modules node tools/render-class06-pdf.cjs
// Only local files are loaded; PDF links retain their public GitHub Pages URLs.
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const base = 'https://cnpcshangbo.github.io/meritpoint-slides/';
(async () => {
  const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox']});
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (!request.url().startsWith(base)) return request.abort();
      let rel = new URL(request.url()).pathname.slice('/meritpoint-slides/'.length);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(root, rel);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return request.abort();
      const ext = path.extname(file);
      request.respond({status:200, contentType: {'.html':'text/html','.css':'text/css','.js':'text/javascript'}[ext] || 'application/octet-stream', body:fs.readFileSync(file)});
    });
    await page.goto(base + 'python/handout-06/', {waitUntil:'networkidle0'});
    await page.emulateMediaType('print');
    await page.pdf({path:path.join(root,'python/handout-06/Handout_06_Research_Clinic.pdf'), printBackground:true, preferCSSPageSize:true});
    console.log('Rendered mirror handout with public Pages links.');
  } finally { await browser.close(); }
})().catch(err => {console.error(err); process.exitCode=1;});
