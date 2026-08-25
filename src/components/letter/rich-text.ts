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
  if (ALLOWED_BLOCK.has(tag)) {
    const columns =
      element.dataset.columns === "2" || element.dataset.columns === "3"
        ? ` data-columns="${element.dataset.columns}"`
        : "";
    return `<div${columns}>${children || "<br>"}</div>`;
  }
  return children;
}

function serializeTopLevelNodes(nodes: Node[]): string {
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
      if (raw.includes("\n")) {
        flushInline();
        for (const line of raw.replace(/\r/g, "").split("\n")) {
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
  return serializeTopLevelNodes(Array.from(template.content.childNodes));
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
