const ALLOWED_INLINE = new Set(["strong", "b", "em", "i", "u"]);
const ALLOWED_BLOCK = new Set(["div", "p"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function plainTextToRichHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => `<div>${line ? escapeHtml(line) : "<br>"}</div>`)
    .join("");
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  if (tag === "br") return "<br>";
  if (tag === "hr") return "<hr>";

  const children = Array.from(element.childNodes).map(serializeNode).join("");
  if (ALLOWED_INLINE.has(tag)) {
    const canonical = tag === "b" ? "strong" : tag === "i" ? "em" : tag;
    return `<${canonical}>${children}</${canonical}>`;
  }
  if (ALLOWED_BLOCK.has(tag)) return `<div>${children || "<br>"}</div>`;
  return children;
}

/**
 * Nur die wenigen Formatierungen behalten, die das Anschreiben anbietet.
 * Attribute, Styles, Links, Bilder, Scripts usw. werden vollständig entfernt.
 */
export function sanitizeLetterRichHtml(html: string): string {
  if (!html.trim()) return "";
  if (typeof document === "undefined") {
    const plain = html
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<hr\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, "");
    return plainTextToRichHtml(plain);
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  return Array.from(template.content.childNodes).map(serializeNode).join("");
}

function textFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  if (tag === "br") return "\n";
  if (tag === "hr") return "\n";
  const children = Array.from(element.childNodes).map(textFromNode).join("");
  return ALLOWED_BLOCK.has(tag) ? `${children}\n` : children;
}

export function richHtmlToPlainText(html: string): string {
  if (!html.trim()) return "";
  if (typeof document === "undefined") {
    return html
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<hr\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const template = document.createElement("template");
  template.innerHTML = sanitizeLetterRichHtml(html);
  return Array.from(template.content.childNodes)
    .map(textFromNode)
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function letterRichHtml(html: string | undefined, plainText: string): string {
  return html?.trim() ? sanitizeLetterRichHtml(html) : plainTextToRichHtml(plainText);
}
