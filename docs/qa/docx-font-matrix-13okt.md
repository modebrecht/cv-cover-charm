# DOCX Next font matrix — 13 October 2026

Authoritative source: `dev`, fetched before work; source SHA
`1f4696ee520724466457dacbecc19fffe34ff1ff`.
Work branch: `qa/docx-font-matrix-13okt`. Root `AGENTS.md` read; initial
working tree clean. Published history is preserved. No merge or deployment.

## Acceptance status

**A — Automated font-policy gates pass; Word acceptance separately pending.** All 39 templates pass the actual-package, controlled fallback, font ownership and Save/Reopen gates locally and on stable CI. No production font-policy defect was reproduced.

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
- Eight user-selected keys, including explicit canonical cover field overrides, with supplied primary fonts; eight with only alternatives.
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
- No duplicate definitions, unsupported families, embedding payload or implicit model fallback.

Real LibreOffice coverage comprises 12 representative configurations per
template (468 packages), including all eight families inside each mixed
document. The other 16 configurations per template test deterministic OOXML
selection; they do not pretend proprietary primary fonts are installed.
German Unicode/accented text and strong/emphasis combinations appear in
native paragraphs and rich-text table cells. Complete source paragraphs (including repeated occurrences) are checked in their logical body region; unused first/follow header variants are not counted twice. Unique font probes, actual PDF font spans/emphasis, native saved font ownership, page counts and probe coordinates are checked/recorded before and after Save/Reopen.
Matching page counts do not count as typography equivalence.

## Before/after

Production font selection and geometry are unchanged. This package adds
acceptance fixtures, deterministic regression tests, an independent package/
LibreOffice harness and a scoped CI workflow. It also corrects the stale
font inventory documentation that still said only Brief was configured.
No template-specific exceptions, XML replacement passes, font loaders,
pagination fixes or screenshot-driven template changes are introduced.

## Validation and CI

| Gate                                                      | Final measured status                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Existing font-policy/active-registry tests                | 13 pass                                                                     |
| New 39-template font matrix                               | 41 pass; 1,092 configurations                                               |
| Entire unit suite                                         | 1,159 pass, 0 fail                                                          |
| TypeScript                                                | Pass                                                                        |
| Independent actual OOXML package inspection               | 1,092 pass                                                                  |
| Existing LibreOffice stable-sidebar/package QA unit tests | 7 pass                                                                      |
| Production build                                          | Pass                                                                        |
| Lint                                                      | Pass; 21 existing warnings, no errors                                       |
| Release formatting                                        | Pass                                                                        |
| Added/edited files formatting and `git diff --check`      | Pass                                                                        |
| Global formatting                                         | Baseline failure: same 151 files on untouched source and QA worktree        |
| Local native LibreOffice render/Save/Reopen               | 468 pass; no lost text, changed font probes, page counts or probe positions |
| New branch font CI                                        | SUCCESS — both fast regressions and stable native matrix                    |

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

Classification: **A — Automated font-policy gates pass; Word acceptance separately pending.** Word on
Windows/macOS, installed/unavailable primary fonts, editing reflow and
approved Word reference snapshots remain unverified. Font alternatives can
change metrics and display-face appearance; unknown target applications may
choose a further substitute. Existing Sidebar layout/identity limitations are
separate architecture work and are not accepted by this font package.

Masterlist 17: automated mapping, metadata and controlled fallback gate passed. Masterlist 31: automated 39-template font matrix passed, with Word acceptance separately pending. Masterlist 25 remains open. Merge recommendation: accept this bounded QA/documentation package. It adds no production behavior or geometry change. No merge was requested or performed.

## Measured local results

The local engine is LibreOfficeDev 26.8.0.0.alpha0 (additional interoperability evidence, not a stable-engine certification). Its controlled inventory is exactly Liberation Sans, Liberation Sans Narrow, Liberation Serif, Liberation Mono and DejaVu Sans: 20 public faces with recorded SHA-256 hashes. Primary Microsoft families are absent. Unknown-target fixtures retain requested names; supplied-inventory fixtures actually render their selected alternatives. All eight CV font probes and rich-text/chrome emphasis keep their intended family/formatting.

- 106,392 native source paragraphs inspected in the 1,092 packages.
- 12,012 native PDF font probes inspected across initial and reopened renders.
- 468 saved DOCX files retain effective requested native font ownership.
- Zero missing source paragraphs, including their repeated occurrences.
- Zero Save/Reopen font-probe, page-count or measured probe-position changes. Coordinates are compared at the recorded precision of 0.0001 PDF points; this is probe evidence, not a whole-page screenshot or Word geometry acceptance.
- 44 of 234 requested/fallback pairs change page count. Unknown-target rendering uses application substitution, so these are measured substitution comparisons, not evidence that proprietary primary fonts were installed. Matching page counts in the other 190 pairs do not prove typography equivalence.

The following page counts are complete dossier counts on the local engine. Each numeric pair is requested-family/explicit-fallback. Every template has 28 inspected native packages and 12 passing local render/Save/Reopen configurations.

| Template    | Packages | Default pages | Long CV pages | Long letter pages | Native pass |
| ----------- | -------: | ------------: | ------------: | ----------------: | ----------: |
| aurora      |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| blockig     |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| brief       |       28 |         4 / 4 |         9 / 9 |             6 / 7 |     12 / 12 |
| citrus      |       28 |         4 / 4 |       10 / 10 |             9 / 8 |     12 / 12 |
| colorful    |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| cove        |       28 |         4 / 4 |       10 / 10 |             8 / 7 |     12 / 12 |
| diagonal    |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| edel        |       28 |         5 / 4 |       10 / 10 |             8 / 7 |     12 / 12 |
| edelDark    |       28 |         5 / 4 |       10 / 10 |             8 / 7 |     12 / 12 |
| edge        |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| forestFlow  |       28 |         4 / 4 |       10 / 10 |             9 / 8 |     12 / 12 |
| freundlich  |       28 |         4 / 4 |         9 / 9 |             7 / 7 |     12 / 12 |
| gallery     |       28 |         5 / 5 |       10 / 10 |             9 / 9 |     12 / 12 |
| glow        |       28 |         4 / 4 |       10 / 10 |             7 / 7 |     12 / 12 |
| horizon     |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| human       |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| klassisch   |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| ledger      |       28 |         4 / 4 |       10 / 10 |             8 / 7 |     12 / 12 |
| modern      |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| monoLuxe    |       28 |         5 / 4 |       10 / 10 |             8 / 8 |     12 / 12 |
| neon        |       28 |         4 / 4 |       10 / 10 |             9 / 8 |     12 / 12 |
| orbit       |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| pastell     |       28 |         5 / 4 |       10 / 10 |             8 / 7 |     12 / 12 |
| prism       |       28 |         4 / 4 |         9 / 9 |             6 / 7 |     12 / 12 |
| ribbon      |       28 |         5 / 5 |       10 / 10 |             9 / 9 |     12 / 12 |
| serioes     |       28 |         4 / 4 |       10 / 10 |             8 / 7 |     12 / 12 |
| sonne       |       28 |         4 / 4 |       10 / 10 |             8 / 7 |     12 / 12 |
| studio      |       28 |         5 / 5 |       10 / 10 |             9 / 9 |     12 / 12 |
| studio2     |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| studio3     |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| sunrise     |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| terracotta  |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| verlauf     |       28 |         4 / 4 |       10 / 10 |             9 / 8 |     12 / 12 |
| verlauf2    |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| verlauf3    |       28 |         4 / 4 |        10 / 9 |             7 / 7 |     12 / 12 |
| violetPulse |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| warm2       |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |
| warm3       |       28 |         5 / 5 |       10 / 10 |             9 / 9 |     12 / 12 |
| welle       |       28 |         5 / 5 |       10 / 10 |             8 / 9 |     12 / 12 |

## QA corrections and retained failures

No production defect or production change was required. Two bounded QA corrections were necessary:

1. The first completeness checker counted unused first/follow header variants twice and split tracked lettering into individual words. It now checks complete paragraphs within their logical body regions, including repeated paragraph multiplicity. Four real-PDF counterexamples cover tracking/unused-story acceptance and genuine body loss/repetition rejection. Existing tolerances and baseline snapshots are unchanged.
2. Stable Ubuntu QA initially lacked the declared Narrow family and later reported a Java startup warning. The environment now includes the public Narrow archive with a pinned archive digest and all four existing authoritative face hashes, plus LibreOffice Java/JRE dependencies. Warning/error rejection remains strict. The failed CI attempts are preserved as environment/checker evidence; they are not relabeled as font-policy passes.

The public Narrow archive is [the official LibreOffice source mirror](https://dev-www.libreoffice.org/src/liberation-narrow-fonts-ttf-1.07.6.tar.gz), SHA-256 `8879d89b5ff7b506c9fc28efc31a5c0b954bbe9333e66e5283d27d20a8519ea3`. It is copied only to an isolated QA directory. No system-font installation is added to the product, no font asset is committed or embedded, and proprietary files are never supplied.

Machine-readable evidence is in [docx-font-matrix-13okt.json](docx-font-matrix-13okt.json). Local source hashes identify each actual package; CI records its own engine/font inventory and actual measurements separately. The byte-identical JSON claim is within each rendering environment, not an assumption that browser-rasterized decorations have identical bytes across browser versions.

## Final stable CI evidence

Code commit: `2a37ef91c43ce697aa4919fccac27895e33081b9`. [DOCX Next Font Matrix run 38429247592](https://github.com/modebrecht/cv-cover-charm/actions/runs/38429247592): **SUCCESS**. Both `font-regressions` and `font-packages-and-libreoffice` passed. The documentation-only completion commit preserves this tested code unchanged; path-scoped CI does not rerun native conversion for report-only changes.

Stable engine: **LibreOffice 24.2.7.2 420(Build:2)**. Its actual five-family/20-face inventory is recorded separately in the JSON evidence. The public Narrow faces match the local hashes; other distribution font-file hashes differ and are retained rather than assumed to match. This new run does not relabel the unavailable pinned 25.8.7.3 baseline or grant Microsoft Word acceptance.

| Stable native gate                                |     Result |
| ------------------------------------------------- | ---------: |
| Actual guarded production packages inspected      | 1,092 pass |
| Real native renders with Save/Reopen              |   468 pass |
| Failures                                          |          0 |
| Save/Reopen font-probe changes                    |          0 |
| Save/Reopen page-count changes                    |          0 |
| Documents with changed measured probe coordinates |          0 |
| Requested-family/explicit-fallback pairs          |        234 |
| Pairs with different initial page counts          |         17 |

The stable run has 17 substitution page-count differences versus 44 on the local development engine. Both retain complete text and font ownership through Save/Reopen. The different engine/font inventories and application-selected substitutions explain why the two environments must remain separate measured baselines; matching family names or page counts cannot establish cross-application typography identity.

Per-template stable initial/reopened evidence is retained in the workflow artifact and the machine-readable `ci.metrics.templatePages` table. Final validation also retains the baseline 151-file global formatting failure (same exact file set on untouched `dev`), 21 existing lint warnings, and the resolved setup failures. No tolerance or existing expected snapshot was changed.

`dev` remains `1f4696ee520724466457dacbecc19fffe34ff1ff`, `main` remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`, and `render` remains `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`. The PDF-preflight work branch was never written. No PDF, print, browser pagination, export dialog, shared PDF geometry, PDF text layer or browser template CSS was modified. No deployment or merge was performed.
