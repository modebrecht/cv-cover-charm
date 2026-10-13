# DOCX Next font matrix — 13 October 2026

Authoritative source: `dev`, fetched before work; source SHA
`1f4696ee520724466457dacbecc19fffe34ff1ff`.
Work branch: `qa/docx-font-matrix-13okt`. Root `AGENTS.md` read; initial
working tree clean. Published history is preserved. No merge or deployment.

## Acceptance status

In progress at the first QA commit: all 1,092 production packages and all
39 template model matrices pass. Native render/Save/Reopen and branch CI
are running; final evidence and classification will be recorded in a
documentation follow-up after these gates finish.

**WORD ACCEPTANCE: UNVERIFIED**

Microsoft Word is unavailable in this environment. LibreOffice is an
independent interoperability test, not Word acceptance. Masterlist 25
remains open. No embedded fonts or proprietary font files are distributed.

## Existing policy inventory

| Owner                           | Existing behavior                                                                                                          | Previous evidence                                   | New acceptance work                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/lib/docx-next/fonts.ts`    | Eight explicit keys, allowed family definitions, deterministic supplied inventory, unknown-font errors, disabled embedding | Font-policy unit tests and five Brief font fixtures | All keys across all 39 templates, primary available/unavailable, unknown target retained |
| `build-model.ts`                | Resolves fonts before XML; logical part, role, canonical field and chrome ownership                                        | Brief rich text/CV/letter/chrome tests              | Default/user/mixed/header/footer/long/sidebar ownership; input immutability              |
| `styles.ts`                     | Font table from native runs; declared `altName`, family and pitch; theme defaults                                          | Brief package assertions                            | Independent XML parse of every generated package                                         |
| `native-text.ts`, `renderer.ts` | `w:rFonts` on native runs; bold/italic per run; one shared renderer; package/model validators                              | Existing DOCX Next suite                            | Every source paragraph/run checked against actual DOCX bytes                             |
| Portable input JSON             | Carries authored input only; resolver has no fetch or browser font discovery                                               | Brief JSON determinism                              | Source and model immutability and byte-identical packages after JSON restoration         |

| Application key | Requested family | Declared alternative   |
| --------------- | ---------------- | ---------------------- |
| `sans`          | Arial            | Liberation Sans        |
| `serif`         | Georgia          | Liberation Serif       |
| `times`         | Times New Roman  | Liberation Serif       |
| `humanist`      | Verdana          | DejaVu Sans            |
| `freundlich`    | Trebuchet MS     | Liberation Sans        |
| `schmal`        | Arial Narrow     | Liberation Sans Narrow |
| `maschine`      | Courier New      | Liberation Mono        |
| `plakativ`      | Impact           | DejaVu Sans            |

The web's Cabin key (`freundlich`) requests Trebuchet MS in Word-oriented
output. Supplying only Liberation Sans resolves that request before rendering.
With unknown target availability, the requested name remains in OOXML and the
model records `availability: target-application`. `w:altName` is metadata, not
a promise that a particular application will select that font. If neither
requested nor declared alternative exists in a supplied inventory, generation
fails. Unknown keys/families fail explicitly; they do not switch to Arial.

Fallback families retain their own classification: DejaVu Sans is `swiss`
even as an Impact alternative; Liberation Mono is `modern`/`fixed`;
Liberation Serif is `roman`/`variable`. The package explicitly disables
TrueType embedding and contains no font payload/embedding relationship.

## Full registry coverage

The authoritative `NEXT_TEMPLATES` registry equals the 39 active picker
templates. Retired `warm4` and `warm5` remain excluded.

28 configurations per template, 1,092 real production packages:

- Default font selection with unknown availability and supplied alternatives.
- Eight user-selected keys with supplied primary fonts; eight with only alternatives.
- Mixed faces in the same document, with canonical CV field, letter subject,
  body, header and footer overrides; requested and supplied-fallback variants.
- Long CV and long letter, each with requested/fallback variants.
- Sidebar left/right, each with requested/fallback variants. Existing
  supported Sidebar composition excludes running CV headers; no diagnostic
  renderer bypass is enabled to force unsupported combinations through.

Every package is re-rendered from JSON-restored input and compared byte for
byte. All 1,092 native packages pass the existing ZIP/content-type/relationship/
section/package checks and independent font assertions:

- `w:rFonts` ASCII/Unicode ownership agrees with the font table and model.
- Every source paragraph's actual native runs retain their text, font, bold and italic.
- Font table names, `w:altName`, family and pitch agree with allowed definitions.
- No duplicates, unsupported families, embedded font payload or implicit font substitution.

Real LibreOffice coverage comprises 12 representative configurations per
template (468 packages), including all eight families inside each mixed
document. The other 16 configurations per template test deterministic OOXML
selection; they do not pretend proprietary primary fonts are installed.
German Unicode/accented text and strong/emphasis combinations appear in
native paragraphs and rich-text table cells. Every source word's multiplicity,
unique font probes, actual PDF font spans, native saved font ownership, page
counts and probe coordinates are checked/recorded before and after Save/Reopen.
Matching page counts do not count as typography equivalence.

## Before/after

Production font selection and geometry are unchanged. This package adds
acceptance fixtures, deterministic regression tests, an independent package/
LibreOffice harness and a scoped CI workflow. It also corrects the stale
font inventory documentation that still said only Brief was configured.
No template-specific exceptions, XML replacement passes, font loaders,
pagination fixes or screenshot-driven template changes are introduced.

## Validation and CI

| Gate                                                      | Status at first QA commit                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Existing font-policy/active-registry tests                | 13 pass                                                              |
| New 39-template font matrix                               | 41 pass; 1,092 configurations                                        |
| Entire unit suite                                         | 1,159 pass, 0 fail                                                   |
| TypeScript                                                | Pass                                                                 |
| Independent actual OOXML package inspection               | 1,092 pass                                                           |
| Existing LibreOffice stable-sidebar/package QA unit tests | 7 pass                                                               |
| Production build                                          | Pass                                                                 |
| Lint                                                      | Pass; 21 existing warnings, no errors                                |
| Release formatting                                        | Pass                                                                 |
| Added/edited files formatting and `git diff --check`      | Pass                                                                 |
| Global formatting                                         | Baseline failure: same 151 files on untouched source and QA worktree |
| Native LibreOffice render/Save/Reopen                     | Running                                                              |
| New branch font CI                                        | Pending push                                                         |

Source CI: Dossier Regression, Dossier Web Gallery and Template Contact
Integrity succeeded; 25 successful check runs and one intentionally skipped
native benchmark. Source M6 Release Candidate status is success. Existing
workflow branch filters exclude this new QA branch, so a dedicated font
workflow runs the applicable unit/type/lint/build/package/native gates without
changing shared PDF/browser workflows or deploying anything.

Local stable 25.8.7.3 runtime setup could not start because apt privilege
operations are blocked in this managed environment. The supplied runtime is
LibreOfficeDev 26.8.0.0.alpha0, build
`2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Its results will be labeled as such.
The branch workflow separately tests stable distribution LibreOffice and
records its actual version and public fallback font-file hashes. No old
stable-engine typography baseline is relabeled as a new pass.

## Remaining blockers and recommendation

Final automated classification awaits the native/CI measurements. Word on
Windows/macOS, installed/unavailable primary fonts, editing reflow and
approved Word reference snapshots remain unverified. Font alternatives can
change metrics and display-face appearance; unknown target applications may
choose a further substitute. Existing Sidebar layout/identity limitations are
separate architecture work and are not accepted by this font package.

Masterlist 17 and 31: this work covers automated policy/package/font fallback
acceptance, not universal application typography or Microsoft Word approval.
Masterlist 25 remains open. Do not merge until the final native/CI evidence is
recorded. No merge was requested or performed.
