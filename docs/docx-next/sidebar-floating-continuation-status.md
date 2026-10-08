# Sidebar documented floating-table continuation — 2026-10-08

Starting freshly fetched, clean remote `dev`: `b677051d166a2b0f41221ac849e5e03edc149d2d`. M6 Release Candidate / application run 37783027702 and all three stable jobs in 37783027746 succeed. The previous stable artifact 11552764084 is independently downloaded, SHA-256 verified (`0c256a82cc068254dfe81aeeaa21c65f8b93d747a30b68187e9cc30bdea5e650`), and all four sources / 84 PNG pixel digests reproduce the strict continuous-cell baseline. Its failure remains retained.

## Declarative contract

The primary [Microsoft continuation specification](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-docx/1a912d7b-20e4-4d29-9c29-613793be0319) explicitly permits following document content alongside a floating table on its continuation pages when `allowTextAfterFloatingTableBreak` is true. Without the setting, following content is placed after the table. This is a documented document-level continuation policy, not a paragraph-flag guess. The [LibreOffice author explanation](https://vmiklos.hu/blog/sw-floattable9.html) and [actual import/export implementation](https://github.com/LibreOffice/core/commit/33ade4171a1a443fd24e6463a9eaa279f7d778bb) confirm the exact name, URI and `val="1"` serialization. Neither primary contract establishes acceptance of this application architecture.

The diagnostic model declares `floatingTableTextFlow: "all-pages"`; the single generic renderer writes that one compatibility setting. The normal renderer rejects the property independently of the issues list or a positioned table, including JSON-restored models. Invalid restored values are rejected. No builder, template, application export, PDF or portable JSON behavior changes.

Twelve sources are declared in advance: right then left, short / side-long / both-long, each default and all-pages. The existing native floating fixture is reused without changing any block, field ID, complete paragraph, paragraph flag, paint, margin, lane width or position. Every package part is byte-identical to its matched control except the one `settings.xml` element; immutable model JSON reproduces every package byte. No text lookup, semantic segmentation, fixed-height text frame, rasterized user text or post-save XML mutation is used.

## Actual local result

LibreOfficeDev 26.8.0.0.alpha0 / build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5` performs **four actual cases / 24 dossier pages**, plus native Save/Reopen. The short pair starts both lanes on CV page 1. Both long-side cases start main on CV page 7 and side on CV page 1. The all-pages candidate is rejected for unchanged postponed main opening; the other eight sources remain prepared but unrendered. The document setting is present and true in both candidate source and saved package.

All 77 short / 129 long native tagged fields survive, as do all 47 short / 99 long whole CV paragraphs, their explicit keepNext / keepLines / widowControl values, exact native body/side owners, and exact floating width/grid/position/distances. Complete native and owning-lane PDF text and bounds pass. Source and Save/Reopen pixels are identical across every channel. Original table captions still disappear: container identity and full Save/Reopen identity remain explicit failures, never inferred from surviving text or field owners.

All **48 source/reopened page PNGs** are retained with raw RGBA digests. Strict baseline comparison excludes only the engine version and nondeterministic saved ZIP hash; source bytes, exact native results, captions, actual stop inventory, every PDF result and all page pixel digests remain exact. Three Python tests exercise twelve independent baseline mutations, each stop channel and the limited metadata exclusions. Three new units check default/JSON guards, invalid policies and all twelve unchanged source stories. Full local release checks pass (1012 units, type/format/lint/build). Stable execution is pending publication and will be recorded separately from this local result.

## Reproduce and remaining work

```sh
bun scripts/docx-next-floating-continuation-probe.ts /tmp/docx-next-floating-continuation
python scripts/docx-next-floating-continuation-test.py
python scripts/docx-next-floating-continuation-qa.py /tmp/docx-next-floating-continuation --observe
```

Use `--libreofficekit PATH --require-stable` on the pinned independent stable engine, then pin that actual report and require `--baseline`. Observation preserves failures; it does not grant migration acceptance. [Machine evidence](sidebar-floating-continuation-evidence.json) distinguishes actual runtimes and unrendered sources.

Next: independently run the unchanged sources on the stable engine, inspect the native anchor owner through the primary table-position contract, and retain the strict stop if the main remains postponed. Do not extend this rejected flag-only candidate or repeat arbitrary paragraph flags, widths or crops. Original captions, long opening attachment, exact geometry, full original-photo pixels and Microsoft Word requirements remain blocked. Production stays blocked; **29/39 configured, 0/39 Word accepted**. No manual deployment, promotion, Legacy/V2 deletion or other branch update.
