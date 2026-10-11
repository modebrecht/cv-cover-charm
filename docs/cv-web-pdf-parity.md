# CV Web/PDF parity migration

Authoritative branch: `dev`. Start: `da7d3da122b82aa7fd8bc730ce9e2e61167e0894`.
The starting working tree was clean; M6 Release Candidate and all browser/Web
gallery checks were successful. `main` and `render` are outside this migration.

## Package 1 — local theme contract

`dossierThemeCssVariables()` derives all 28 existing custom properties without
reading or changing the document. `applyDossierTheme()` retains its legacy API
and applies that same contract globally. `CvCanvas` supplies the contract in its
initial React style props, inherited by measurement, preview and export pages.
Explicit font choices remain authoritative. No theme mutation is necessary for
hidden CV rendering.

Validation: 1,091 unit tests; 128 browser tests from `cv-pdf`,
`cv-m9-pagination`, `templates-layout`, `fresh-dossier-templates`, and
`dossier-flow`; typecheck, lint, production build, and changed-file formatting
all passed. Unit coverage compares all family contracts to legacy writes and
renders a hidden CV while rejecting global dossier-theme writes.

Next dependency: CV template rules still activate through
`html[data-dossier-template]`; layout/photo getters still write global
presentation state. Packages 2 and 3 own those migrations.
