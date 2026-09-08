# Fresh Template Recovery Milestones

Scope: templates `21-Edge` through `38-Cove` unless stated otherwise.

## M10 - Fresh Cover Integrity

Goal: Every Fresh title page renders cleanly and professionally without legacy leftovers, collisions, or missing structure.

- [ ] Audit all title pages from `21-Edge` through `38-Cove`
- [ ] Remove unintended legacy/default eyebrow copy from Fresh templates
- [ ] Ensure unexpected placeholder/default copy never appears unless explicitly entered by the user
- [ ] Define one canonical Fresh cover title hierarchy
- [ ] Keep `Bewerbung um eine Lehrstelle als` readable as one logical kicker
- [ ] Prevent `ALS` from overlapping the profession/title
- [ ] Ensure profession/title never overlaps kicker
- [ ] Ensure name never overlaps profession/title
- [ ] Ensure Lehrbeginn never overlaps name/title
- [ ] Ensure photo never covers important text
- [ ] Ensure contact information remains readable
- [ ] Ensure recipient/company information remains readable
- [ ] Ensure structural background shapes render correctly
- [ ] Preserve each template's unique visual identity
- [ ] Keep templates 1-20 visually unchanged
- [ ] Add automated regression coverage for all 18 Fresh cover templates
- [ ] Verify `21-Edge`
- [ ] Verify `22-Glow`
- [ ] Verify `23-Frame`
- [ ] Verify `24-Mono Luxe`
- [ ] Verify `25-Horizon`
- [ ] Verify `26-Sunrise`
- [ ] Verify `27-Forest Flow`
- [ ] Verify `28-Violet Pulse`
- [ ] Verify `29-Studio 2`
- [ ] Verify `30-Studio 3`
- [ ] Verify `31-Warm 2`
- [ ] Verify `32-Warm 3`
- [ ] Verify `33-Ledger`
- [ ] Verify `34-Prism`
- [ ] Verify `35-Gallery`
- [ ] Verify `36-Orbit`
- [ ] Verify `37-Ribbon`
- [ ] Verify `38-Cove`

## M11 - Fresh Motivation Letter Integrity

Goal: Fresh templates remain recognisable in the motivation letter without decorative shapes interfering with letter content.

- [ ] Audit motivation letters for all templates 21-38
- [ ] Remove large decorative rectangles from the letter reading area
- [ ] Prevent decorative shapes from covering sender information
- [ ] Prevent decorative shapes from covering recipient information
- [ ] Prevent decorative shapes from covering date
- [ ] Prevent decorative shapes from covering subject
- [ ] Prevent decorative shapes from covering letter body
- [ ] Prevent decorative shapes from covering greeting/signature
- [ ] Define a dedicated quiet letter signature for every Fresh template
- [ ] Keep Fresh letter motifs primarily at page edges / header / footer
- [ ] Do not reuse expressive cover geometry directly inside letters
- [ ] Ensure `Brief` remains completely white and neutral
- [ ] Fix Fresh templates falling back to legacy `klassisch` geometry
- [ ] Make Fresh letter margins explicit instead of relying on CV fallback logic
- [ ] Ensure template colors still carry across correctly
- [ ] Ensure typography still carries across correctly
- [ ] Ensure header/footer settings remain compatible with every Fresh template
- [ ] Add automated guards against decorative elements intersecting the letter content box
- [ ] Verify all 18 Fresh motivation letters visually

## M12 - Dossier Consistency 21-38

Goal: Title page, motivation letter and CV should clearly belong to the same dossier without copying inappropriate geometry between document types.

- [ ] Define one visual identity contract per Fresh template
- [ ] Cover = expressive version
- [ ] Letter = restrained version
- [ ] CV = information-focused version
- [ ] Keep palette consistent across all three document types
- [ ] Keep typography family consistent across all three document types
- [ ] Keep recurring motif recognisable across all three document types
- [ ] Avoid identical full-page geometry where it harms readability
- [ ] Verify Header/Footer synchronization between CV and motivation letter
- [ ] Verify compact header mode
- [ ] Verify contact header mode
- [ ] Verify no-header mode
- [ ] Verify compact footer mode
- [ ] Verify detailed footer mode
- [ ] Verify no-footer mode
- [ ] Ensure CV never displays `Seite 2` as its continuation header
- [ ] Ensure continuation pages remain visually related to page 1
- [ ] Ensure no hidden legacy template behaviour leaks into Fresh templates

## M13 - 38-Template Visual Acceptance Gate

Goal: A template is not considered finished merely because the application builds or the PDF contains text.

- [ ] Generate complete dossier PDFs for all 38 templates
- [ ] Store deterministic gallery output with numbered filenames
- [ ] Review title page of every PDF visually
- [ ] Review motivation letter of every PDF visually
- [ ] Review CV page 1 of every PDF visually
- [ ] Review CV continuation pages where present
- [ ] Check for overlapping text
- [ ] Check for clipped text
- [ ] Check for accidental placeholder/default copy
- [ ] Check for decorative objects inside reading areas
- [ ] Check for unexpected white backgrounds
- [ ] Check for missing template motifs
- [ ] Check for inconsistent colors
- [ ] Check for inconsistent fonts
- [ ] Check for broken header/footer rendering
- [ ] Check A4 page boundaries
- [ ] Check PDF export against editor preview
- [ ] Reject the release if any template has a visible layout defect
- [ ] Record visual acceptance for templates 1-20
- [ ] Record visual acceptance for templates 21-38

## M14 - Regression Hardening

Goal: The same class of defect should not return after future template or renderer work.

- [ ] Add Fresh template IDs to one canonical shared registry
- [ ] Remove duplicated Fresh template ID lists where practical
- [ ] Separate cover geometry from letter geometry explicitly
- [ ] Separate letter geometry from CV geometry explicitly
- [ ] Avoid DOM-child-position selectors where a semantic data attribute can be used
- [ ] Add semantic markers to structural template shapes
- [ ] Test that Fresh cover background structure exists
- [ ] Test that Fresh letter background remains non-invasive
- [ ] Test title hierarchy does not overlap with sample content
- [ ] Test no unexpected default copy appears
- [ ] Test all 38 templates can render and export
- [ ] Run unit tests
- [ ] Run formatting
- [ ] Run typecheck
- [ ] Run lint
- [ ] Run production build
- [ ] Run browser regression suite
- [ ] Run complete dossier PDF gallery
- [ ] Complete final visual review
- [ ] Merge only after all release gates are green
