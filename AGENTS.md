# Student course mirror

Follow README.md's publication checklist for every future student-material
release. The user requires a working GitHub Pages mirror so a VPS outage does
not stop class.

- Preserve unrelated pages. Use a scoped branch/PR and explicit file staging.
- Only mirror reviewed public student material. Never copy private teacher
  outlines, profiles, submissions, Zoom/Classroom evidence, secrets or local state.
- Change source inputs/transformations, then regenerate static deliverables.
- Include PDFs, notebooks, source definitions and needed data, not just HTML.
- Test under /meritpoint-slides/ with HopeEmbark hosts blocked. Check the live
  Pages build after publishing. Report any remaining external dependencies.
- Do not run the historical broad deploy-mirror.sh or delete other lessons.
