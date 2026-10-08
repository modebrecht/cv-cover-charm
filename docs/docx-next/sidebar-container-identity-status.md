# Native first-cell ending retains a container ID in minimal controls

Continued from freshly fetched, clean remote `dev` at `e475e06de9ab8524603887c652a2a1c15fd872a2`. Published implementation `67ff63a9000b91383579889eac6ceb85f2969d0f` has successful [application/M6 37735869791](https://github.com/modebrecht/cv-cover-charm/actions/runs/37735869791), all three [stable Sidebar jobs 37735869676](https://github.com/modebrecht/cv-cover-charm/actions/runs/37735869676) and gallery CI. The photo/crop investigation is not reopened. Final baseline-publication CI is checked separately.

The existing native package guard rejects nested content controls. Wrapping an entire table around its already tagged paragraphs would violate that guard. Instead, a generic, explicitly unaccepted `TableBlock.identityCarrier: "cell-ending"` annotates the **already required empty ending of the first cell** with the table's complete canonical ID. It adds no paragraph, visible/hidden text, image, fixed geometry or container wrapper. Original `tblCaption` emission and the strict caption audit are unchanged. Normal exports reject this primitive even if model issues are removed, including after JSON restoration and in header stories.

The separate six-case no-photo plan pairs caption-only and carrier controls in a one-cell table and mirrored two-cell tables. Caption-only source packages match the independently executed plain picture-identity controls byte for byte. Carrier packages differ only by the declared annotation in `word/document.xml`; every other package part, paragraph, field, cell, width and flag is unchanged. Immutable model/portable JSON and restored package bytes pass.

| Native runtime | Actual cases / pages | Fields and complete text | Carrier and actual owning cell | Original captions |
| --- | --- | --- | --- | --- |
| Dev 26.8 / soffice CLI | 6 / 18, plus Save/Reopen and second PDFs | pass | all three carriers pass | lost in all six |
| Stable 25.8.7.3 / Kit | 6 / 18, plus Save/Reopen and second PDFs | pass | all three carriers pass | lost in all six |

Independent [actual stable and Dev evidence](sidebar-container-identity-evidence.json) retains the positive carrier result **separately** from caption failure. Stable job 113175113560 / artifact 11531851633 is downloaded and its SHA-256 verified. Read-only QA resolves the table through the exact native ID annotation, verifies its first-row/first-cell ending position, exact cell-owned field IDs and unchanged native grid, and checks complete native/PDF text, bounds and three logical pages. Each runtime generates all 36 source/saved page PNGs; every carrier page is byte-identical to its caption-only control. All three local CV orientations are visually inspected. Twelve adversarial Python tests additionally protect the strict baseline: only nondeterministic saved-package hashes are ignored; prepared sources, ownership, pixels, counts/stops and the known caption failure cannot change silently. Existing nested-control and native-caption requirements are not weakened.

This is a bounded alternative-carrier proof, **not closure of the original caption requirement**, general Sidebar ownership, pagination or Word acceptance. The final strict baseline uses the independently executed stable report without observation mode. Production export gates remain closed; 29/39 configured, 0/39 Word accepted. The left long-opening, cropped-ellipse original pixels, Microsoft Word and approved snapshots remain blocked.

```sh
bun scripts/docx-next-container-identity-probe.ts /tmp/container-identity
python scripts/docx-next-container-identity-test.py
python scripts/docx-next-container-identity-qa.py /tmp/container-identity
python scripts/docx-next-container-identity-qa.py /tmp/container-identity --libreofficekit /path/to/lo-kit --require-stable --baseline docs/docx-next/sidebar-container-identity-evidence.json
```

Next: verify final publication CI, then test the same generic annotation in the existing populated multirow/spanning-cell controls. Keep the original left long-opening counterexample and every complete-text/ownership gate; do not replace the caption gate or normalize photos.
