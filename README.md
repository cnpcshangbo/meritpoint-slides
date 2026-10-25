# MeritPoint slides — static backup mirror

**Live mirror:** https://cnpcshangbo.github.io/meritpoint-slides/

Backup of published student course materials at courses.hopeembark.org, for use
when the primary server is unreachable during class. The catalog includes older
course releases; a working mirror of one lesson does not mean every newer lesson
has been copied.

## Class 6 · Personal research clinic

- [Student work page](https://cnpcshangbo.github.io/meritpoint-slides/python/class-06-lab/)
- [Handout](https://cnpcshangbo.github.io/meritpoint-slides/python/handout-06/)
- [Three-page PDF](https://cnpcshangbo.github.io/meritpoint-slides/python/handout-06/Handout_06_Research_Clinic.pdf)

The student page, four quick checks, browser notes, export/restore, topic-pack
reading, college CSV and notebook downloads work without the course VPS.
VPS and Pages use separate browser storage: download the JSON backup on one site
and restore it on the other. Python cells run in the student's existing Python
environment or Colab, not on this work page.

Topic packs retain their educational content and local activities. Server-backed
comments, account controls, generated abstracts/figures and hosted videos are
omitted from these static copies. AI tools and dataset publishers remain separate
online services. Teacher outlines, individual student records and Zoom/Classroom
evidence are excluded.

## Rebuild this release

Reviewed public inputs are pinned in `tools/class06-inputs/`. They are public
student pages and source data, never learner exports or authenticated responses.
`tools/class06-provenance.json` records hashes, source URLs and the output scope.
Edit the transformation/source inputs, then regenerate; do not patch generated
HTML alone.

The guide transform uses Python 3 with `beautifulsoup4`; the checker uses
`PyMuPDF`. The PDF renderer uses Node with `puppeteer-core` and an installed
Chrome browser.

```sh
python3 tools/mirror-class06.py
python3 tools/mirror-class06-guides.py
# Requires Node, puppeteer-core and Chrome; set NODE_PATH/CHROME_PATH if needed.
node tools/render-class06-pdf.cjs
python3 tools/check-class06-mirror.py
```

After an intentional, reviewed update, refresh the manifest with
`python3 tools/record-class06-provenance.py` before running the checker.
The manifest records content; it does not replace review or browser testing.

## Every future student-material release

1. Publish only reviewed public student files. Keep private instructor notes,
   rosters, submissions, recordings, credentials and browser state outside Git.
2. Update the corresponding Pages mirror in a scoped branch and PR. Include
   the HTML, assets, handout/PDF, data and downloads needed for the lesson.
   Do not run a whole-site `rsync --delete` or the old broad `deploy-mirror.sh`.
3. Rewrite internal links for `/meritpoint-slides/`, including PDF annotations.
   Remove or clearly explain server-only features. Preserve unrelated lessons.
4. Serve at the real project prefix and test with every HopeEmbark host blocked.
   Check navigation, activities, downloads, mobile layout and PDF page count.
5. Review the exact diff, merge the scoped PR, wait for Pages to build that commit,
   then verify public URLs, delivered hashes and the core student interactions.
   Include the backup URL in the publication handoff. A release is not fully
   verified until this backup check passes.

This is resilience against a VPS outage, not a promise of full Internet-offline
operation. Existing older lessons can have their own external dependencies.
