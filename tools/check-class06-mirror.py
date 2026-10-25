#!/usr/bin/env python3
"""Check the saved release, relative links and public-only publication scope.

This complements, not replaces, the browser outage test and live Pages check.
Requires PyMuPDF for the PDF check.
"""
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlparse, unquote
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://cnpcshangbo.github.io/meritpoint-slides/'
manifest = json.loads((ROOT / 'tools/class06-provenance.json').read_text())
errors = []

for kind, prefix in [('inputs', 'tools/class06-inputs/'), ('outputs', '')]:
    for rel, info in manifest[kind].items():
        path = ROOT / (prefix + rel)
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != info['sha256']:
            errors.append(f'{kind} missing or changed: {rel}')

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls = []; self.ids = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs: self.ids.add(attrs['id'])
        for name in ['href','src','poster']:
            if name in attrs: self.urls.append((tag, name, attrs[name]))

pages = [p for p in manifest['outputs'] if p.endswith('.html') and p != 'index.html']
for rel in pages:
    text = (ROOT / rel).read_text()
    parser = Links(); parser.feed(text)
    page_url = BASE + rel
    for tag, attr, raw in parser.urls:
        if raw.startswith(('data:','mailto:','javascript:')): continue
        url = urlparse(urljoin(page_url, raw))
        if url.netloc == 'cnpcshangbo.github.io':
            if not url.path.startswith('/meritpoint-slides/'):
                errors.append(f'Wrong Pages prefix: {rel}: {raw}'); continue
            target = ROOT / unquote(url.path[len('/meritpoint-slides/'):])
            if target.is_dir(): target = target / 'index.html'
            if not target.is_file(): errors.append(f'Broken local link: {rel}: {raw}')
            elif url.fragment and target.suffix == '.html':
                dest = Links(); dest.feed(target.read_text())
                if unquote(url.fragment) not in dest.ids:
                    errors.append(f'Missing anchor: {rel}: {raw}')
        if tag != 'a' and (url.hostname or '').endswith('hopeembark.org'):
            errors.append(f'VPS runtime dependency: {rel}: {raw}')
    if re.search(r'(?:fetch\s*\(|XMLHttpRequest|sendBeacon\s*\()[^\n]{0,100}/api/', text):
        errors.append(f'Backend API script remains: {rel}')

for rel in ['python/class-06-lab/L06_data_audit.py','python/class-06-lab/L06_data_audit.ipynb','python/class-05-lab/colleges.csv','python/class-05-lab/dataset-metadata.json']:
    if (ROOT / rel).read_bytes() != (ROOT / 'tools/class06-inputs' / rel).read_bytes():
        errors.append(f'Unchanged public source must match: {rel}')
nb = json.loads((ROOT / 'python/class-06-lab/L06_data_audit.ipynb').read_text())
if any(c.get('outputs') or c.get('execution_count') is not None for c in nb['cells']):
    errors.append('Notebook includes execution output')

pdf = pymupdf.open(ROOT / 'python/handout-06/Handout_06_Research_Clinic.pdf')
if len(pdf) != 3: errors.append(f'Handout has {len(pdf)} pages, expected 3')
pdf_links = [l['uri'] for p in pdf for l in p.get_links() if 'uri' in l]
if len(pdf_links) != 10: errors.append('Unexpected PDF link count')
if any('courses.hopeembark.org' in l or 'localhost' in l for l in pdf_links):
    errors.append('PDF still points to VPS/local preview')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(manifest["outputs"])} output hashes, {len(pages)} page-link checks, source downloads and three-page PDF.')
