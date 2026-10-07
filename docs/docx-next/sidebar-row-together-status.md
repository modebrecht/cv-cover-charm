# Short opening row keepTogether — ruled-out hypothesis

Starting freshly fetched, clean remote dev: `6f1a38afe160f1948bc0d70309d50f7a4edc6fcc`.

Four matched controls at 220 mm compare only the short opening row's `keepTogether` / native `cantSplit`, true versus false, in both orientations. Main-only cell-ending attachment remains constant. Every semantic paragraph, text, width, span, decoration and lead/tail flag remains identical. Both long descriptions remain splittable. Existing renderer primitives suffice; no product renderer change.

| Sidebar | Short row cantSplit | Main opening CV pages | Complete PDF text | Product gate               |
| ------- | ------------------- | --------------------- | ----------------- | -------------------------- |
| Left    | true                | 1,1,1,1,2             | pass              | fail: detached description |
| Left    | false               | 1,1,1,1,2             | pass              | fail: detached description |
| Right   | true                | 2,2,2,2,2             | pass              | bounded pass               |
| Right   | false               | 2,2,2,2,2             | pass              | bounded pass               |

All four dossiers have 21 pages (84 total); all ten full fields survive native package inspection and Save/Reopen. Visible text hashes, geometry, bounds and opening positions are identical within each orientation. True controls are byte-identical to previous main-only controls. This rules out short-row cantSplit alone; the left populated-track binding remains unresolved. Normal exports remain guarded, Microsoft Word remains pending.

Local evidence: LibreOfficeDev 26.8.0.0.alpha0. The stable workflow adds these four cases to the previous 62 and strictly compares exact packages and recorded render/Save-Reopen results on pinned LibreOffice 25.8.7.3. Exact-commit stable/application CI is pending at publication; green reproduction of expected failures is not product acceptance. No new claim of supported sidebar regression execution is made for this block.

Reproduce:

```sh
bun scripts/docx-next-row-together-probe.ts /tmp/row-together
python scripts/docx-next-populated-row-qa.py /tmp/row-together --matrix row-together
python scripts/docx-next-populated-row-test.py
```

Next bounded hypothesis: isolate the spanning side cell's terminal keep-next state while leaving main-only opening attachment and all content unchanged. Compare the final semantic side paragraph and the required empty ending separately, both orientations; require complete text, bounds and Save/Reopen, and stop if the right positive control regresses. This has not been tested or enabled by this checkpoint.
