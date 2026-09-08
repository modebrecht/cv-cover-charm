# Dev CV typography recovery

Recovered the useful CV typography controls from the historic `dev` branch onto current `main` without merging `dev` wholesale.

Recovered product behavior:

- independent document-title size, color, bold, italic, underline and bottom spacing;
- global rubric-title size, color, bold, italic, underline and bottom spacing;
- full-width section-rule default/legacy normalization;
- rubric formatting across main, sidebar and custom-section render paths;
- preview and PDF text source share the same persisted typography values.

Important fix discovered during recovery:

Template CSS (notably Neon) could override explicit saved document/rubric title typography. The recovery now marks explicit user typography semantically and applies a dedicated override layer so user settings outrank template defaults while the PDF raster text mask still stays transparent during raster capture.

Verification before cleanup:

- Dossier Regression run 34286367720 on `4e0e76235884367699261eebc6ab32e7819f1eb0`: success.
- Dossier PDF Gallery run 34286369458 on the same SHA: success.

Temporary recovery script/workflow files were removed before promotion. Final promotion must still verify the exact cleaned branch SHA via the repository's native PR/main gates.
