#!/usr/bin/env python3
"""Build Class 6's static supporting guides from pinned, public HTML snapshots.

Requires Python 3 and beautifulsoup4. No network access is performed.
Usage: python tools/mirror-class06-guides.py
    [--input-dir tools/class06-inputs --output-dir .]
    [--report /external/path/report.json]

Only the eight paths in INPUT_SHA256 are written. The snapshots were fetched
without authentication from https://courses.hopeembark.org on 2026-10-25.
They contain public teaching content, never API responses or student state.
Keep the input hashes pinned when reproducing this reviewed mirror.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from bs4 import BeautifulSoup


BASE = "/meritpoint-slides/"
ORIGIN = "https://cnpcshangbo.github.io"
INPUT_SHA256 = {
    "guides/biomedical-ai/index.html": "8f3a02ca808330756572b7306b2effd9cf403317e39e6c6940f1a0bb816714d9",
    "guides/cybersecurity-datasets/index.html": "cc37f85dfd2c834e072e28a5534aae047b4675c147a1a234213f59c6f62b737f",
    "guides/dental-research/index.html": "e095c0e56f7581d4252e7a206b4b3ace11071c103be4c704a424c43bd8301c61",
    "guides/download-right-data/index.html": "08d7e8dfa2ff8b34b906f6a6d05c7b9c56b0a6d16d11fdaf269ed393f2d53bf3",
    "guides/health-datasets/index.html": "7c69b9acb2f734289c74611f088421a74e85d8e1aef3b2799368d0fcfab8cef1",
    "guides/video-game-research/index.html": "5f3ff5f21f6d64540b386aa722524909e5ba56aaacfa88f8c6fcfa99d8abfbbd",
    "python/research/index.html": "cae03532be062ad21f3de7c28adce7e5479c809675a44288566d7bcbc226e87d",
    "python/research/zh/index.html": "fbb907ed411d42ae20b93ef04787ab74bbe70246bb8456a7d3d90399944f1108",
}

NOTICE = """<aside class="class06-mirror-notice" aria-label="Static backup">
<a href="/meritpoint-slides/python/class-06-lab/">← Class 6 research clinic</a>
<p>Static backup: teaching text, local filters and quick checks stay available here.
Videos, comments and server-generated drafts are omitted. Dataset publisher links
still need internet access. Browser progress is saved separately on each site.</p>
</aside>"""

NOTICE_STYLE = """.class06-mirror-notice{box-sizing:border-box;max-width:1120px;
margin:16px auto;padding:14px 18px;border:1px solid #9cb7af;border-radius:10px;
background:#edf5ed;color:#173e38;font:15px/1.5 system-ui,sans-serif}
.class06-mirror-notice a{color:#07564b;font-weight:700}
.class06-mirror-notice p{margin:6px 0 0}
.class06-video-note{padding:14px;border:1px solid #a8bdb5;border-radius:8px;
background:#f0f5f0;color:#173e38}
@media(max-width:700px){.class06-mirror-notice{margin:12px}}
"""

LANGUAGE_SCRIPT = """(function(){
  var button=document.getElementById('langToggle');if(!button)return;
  var key='CLASS06_LANGUAGE_KEY',requested=new URLSearchParams(location.search).get('lang'),stored='en';
  try{stored=localStorage.getItem(key)||'en';}catch(error){}
  var lang=requested==='en'||requested==='zh'?requested:(stored==='zh'?'zh':'en');
  function apply(next,persist){
    lang=next==='zh'?'zh':'en';document.body.dataset.lang=lang;
    document.documentElement.dataset.lang=lang;document.documentElement.lang=lang==='zh'?'zh-CN':'en';
    document.querySelectorAll('[data-en][data-zh]').forEach(function(el){el.textContent=el.dataset[lang];});
    document.querySelectorAll('[data-ph-en][data-ph-zh]').forEach(function(el){el.placeholder=lang==='zh'?el.dataset.phZh:el.dataset.phEn;});
    button.textContent=lang==='en'?'中文':'English';
    button.setAttribute('aria-label',lang==='en'?'切换到中文':'Switch to English');
    if(persist!==false){try{localStorage.setItem(key,lang);}catch(error){}}
    if(window.refreshBiomedicalQuestions)window.refreshBiomedicalQuestions();
    (window.refreshCyberFilters||[]).forEach(function(refresh){refresh();});
  }
  button.addEventListener('click',function(){apply(lang==='en'?'zh':'en');});apply(lang,false);
})();"""


def mirror_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.netloc == "courses.hopeembark.org":
        return urlunsplit(("", "", BASE + parsed.path.lstrip("/"), parsed.query, parsed.fragment))
    if value.startswith("/") and not value.startswith(("//", BASE)):
        return BASE + value.lstrip("/")
    return value


def rewrite_script(text: str) -> str:
    # Research-track cards are rendered from a local JSON object in a script.
    text = text.replace("https://courses.hopeembark.org/", ORIGIN + BASE)
    return re.sub(r'''(["'])/(python|guides|assets|ai-toolbox)/''',
                  lambda m: m[1] + BASE + m[2] + "/", text)


def transform(raw: str, relative: str) -> tuple[str, dict]:
    soup = BeautifulSoup(raw, "html.parser")
    removed = {"service_widgets": 0, "service_scripts": 0, "videos": 0}
    # Public teaching text remains; no API-derived state is fetched or copied.
    for node in soup.select(".section-comments,.topic-actions,.interest-note,#abstractDialog,#figureDialog"):
        node.decompose()
        removed["service_widgets"] += 1
    for node in soup.select("#video-tour,.vidbox"):
        note = soup.new_tag("p", attrs={"class": "class06-video-note"})
        if node.get("id"):
            note["id"] = node["id"]
        note.string = "The video tour is omitted from this backup. Use the written guide and dataset links below."
        node.replace_with(note)
        removed["videos"] += 1
    for link in soup.select('header a[href^="https://academic.hopeembark.org/assignments"]'):
        link["href"] = BASE + "python/class-06-lab/"
        link.string = "Class 6 clinic · 第六课"
    replace_language = False
    for script in list(soup.find_all("script")):
        text = script.get_text()
        service = script.has_attr("src") or re.search(
            r"fetch\s*\(|XMLHttpRequest|sendBeacon|MeritPointPublicVideo|/api/", text)
        if service:
            replace_language |= "langToggle" in text
            script.decompose()
            removed["service_scripts"] += 1
        else:
            script.string = rewrite_script(text)
    if replace_language:
        script = soup.new_tag("script")
        script.string = LANGUAGE_SCRIPT.replace("CLASS06_LANGUAGE_KEY", "mpa_" + relative.split("/")[1] + "_mirror_lang")
        soup.body.append(script)
    # These are presentation-only references. API actions have already been removed.
    for node in soup.find_all(True):
        for attr in ("href", "src", "poster", "action"):
            if node.has_attr(attr):
                node[attr] = mirror_url(node[attr])
        if node.name == "meta" and node.get("content", "").startswith("https://courses.hopeembark.org/"):
            node["content"] = ORIGIN + mirror_url(node["content"])
        if node.name == "link" and "canonical" in node.get("rel", []):
            node["href"] = ORIGIN + BASE + relative.removesuffix("index.html")
    style = soup.new_tag("style")
    style.string = NOTICE_STYLE
    soup.head.append(style)
    notice = BeautifulSoup(NOTICE, "html.parser").aside
    soup.body.insert(0, notice)
    # Fail closed if a new source snapshot unexpectedly adds another server widget.
    assert not soup.select("video,iframe,form[action],.section-comments,.abstract-btn,.figure-btn")
    assert all(not re.search(r"fetch\s*\(|XMLHttpRequest|sendBeacon|/api/", s.get_text()) for s in soup.find_all("script"))
    output = str(soup) + "\n"
    assert "https://courses.hopeembark.org" not in output
    return output, removed


def build(input_dir: Path, output_dir: Path) -> dict:
    prepared = []
    for relative, expected in INPUT_SHA256.items():
        raw = (input_dir / relative).read_bytes()
        actual = hashlib.sha256(raw).hexdigest()
        if actual != expected:
            raise ValueError(f"Public input hash differs: {relative}: {actual}")
        rendered, removed = transform(raw.decode("utf-8"), relative)
        prepared.append((relative, rendered, removed))
    report = {"source": "https://courses.hopeembark.org/", "snapshot_date": "2026-10-25",
              "mirror_base": BASE, "network_used": False, "files": []}
    for relative, rendered, removed in prepared:
        target = output_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered, encoding="utf-8")
        report["files"].append({"path": relative, "input_sha256": INPUT_SHA256[relative],
                                "output_sha256": hashlib.sha256(rendered.encode()).hexdigest(),
                                "bytes": len(rendered.encode()), "removed": removed})
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    repository = Path(__file__).resolve().parent.parent
    parser.add_argument("--input-dir", type=Path, default=repository / "tools/class06-inputs")
    parser.add_argument("--output-dir", type=Path, default=repository)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    report = build(args.input_dir, args.output_dir)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"built": len(report["files"]), "output": str(args.output_dir)}))


if __name__ == "__main__":
    main()
