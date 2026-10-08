# Citrus — stopped template assessment

Assessed against fetched `dev` `58a27488bc09b04b459d42d27bfd17410bfe9506`. No Citrus descriptor, registry entry, native fixture export or renderer change was added.

The visual requirement is a text-fit, padded, rounded surface behind each editable CV section heading. `src/components/cover/cv-card-refresh.css` declares `inline-block`, `width: fit-content`, `padding: 1mm 3mm`, `border-radius: 999px` and a translucent heading-color fill. This belongs to the Citrus template design. Its gradient cover/letter cards can use existing page motifs; they are not the reason for the stop.

Current Next exposes only `sectionSpaceMm`, `headingRule` and `sidebarFraction` in `TemplateDefinition.cv`. There is no template-owned rubric surface default. The existing generic `resolveCvRubricOptions` defaults `pill` to false and reads saved user flags (`sectionTitlePill` or its historic alias); Next converts an enabled flag to rectangular run shading. That preserves editable heading text, but supplies neither the source padding/capsule geometry nor a declarative template default. The representative Citrus saved input has neither flag set. Setting a flag only in fixtures would not configure real unchanged saved dossiers.

The main architecture agent would need to decide a **generic flowing heading surface/default policy**: fill, text-fit padding and radius, with explicit saved user choices retaining precedence. At minimum, a descriptor-owned default must exist before an intentional rectangular Word adaptation can be reviewed. Rounded CV rubric controls across other templates can reuse this capability; Citrus is its immediate template consumer. The existing shared rubric UI already applies beyond Citrus.

No major primitive is implemented in this parallel branch. The unit coverage keeps `nextTemplate("citrus")` rejected. Citrus remains unconfigured and unrendered; no LibreOffice or Microsoft Word acceptance is claimed.
