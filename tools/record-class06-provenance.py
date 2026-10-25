#!/usr/bin/env python3
"""Record this public release after review/build; only explicit student paths.

Do not use this to approve changed inputs automatically. Review their provenance
and diff first, then run the browser outage test against the resulting release.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT = ROOT / 'tools/class06-inputs'
core = [
    'python/class-06-lab/index.html', 'python/class-06-lab/clinic.css',
    'python/class-06-lab/clinic.js', 'python/class-06-lab/L06_data_audit.py',
    'python/class-06-lab/L06_data_audit.ipynb', 'python/handout-06/index.html',
    'python/class-05-lab/colleges.csv', 'python/class-05-lab/dataset-metadata.json',
]
guides = [f'guides/{name}/index.html' for name in ['video-game-research',
    'health-datasets','cybersecurity-datasets','biomedical-ai','dental-research',
    'download-right-data']] + ['python/research/index.html']
optional = ['python/research/zh/index.html']
guides += [rel for rel in optional if (INPUT / rel).is_file()]
inputs = core + guides + ['index.html','catalog.json']
outputs = core + guides + ['index.html','catalog.json',
    'python/class-06-lab/college-source.html',
    'python/handout-06/Handout_06_Research_Clinic.pdf',
    'assets/site.css','assets/site.js','assets/mpa-logo.png','assets/favicon.png']

def record(root, rel, source=False):
    path = root / rel
    data = path.read_bytes()
    result = {'sha256':hashlib.sha256(data).hexdigest(), 'bytes':len(data)}
    if source:
        result['source_url'] = ('https://cnpcshangbo.github.io/meritpoint-slides/' if rel in ['index.html','catalog.json'] else 'https://courses.hopeembark.org/') + rel
    return result

manifest = {
    'schema_version':1,
    'release':'class06-pages-2026-10-25',
    'mirror_base':'https://cnpcshangbo.github.io/meritpoint-slides/',
    'source_student_release':'platform-20261025-lesson06-clinic-02',
    'source_generator_commit':'f53f96a985bdb818c871a35137350a7cd8f8bfac',
    'original_mirror_commit':'e2859c3b579bc09e4bd44fc7b0b5e54c0a3ac3fe',
    'scope':'Public Class 6 work page, handout, topic packs, research hub, college snapshot, shared assets and catalog. No teacher notes or student records.',
    'inputs':{rel:record(INPUT,rel,True) for rel in inputs},
    'outputs':{rel:record(ROOT,rel) for rel in outputs},
}
(ROOT / 'tools/class06-provenance.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Recorded {len(inputs)} public inputs and {len(outputs)} output files.')
