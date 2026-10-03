# DOCX Next acceptance contract

A template is migrated only after automated structural and real-render checks pass and Microsoft Word manual evidence is recorded. An unavailable application is an unverified gate, never a passing test. Brief is the first reference; other templates cannot be enabled through a generic fallback.

| Contract                                                                            | Automated evidence                                                                                 | Manual evidence                                                    |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Required parts, ZIP CRC, well-formed XML, content types and relationship targets    | Package validator plus Python ZIP/XML QA                                                           | Windows Word and LibreOffice open without repair/corruption prompt |
| Cover, letter and CV present, editable user text                                    | Semantic ID uniqueness and text preservation tests, native w:t assertions                          | Select/edit text, save/reopen in Word                              |
| ä ö ü Ä Ö Ü é è à – — ·, long/repeated names, company/address/email/URL             | Model/package stress fixtures and PDF text extraction                                              | Edit repeated values independently in Word                         |
| Classic and sidebar CV, left/right, contact/section placement                       | Model layout tests, native table checks, real render fixtures                                      | Add/delete entries and inspect page 2                              |
| Section order, half-width, custom sections, absent optional sections                | Model fixture tests and rendered text order                                                        | Heading stays attached to first entry                              |
| Long letter and CV, reasonable pagination and entry splitting                       | Long fixtures, nonblank page checks, text bounding boxes                                           | Add a paragraph/entry, reflow and save/reopen                      |
| Sender, recipient, date, subject, salutation, body, closing, signature, attachments | Required semantic fields and render extraction                                                     | Inspect short and long letters                                     |
| Rich text emphasis, colors, alignment, lists/tables/columns                         | Canonical rich-block tests, native OOXML, column geometry/header/LO roundtrip checks               | Edit content in Word                                               |
| PNG, transparent PNG, JPEG, ICC/EXIF JPEG, no photo, aspect ratio                   | Normalizer fixtures, deduplication/relationships, rendered image bounds                            | Photos visible in Word on Windows/macOS                            |
| Inline, left/right/free letter images                                               | Semantic geometry and DrawingML tests, real rendering                                              | Text wraps and image remains movable                               |
| User colors, font sizes, emphasis, margins, header/footer/chrome                    | Model/OOXML property tests, paint pixel checks, native offset movement and LO save/reopen fixtures | Inspect page boundaries and continuation header                    |
| Nonsemantic artwork behind native content, graceful missing-artwork fallback        | Declarative artwork policy and renderer tests                                                      | No user text in artwork                                            |
| Deterministic font selection/fallback, disabled/failing embedding                   | Explicit font mapping tests; render without embedded fonts                                         | Verify installed/unavailable font behavior                         |
| PDF export and project JSON unchanged                                               | Existing unit suites, browser save/load/export regression                                          | Existing workflow smoke test                                       |
| All 39 templates, one renderer, no legacy/V2 dependencies or text searches          | Active template registry coverage, dependency boundary tests, gallery                              | Word-oriented snapshot review per template                         |

## Gate ledger

0 inventory complete. 1 contract defined; automated cases must be implemented with their owning phase. 2 deterministic semantic model. 3 configuration-only template. 4 independent valid package. 5 Brief stress and Word editing acceptance. 6 real render QA and recorded Word smoke test. 7 diverse templates without hacks. 8 native sidebar reflow. 12 full gallery. 13 production comparison/switchover. 14 import-audited deletion.

Do not certify Gates 5/6 from XML or LibreOffice alone. No production switch or obsolete-code deletion before migration gates pass. A pending acceptance row is a blocker for its phase, not an accepted limitation.
