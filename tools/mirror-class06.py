#!/usr/bin/env python3
"""Build the reviewed Class 6 backup from public, pinned inputs. No network or deletion.

Run from any directory: python3 tools/mirror-class06.py [output-repository]
Only the paths below and the two catalog files are written.
"""
import hashlib
import html
import json
from pathlib import Path
import re
import sys

HERE = Path(__file__).resolve().parent
INPUT = HERE / 'class06-inputs'
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE.parent
BASE = 'https://cnpcshangbo.github.io/meritpoint-slides/'
CORE = [
    'python/class-06-lab/index.html', 'python/class-06-lab/clinic.css',
    'python/class-06-lab/clinic.js', 'python/class-06-lab/L06_data_audit.py',
    'python/class-06-lab/L06_data_audit.ipynb', 'python/handout-06/index.html',
    'python/class-05-lab/colleges.csv', 'python/class-05-lab/dataset-metadata.json',
]

def write(rel, content):
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content if isinstance(content, bytes) else content.encode())

def rewrite(text):
    text = text.replace('https://courses.hopeembark.org/python/lecture-05/', BASE + 'python/class-06-lab/college-source.html')
    text = text.replace('https://courses.hopeembark.org/python/"', BASE + '"')
    text = text.replace('https://courses.hopeembark.org/', BASE)
    text = re.sub(r'((?:href|src)=")/(?!/|meritpoint-slides/)', r'\1/meritpoint-slides/', text)
    text = text.replace('ScholarMind AI</a>', 'ScholarMind AI (optional online service)</a>')
    text = text.replace('ScholarMind AI ↗', 'ScholarMind AI (optional online service) ↗')
    return text

for rel in CORE:
    raw = (INPUT / rel).read_bytes()
    if rel.endswith('clinic.css'):
        # Long printed writing lines must wrap on a phone without altering print.
        raw += b'\n@media screen and (max-width:520px){.paper{overflow-wrap:anywhere}.paper td,.paper th{overflow-wrap:anywhere}}\n'
    if rel.endswith('.html'):
        text = rewrite(raw.decode())
        if rel == 'python/class-06-lab/index.html':
            notice = '<aside class="mirror-notice"><b>Backup classroom.</b> This page, quick checks, topic packs and downloads work independently of the course server. Notes stay in this browser and on this site: use <a href="#checkpoint">Download backup / Restore backup</a> to move your work between sites. AI services and dataset publishers are separate online services.</aside>'
            text = text.replace('<main id="main">', '<main id="main">' + notice)
        raw = text.encode()
    write(rel, raw)

# Build a self-contained source note instead of linking an unmirrored Lecture 5.
meta = json.loads((INPUT / 'python/class-05-lab/dataset-metadata.json').read_text())
c = meta['colleges']
esc = html.escape
rows = ''.join('<tr><th scope="row">' + esc(k) + '</th><td>' + esc(v['meaning']) + '</td><td>' + esc(v.get('unit', '—')) + '</td><td>' + esc(v.get('period', 'See source documentation')) + '</td></tr>' for k,v in c['fields'].items())
source_page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>College data source notes · Class 6</title><link rel="stylesheet" href="clinic.css"><style>.table-scroll{overflow:auto}th,td{min-width:120px}td:nth-child(2){min-width:260px}</style></head><body><header><a class="brand" href="../../">MERIT POINT <small>ACADEMY</small></a><nav><a href="./#resources">Class 6</a><a href="../handout-06/">Handout 6</a></nav></header><main id="main"><section><p class="eyebrow">CLASS 6 / COLLEGE DATA</p><h1>One college.<br>One checked record.</h1><p class="lead">Use the saved Class 5 teaching snapshot for your own data audit.</p><div class="actions"><a class="button" href="../class-05-lab/colleges.csv" download>Download colleges.csv ↓</a><a href="../class-05-lab/dataset-metadata.json">Full source metadata</a></div>'''
source_page += f'<h2>What does one row mean?</h2><p>{esc(c["row_unit"])}</p><p>{esc(c["selection"])}</p><p><b>{c["rows"]} colleges · {c["missing"]["annual_net_price"]} missing prices · snapshot saved {esc(meta["snapshot_date"])}</b></p>'
source_page += '<h2>Start with a question</h2><p>How does reported annual net price vary by state and college type? Before comparing: count all rows, count reported prices, and inspect missing values in each group. Keep unknown prices visible; do not replace them with zero.</p><h2>Read the columns</h2><div class="table-scroll"><table><thead><tr><th>Column</th><th>Meaning</th><th>Unit</th><th>Period</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
source_page += '<h2>Keep the limits beside the result</h2><p>' + esc(c['missing_policy']) + '</p><ul>' + ''.join('<li>'+esc(x)+'</li>' for x in c['limits']) + '</ul><p>National major earnings describe a separate population; do not join them to these colleges as if they measured each institution’s graduates.</p>'
source_page += '<p>Original publisher: <a href="' + esc(meta['sources']['scorecard']['page']) + '">U.S. Department of Education College Scorecard</a>. The downloaded CSV and metadata above are saved on this backup site; the publisher is a separate online service.</p><a class="button" href="./#work">Continue my data audit →</a></section></main></body></html>'
write('python/class-06-lab/college-source.html', source_page)

def update_catalog(cat):
    course = next(c for c in cat['courses'] if c['id'] == 'python')
    deck = next(d for d in course['decks'] if d['id'] in ('class-06', 'class-06-lab'))
    deck.update(id='class-06-lab', title='Your Question. Your Data. · Research Clinic',
                summary='Work on your own research question and dataset. Use AI to inspect data, verify each decision, and save your L06 audit. Includes Handout 6, topic packs and notebook cells.',
                status='ready', noPdf=True, tags=['Python','research','data audit','Class 6'])
    return cat

# Preserve later releases: update just this lesson in the destination catalog.
# The pinned catalog is only the fallback when building a fresh directory.
catalog_source = OUT / 'catalog.json' if (OUT / 'catalog.json').is_file() else INPUT / 'catalog.json'
cat = update_catalog(json.loads(catalog_source.read_text()))
write('catalog.json', json.dumps(cat, ensure_ascii=False, indent=2)+'\n')
root_source = OUT / 'index.html' if (OUT / 'index.html').is_file() else INPUT / 'index.html'
root = root_source.read_text()
m = re.search(r'window.CATALOG=(.*?);</script>', root, re.S)
if not m:
    raise ValueError('Missing original inline catalog')
inline = update_catalog(json.loads(m.group(1)))
root = root[:m.start(1)] + json.dumps(inline, ensure_ascii=False, separators=(',',':')) + root[m.end(1):]
root = re.sub(r'<script\b[^>]*src="[^"]*/assets/(?:auth|guide-analytics|asg-badges)\.js"[^>]*></script>', '', root)
banner = '<section aria-label="Class 6 backup" style="padding:1.25rem;margin:1rem 0;border:2px solid #134d45;border-radius:12px;background:#edf5ed"><h2 style="margin-top:0">Class 6 · Your question. Your data.</h2><p>Personal research clinic: choose a question, open your data, and verify an AI-assisted audit.</p><p><a href="python/class-06-lab/">Open student work page →</a> · <a href="python/handout-06/">Handout 6</a> · <a href="python/handout-06/Handout_06_Research_Clinic.pdf">Download PDF</a></p></section>'
if '<section aria-label="Class 6 backup"' in root:
    root = re.sub(r'<section aria-label="Class 6 backup".*?</section>', lambda m: banner, root, count=1, flags=re.S)
else:
    root = root.replace('<main class="wrap">', '<main class="wrap">' + banner)
write('index.html', root)
print('Built Class 6, college source notes and catalog. Render the handout PDF separately.')
