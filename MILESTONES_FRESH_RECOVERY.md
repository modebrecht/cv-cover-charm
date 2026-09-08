# NEW MILESTONES — FRESH TEMPLATE RECOVERY

## M10 — Fresh Cover Integrity (Templates 21–38)

Goal: Every Fresh title page renders cleanly and professionally without legacy leftovers, collisions, or missing structure.

- [x] Audit all title pages from `21-Edge` through `38-Cove`
- [x] Remove unintended legacy/default eyebrow copy from Fresh templates
- [x] Ensure text such as `Hallo, schön Sie kennenzulernen` never appears unless explicitly entered by the user
- [x] Define one canonical Fresh cover title hierarchy
- [x] Keep `Bewerbung um eine Lehrstelle als` readable as one logical kicker
- [x] Prevent `ALS` from overlapping the profession/title
- [x] Ensure profession/title never overlaps kicker
- [x] Ensure name never overlaps profession/title
- [x] Ensure Lehrbeginn never overlaps name/title
- [x] Ensure photo never covers important text
- [x] Ensure contact information remains readable
- [x] Ensure recipient/company information remains readable
- [x] Ensure structural background shapes render correctly
- [x] Preserve each template's unique visual identity
- [x] Keep templates 1–20 visually unchanged
- [x] Add automated regression coverage for all 18 Fresh cover templates
- [x] Verify `21-Edge`
- [x] Verify `22-Glow`
- [x] Verify `23-Frame`
- [x] Verify `24-Mono Luxe`
- [x] Verify `25-Horizon`
- [x] Verify `26-Sunrise`
- [x] Verify `27-Forest Flow`
- [x] Verify `28-Violet Pulse`
- [x] Verify `29-Studio 2`
- [x] Verify `30-Studio 3`
- [x] Verify `31-Warm 2`
- [x] Verify `32-Warm 3`
- [x] Verify `33-Ledger`
- [x] Verify `34-Prism`
- [x] Verify `35-Gallery`
- [x] Verify `36-Orbit`
- [x] Verify `37-Ribbon`
- [x] Verify `38-Cove`

## M11 — Fresh Motivation Letter Integrity

Goal: Fresh templates remain recognisable in the motivation letter without decorative shapes interfering with letter content.

- [x] Audit motivation letters for all templates 21–38
- [x] Remove large decorative rectangles from the letter text area
- [x] Prevent decorative shapes from covering sender information
- [x] Prevent decorative shapes from covering recipient information
- [x] Prevent decorative shapes from covering date
- [x] Prevent decorative shapes from covering subject
- [x] Prevent decorative shapes from covering letter body
- [x] Prevent decorative shapes from covering greeting/signature
- [x] Define a dedicated quiet letter signature for every Fresh template
- [x] Keep Fresh letter motifs primarily at page edges / header / footer
- [x] Do not reuse expressive cover geometry directly inside letters
- [x] Ensure `Brief` remains completely white and neutral
- [x] Fix Fresh templates falling back to legacy `klassisch` geometry
- [x] Make Fresh letter margins explicit instead of relying on CV fallback logic
- [x] Ensure template colors still carry across correctly
- [x] Ensure typography still carries across correctly
- [x] Ensure header/footer settings remain compatible with every Fresh template
- [x] Add automated guards against large decorative elements intersecting the letter content box
- [x] Verify all 18 Fresh motivation letters visually

## M12 — Dossier Consistency 21–38

Goal: Title page, motivation letter and CV should clearly belong to the same dossier without copying inappropriate geometry between document types.

- [x] Define one visual identity contract per Fresh template
- [x] Cover = expressive version
- [x] Letter = restrained version
- [x] CV = information-focused version
- [x] Keep palette consistent across all three document types
- [x] Keep typography family consistent across all three document types
- [x] Keep recurring motif recognisable across all three document types
- [x] Avoid identical full-page geometry where it harms readability
- [x] Verify Header/Footer synchronization between CV and motivation letter
- [x] Verify compact header mode
- [x] Verify contact header mode
- [x] Verify no-header mode
- [x] Verify compact footer mode
- [x] Verify detailed footer mode
- [x] Verify no-footer mode
- [x] Ensure CV never displays `Seite 2` as its continuation header
- [x] Ensure continuation pages remain visually related to page 1
- [x] Ensure no hidden legacy template behaviour leaks into Fresh templates

## M13 — 38-Template Visual Acceptance Gate

Goal: A template is not considered finished merely because the application builds or the PDF contains text.

- [x] Generate complete dossier PDFs for all 38 templates
- [x] Store deterministic gallery output with numbered filenames
- [x] Review title page of every PDF visually
- [x] Review motivation letter of every PDF visually
- [x] Review CV page 1 of every PDF visually
- [x] Review CV continuation pages where present
- [x] Check for overlapping text
- [x] Check for clipped text
- [x] Check for accidental placeholder/default copy
- [x] Check for decorative objects inside reading areas
- [x] Check for unexpected white backgrounds
- [x] Check for missing template motifs
- [x] Check for inconsistent colors
- [x] Check for inconsistent fonts
- [x] Check for broken header/footer rendering
- [x] Check A4 page boundaries
- [x] Check PDF export against editor preview
- [x] Reject the release if any template has a visible layout defect
- [x] Record visual acceptance for templates 1–20
- [x] Record visual acceptance for templates 21–38

Acceptance record: the 39-PDF gallery from workflow run `34247101050` on implementation SHA `3fc262021bc1d49aba6173c0be1fb20e4fff073d` was reviewed across cover, motivation-letter and CV pages, including the Blockig continuation page. The gate initially rejected visible Studio cover clipping, invasive Blockig/Kolumne/Studio letter geometry and duplicated Citrus/Studio 2/Studio 3 CV raster text. Those defects were fixed, the complete gallery regenerated, and the corrected output was visually re-reviewed before M13 was closed.

## M14 — Regression Hardening

Goal: The same class of defect should not return after future template or renderer work.

- [x] Add Fresh template IDs to one canonical shared registry
- [x] Remove duplicated Fresh template ID lists where practical
- [x] Separate cover geometry from letter geometry explicitly
- [x] Separate letter geometry from CV geometry explicitly
- [x] Avoid DOM-child-position selectors where a semantic data attribute can be used
- [x] Add semantic markers to structural template shapes
- [x] Test that Fresh cover background structure exists
- [x] Test that Fresh letter background remains non-invasive
- [x] Test title hierarchy does not overlap with sample content
- [x] Test no unexpected default copy appears
- [x] Test all 38 templates can render and export
- [x] Run unit tests
- [x] Run formatting
- [x] Run typecheck
- [x] Run lint
- [x] Run production build
- [x] Run browser regression suite
- [x] Run complete dossier PDF gallery
- [x] Complete final visual review
- [x] Merge only after all release gates are green

Acceptance record: M14 was merged as PR `#56`. The branch validation passed `112/112` unit tests plus release formatting, TypeScript, lint and production build. Full PDF Gallery run `34253781839` verified exactly `39/39` unique dossier PDFs before promotion. After merge, exact main SHA `406f353169ea3d5142ca1a0d4612534dec73423d` passed the full Dossier Regression suite, all browser/PDF smoke groups, the `39/39` PDF Gallery, Vercel deployment and the `M6 Release Candidate` status. Fresh motivation-letter and CV contact sheets for templates 21–38 were also visually reviewed for clipping, overlap and cross-document motif leakage.