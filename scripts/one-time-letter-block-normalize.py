from pathlib import Path

path = Path("src/components/letter/rich-text.ts")
text = path.read_text()
needle = '''/**
 * Nur die wenigen Formatierungen behalten, die das Anschreiben anbietet.
 * Attribute, Styles, Links, Bilder, Scripts usw. werden vollständig entfernt.
 */
export function sanitizeLetterRichHtml(html: string): string {'''
insert = '''function serializeTopLevelNodes(nodes: Node[]): string {
  let output = "";
  let inlineBuffer = "";

  const flushInline = () => {
    if (!inlineBuffer) return;
    output += `<div>${inlineBuffer}</div>`;
    inlineBuffer = "";
  };

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent ?? "";
      if (raw.includes("\\n")) {
        flushInline();
        for (const line of raw.replace(/\\r/g, "").split("\\n")) {
          output += `<div>${line ? escapeHtml(line) : "<br>"}</div>`;
        }
        continue;
      }
      if (!raw.trim() && !inlineBuffer) continue;
      inlineBuffer += serializeNode(node);
      continue;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();
      if (ALLOWED_BLOCK.has(tag) || tag === "hr") {
        flushInline();
        output += serializeNode(node);
        continue;
      }
    }

    inlineBuffer += serializeNode(node);
  }

  flushInline();
  return output;
}

/**
 * Nur die wenigen Formatierungen behalten, die das Anschreiben anbietet.
 * Attribute, Styles, Links, Bilder, Scripts usw. werden vollständig entfernt.
 */
export function sanitizeLetterRichHtml(html: string): string {'''
if needle not in text:
    raise SystemExit("sanitize insertion point not found")
text = text.replace(needle, insert, 1)
old = '  return Array.from(template.content.childNodes).map(serializeNode).join("");'
new = '  return serializeTopLevelNodes(Array.from(template.content.childNodes));'
if old not in text:
    raise SystemExit("top-level sanitize call not found")
text = text.replace(old, new, 1)
path.write_text(text)
