from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1))


def replace_between(path: str, start_marker: str, end_marker: str, replacement: str) -> None:
    file = Path(path)
    text = file.read_text()
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"Start marker not found in {path}: {start_marker!r}")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"End marker not found in {path}: {end_marker!r}")
    file.write_text(text[:start] + replacement + text[end:])


EDITOR = r'''import { useEffect, useRef, useState } from "react";
import { List, Table2 } from "lucide-react";
import {
  letterRichHtml,
  richHtmlToPlainText,
  sanitizeLetterRichHtml,
} from "@/components/letter/rich-text";
import type { LetterBodyColumns } from "@/components/letter/types";

const toolClass =
  "rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const activeToolClass = "bg-primary text-primary-foreground hover:bg-primary/90";

type LetterListStyle = "bullet" | "dash" | "plus" | "dot";

type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  columns: LetterBodyColumns | null;
  list: LetterListStyle | null;
};

const LIST_OPTIONS: Array<{ value: LetterListStyle | "none"; marker: string; label: string }> = [
  { value: "bullet", marker: "•", label: "Bullet" },
  { value: "dash", marker: "–", label: "Strich" },
  { value: "plus", marker: "+", label: "Plus" },
  { value: "dot", marker: "·", label: "Punkt zentriert" },
  { value: "none", marker: "", label: "Kein Zeichen" },
];

const TABLE_GRID_SIZE = 8;

function topLevelChild(editor: HTMLElement, node: Node | null): HTMLElement | null {
  if (!node) return null;
  let current: Node | null = node;
  while (current?.parentNode && current.parentNode !== editor) current = current.parentNode;
  return current instanceof HTMLElement && current.parentElement === editor ? current : null;
}

function topLevelBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
  const current = topLevelChild(editor, node);
  if (!current) return null;
  const tag = current.tagName.toLowerCase();
  return tag === "div" || tag === "p" ? current : null;
}

function rangeIntersects(range: Range, node: Node): boolean {
  try {
    return range.intersectsNode(node);
  } catch {
    return false;
  }
}

function existingSelectedBlocks(editor: HTMLElement, range: Range): HTMLElement[] {
  return Array.from(editor.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      ["div", "p"].includes(child.tagName.toLowerCase()) &&
      rangeIntersects(range, child),
  );
}

function ensureSelectedBlocks(editor: HTMLElement, range: Range): HTMLElement[] {
  const existing = existingSelectedBlocks(editor, range);
  if (existing.length) return existing;

  const wrappers: HTMLElement[] = [];
  for (const node of Array.from(editor.childNodes)) {
    if (!rangeIntersects(range, node)) continue;
    if (node instanceof HTMLHRElement || (node instanceof HTMLElement && node.tagName === "TABLE"))
      continue;
    if (node instanceof HTMLElement && ["div", "p"].includes(node.tagName.toLowerCase())) {
      wrappers.push(node);
      continue;
    }
    const wrapper = document.createElement("div");
    editor.insertBefore(wrapper, node);
    wrapper.appendChild(node);
    wrappers.push(wrapper);
  }

  if (wrappers.length) return wrappers;
  const fallback = topLevelBlock(editor, range.startContainer);
  return fallback ? [fallback] : [];
}

function columnsForBlock(block: HTMLElement | null): LetterBodyColumns {
  if (block?.dataset.columns === "2") return 2;
  if (block?.dataset.columns === "3") return 3;
  return 1;
}

function listForBlock(block: HTMLElement | null): LetterListStyle | null {
  const value = block?.dataset.list;
  return value === "bullet" || value === "dash" || value === "plus" || value === "dot"
    ? value
    : null;
}

function makeTable(rows: number, columns: number): HTMLTableElement {
  const table = document.createElement("table");
  table.dataset.letterTable = "true";
  const body = document.createElement("tbody");
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = document.createElement("tr");
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const cell = document.createElement("td");
      cell.innerHTML = "<br>";
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
  table.appendChild(body);
  return table;
}

export function LetterRichTextEditor({
  text,
  richTextHtml,
  onChange,
}: {
  text: string;
  richTextHtml?: string;
  onChange: (value: { text: string; richTextHtml: string }) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef("");
  const savedRangeRef = useRef<Range | null>(null);
  const [empty, setEmpty] = useState(!text.trim() && !richTextHtml?.trim());
  const [listOpen, setListOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableHover, setTableHover] = useState<{ rows: number; columns: number } | null>(null);
  const [toolbar, setToolbar] = useState<ToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    columns: 1,
    list: null,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = letterRichHtml(richTextHtml, text);
    if (next === lastEmitted.current) return;
    if (editor.innerHTML !== next) editor.innerHTML = next;
    setEmpty(!richHtmlToPlainText(next));
  }, [richTextHtml, text]);

  const rememberRange = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || !selection.anchorNode || !editor.contains(selection.anchorNode))
      return null;
    const range = selection.getRangeAt(0).cloneRange();
    savedRangeRef.current = range;
    return range;
  };

  const restoreRange = () => {
    const editor = editorRef.current;
    if (!editor) return null;
    const selection = window.getSelection();
    if (!selection) return null;
    const stored = savedRangeRef.current?.cloneRange();
    if (stored) {
      editor.focus();
      selection.removeAllRanges();
      selection.addRange(stored);
      return stored;
    }
    const fallback = document.createRange();
    fallback.selectNodeContents(editor);
    fallback.collapse(false);
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(fallback);
    savedRangeRef.current = fallback.cloneRange();
    return fallback;
  };

  const readToolbarState = () => {
    const editor = editorRef.current;
    const range = rememberRange();
    const selection = window.getSelection();
    if (!editor || !range || !selection?.anchorNode) return;

    const blocks = existingSelectedBlocks(editor, range);
    const fallback = topLevelBlock(editor, selection.anchorNode);
    const selected = blocks.length ? blocks : fallback ? [fallback] : [];
    const columnValues = selected.length
      ? selected.map(columnsForBlock)
      : ([1] as LetterBodyColumns[]);
    const columns = columnValues.every((value) => value === columnValues[0])
      ? columnValues[0]
      : null;
    const listValues = selected.map(listForBlock);
    const list =
      listValues.length && listValues.every((value) => value === listValues[0])
        ? listValues[0]
        : null;

    setToolbar({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      columns,
      list,
    });
  };

  useEffect(() => {
    const onSelectionChange = () => readToolbarState();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  });

  const emit = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sanitized = sanitizeLetterRichHtml(editor.innerHTML);
    const plain = richHtmlToPlainText(sanitized);
    lastEmitted.current = sanitized;
    setEmpty(!plain);
    onChange({ text: plain, richTextHtml: sanitized });
  };

  const command = (name: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreRange();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(name, false);
    emit();
    readToolbarState();
  };

  const setColumns = (columns: LetterBodyColumns) => {
    const editor = editorRef.current;
    const range = restoreRange();
    if (!editor || !range) return;
    const blocks = ensureSelectedBlocks(editor, range);
    for (const block of blocks) {
      if (columns === 1) delete block.dataset.columns;
      else block.dataset.columns = String(columns);
    }
    emit();
    setToolbar((current) => ({ ...current, columns }));
  };

  const setListStyle = (style: LetterListStyle | "none") => {
    const editor = editorRef.current;
    const range = restoreRange();
    if (!editor || !range) return;
    const blocks = ensureSelectedBlocks(editor, range);
    for (const block of blocks) {
      if (style === "none") delete block.dataset.list;
      else block.dataset.list = style;
    }
    emit();
    setToolbar((current) => ({ ...current, list: style === "none" ? null : style }));
    setListOpen(false);
  };

  const insertRule = () => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreRange();
    document.execCommand("insertHorizontalRule", false);
    emit();
    readToolbarState();
  };

  const insertTable = (rows: number, columns: number) => {
    const editor = editorRef.current;
    const range = restoreRange();
    if (!editor || !range) return;

    const table = makeTable(rows, columns);
    const topLevel = topLevelChild(editor, range.startContainer);
    if (topLevel) topLevel.insertAdjacentElement("afterend", table);
    else range.insertNode(table);

    let trailing = table.nextElementSibling;
    if (!(trailing instanceof HTMLElement) || !["DIV", "P"].includes(trailing.tagName)) {
      const paragraph = document.createElement("div");
      paragraph.innerHTML = "<br>";
      table.insertAdjacentElement("afterend", paragraph);
      trailing = paragraph;
    }

    const firstCell = table.querySelector("td");
    if (firstCell) {
      const selection = window.getSelection();
      const caret = document.createRange();
      caret.selectNodeContents(firstCell);
      caret.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(caret);
      savedRangeRef.current = caret.cloneRange();
    }

    emit();
    setTableOpen(false);
    setTableHover(null);
    readToolbarState();
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-foreground">Brieftext</span>
      <div className="relative flex flex-wrap gap-1.5 rounded-t-md border border-b-0 bg-muted/30 p-2">
        <button
          type="button"
          className={toolClass}
          aria-label="Formatierung entfernen"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("removeFormat")}
        >
          Normal
        </button>
        <button
          type="button"
          className={`${toolClass} font-bold ${toolbar.bold ? activeToolClass : ""}`}
          aria-label="Fett"
          aria-pressed={toolbar.bold}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("bold")}
        >
          B
        </button>
        <button
          type="button"
          className={`${toolClass} italic ${toolbar.italic ? activeToolClass : ""}`}
          aria-label="Kursiv"
          aria-pressed={toolbar.italic}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("italic")}
        >
          I
        </button>
        <button
          type="button"
          className={`${toolClass} underline ${toolbar.underline ? activeToolClass : ""}`}
          aria-label="Unterstrichen"
          aria-pressed={toolbar.underline}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("underline")}
        >
          U
        </button>
        {([1, 2, 3] as const).map((count) => (
          <button
            key={count}
            type="button"
            className={`${toolClass} min-w-8 ${toolbar.columns === count ? activeToolClass : ""}`}
            aria-label={`${count} ${count === 1 ? "Spalte" : "Spalten"}`}
            aria-pressed={toolbar.columns === count}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setColumns(count)}
          >
            {count}
          </button>
        ))}

        <div className="relative">
          <button
            type="button"
            className={`${toolClass} flex items-center justify-center px-2 ${toolbar.list ? activeToolClass : ""}`}
            aria-label="Liste"
            aria-expanded={listOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setListOpen((current) => !current);
              setTableOpen(false);
            }}
          >
            <List className="h-4 w-4" />
          </button>
          {listOpen ? (
            <div className="absolute left-0 top-full z-30 mt-1 min-w-44 rounded-md border bg-popover p-1 shadow-lg">
              {LIST_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                  aria-label={option.label}
                  aria-pressed={
                    option.value === "none" ? toolbar.list === null : toolbar.list === option.value
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setListStyle(option.value)}
                >
                  <span className="w-4 text-center text-sm">{option.marker}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            className={`${toolClass} flex items-center justify-center px-2`}
            aria-label="Tabelle"
            aria-expanded={tableOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setTableOpen((current) => !current);
              setListOpen(false);
            }}
          >
            <Table2 className="h-4 w-4" />
          </button>
          {tableOpen ? (
            <div className="absolute left-0 top-full z-30 mt-1 rounded-md border bg-popover p-2 shadow-lg">
              <div className="mb-2 whitespace-nowrap text-center text-[11px] font-medium text-foreground">
                {tableHover ? `${tableHover.rows} × ${tableHover.columns} Tabelle` : "Tabellengrösse"}
              </div>
              <div
                role="grid"
                aria-label="Tabellengrösse auswählen"
                className="grid grid-cols-8 gap-1"
                onMouseLeave={() => setTableHover(null)}
              >
                {Array.from({ length: TABLE_GRID_SIZE * TABLE_GRID_SIZE }, (_, index) => {
                  const row = Math.floor(index / TABLE_GRID_SIZE) + 1;
                  const column = (index % TABLE_GRID_SIZE) + 1;
                  const highlighted =
                    !!tableHover && row <= tableHover.rows && column <= tableHover.columns;
                  return (
                    <button
                      key={`${row}-${column}`}
                      type="button"
                      role="gridcell"
                      aria-label={`Tabelle ${row} × ${column} einfügen`}
                      className={`h-4 w-4 rounded-[2px] border ${
                        highlighted ? "border-primary bg-primary/25" : "bg-background hover:bg-muted"
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setTableHover({ rows: row, columns: column })}
                      onFocus={() => setTableHover({ rows: row, columns: column })}
                      onClick={() => insertTable(row, column)}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={toolClass}
          aria-label="Trennlinie einfügen"
          onMouseDown={(event) => event.preventDefault()}
          onClick={insertRule}
        >
          ─
        </button>
      </div>
      <div className="relative">
        {empty ? (
          <div className="pointer-events-none absolute left-3 top-2.5 max-w-[90%] text-sm leading-relaxed text-muted-foreground/70">
            Warum möchtest du diesen Beruf lernen? Warum passt dieser Betrieb zu dir? Was bringst du
            mit?
          </div>
        ) : null}
        <div
          ref={editorRef}
          data-letter-rich-editor
          role="textbox"
          aria-label="Brieftext"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onFocus={readToolbarState}
          onKeyUp={readToolbarState}
          onMouseUp={readToolbarState}
          onBlur={() => {
            const editor = editorRef.current;
            if (!editor) return;
            const sanitized = sanitizeLetterRichHtml(editor.innerHTML);
            if (editor.innerHTML !== sanitized) editor.innerHTML = sanitized;
          }}
          className="min-h-56 rounded-b-md border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring [&_hr]:my-4 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border"
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Wie in Word: Fett, Kursiv, Unterstrichen, Spalten und Listen gelten nur für die aktuelle
        Auswahl oder den aktuellen Absatz. Tabellen werden an der Cursorposition eingefügt.
      </p>
    </div>
  );
}
'''

RICH_TEXT = r'''const ALLOWED_INLINE = new Set(["strong", "b", "em", "i", "u"]);
const ALLOWED_BLOCK = new Set(["div", "p"]);
const ALLOWED_LISTS = new Set(["bullet", "dash", "plus", "dot"]);

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

function blockAttributes(element: HTMLElement): string {
  const attributes: string[] = [];
  if (element.dataset.columns === "2" || element.dataset.columns === "3") {
    attributes.push(`data-columns="${element.dataset.columns}"`);
  }
  if (element.dataset.list && ALLOWED_LISTS.has(element.dataset.list)) {
    attributes.push(`data-list="${element.dataset.list}"`);
  }
  return attributes.length ? ` ${attributes.join(" ")}` : "";
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
    return `<div${blockAttributes(element)}>${children || "<br>"}</div>`;
  }
  if (tag === "table") return `<table data-letter-table>${children}</table>`;
  if (tag === "tbody") return `<tbody>${children}</tbody>`;
  if (tag === "tr") return `<tr>${children}</tr>`;
  if (tag === "td") return `<td>${children || "<br>"}</td>`;
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
      if (ALLOWED_BLOCK.has(tag) || tag === "hr" || tag === "table") {
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
 * Nur die Formatierungen behalten, die der Anschreiben-Editor anbietet.
 * Fremde Attribute, Styles, Links, Bilder, Scripts usw. werden entfernt.
 */
export function sanitizeLetterRichHtml(html: string): string {
  if (!html.trim()) return "";
  if (typeof document === "undefined") {
    const plain = html
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<hr\s*\/?\s*>/gi, "\n")
      .replace(/<\/td\s*>/gi, "\t")
      .replace(/<\/tr\s*>/gi, "\n")
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
  if (ALLOWED_BLOCK.has(tag)) return `${children}\n`;
  if (tag === "td") return `${children}\t`;
  if (tag === "tr") return `${children.replace(/\t+$/g, "")}\n`;
  if (tag === "table") return `${children}\n`;
  return children;
}

export function richHtmlToPlainText(html: string): string {
  if (!html.trim()) return "";
  if (typeof document === "undefined") {
    return html
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<hr\s*\/?\s*>/gi, "\n")
      .replace(/<\/td\s*>/gi, "\t")
      .replace(/<\/tr\s*>/gi, "\n")
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
'''

Path("src/components/letter/LetterRichTextEditor.tsx").write_text(EDITOR)
Path("src/components/letter/rich-text.ts").write_text(RICH_TEXT)

replace_once(
    "src/components/letter/types.ts",
    '  bodyColumns?: LetterBodyColumns;\n',
    '',
)
replace_once(
    "src/components/letter/types.ts",
    '    bodyColumns: 1,\n',
    '',
)
replace_once(
    "src/components/letter/types.ts",
    '    bodyColumns:\n      incoming.bodyColumns === 2 || incoming.bodyColumns === 3 ? incoming.bodyColumns : 1,\n',
    '',
)

replace_once(
    "src/routes/anschreiben.tsx",
    '''                <LetterRichTextEditor
                  text={data.text}
                  richTextHtml={data.richTextHtml}
                  columns={design.bodyColumns ?? 1}
                  onColumnsChange={(bodyColumns) =>
                    setDesign((current) => ({ ...current, bodyColumns }))
                  }
                  onChange={({ text, richTextHtml }) => patch({ text, richTextHtml })}
                />''',
    '''                <LetterRichTextEditor
                  text={data.text}
                  richTextHtml={data.richTextHtml}
                  onChange={({ text, richTextHtml }) => patch({ text, richTextHtml })}
                />''',
)

replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '  const bodyColumns = design.bodyColumns ?? 1;\n',
    '',
)
replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '''          <div
            data-letter-pdf-richtext="body"
            data-letter-columns={bodyColumns}
            className="text-[10.5pt] leading-[1.55] [&_div]:min-h-[1.55em] [&_p]:min-h-[1.55em] [&_hr]:my-[5mm] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-current [&_hr]:opacity-50"
            style={{ columnCount: bodyColumns, columnGap: bodyColumns > 1 ? "6mm" : undefined }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />''',
    '''          <div
            data-letter-pdf-richtext="body"
            className="text-[10.5pt] leading-[1.55] [&_div]:min-h-[1.55em] [&_p]:min-h-[1.55em] [&_hr]:my-[5mm] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-current [&_hr]:opacity-50"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />''',
)

styles = Path("src/styles.css")
css = styles.read_text()
marker = "/* Letter rich-text Word-like blocks */"
if marker not in css:
    css += r'''

/* Letter rich-text Word-like blocks */
[data-letter-rich-editor] > [data-columns="2"] {
  column-count: 2;
  column-gap: 1.25rem;
}

[data-letter-rich-editor] > [data-columns="3"] {
  column-count: 3;
  column-gap: 1.25rem;
}

[data-letter-pdf-richtext] > [data-columns="2"] {
  column-count: 2;
  column-gap: 6mm;
}

[data-letter-pdf-richtext] > [data-columns="3"] {
  column-count: 3;
  column-gap: 6mm;
}

[data-letter-rich-editor] > [data-list],
[data-letter-pdf-richtext] > [data-list] {
  position: relative;
  padding-left: 1.35em;
}

[data-letter-rich-editor] > [data-list]::before,
[data-letter-pdf-richtext] > [data-list]::before {
  position: absolute;
  left: 0;
  top: 0;
  width: 1em;
  text-align: center;
}

[data-letter-rich-editor] > [data-list="bullet"]::before,
[data-letter-pdf-richtext] > [data-list="bullet"]::before {
  content: "•";
}

[data-letter-rich-editor] > [data-list="dash"]::before,
[data-letter-pdf-richtext] > [data-list="dash"]::before {
  content: "–";
}

[data-letter-rich-editor] > [data-list="plus"]::before,
[data-letter-pdf-richtext] > [data-list="plus"]::before {
  content: "+";
}

[data-letter-rich-editor] > [data-list="dot"]::before,
[data-letter-pdf-richtext] > [data-list="dot"]::before {
  content: "·";
}

[data-letter-rich-editor] table[data-letter-table],
[data-letter-pdf-richtext] table[data-letter-table] {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  margin: 0.75em 0;
}

[data-letter-rich-editor] table[data-letter-table] td,
[data-letter-pdf-richtext] table[data-letter-table] td {
  min-width: 2em;
  height: 2em;
  padding: 0.28em 0.42em;
  vertical-align: top;
  border: 1px solid color-mix(in srgb, currentColor 38%, transparent);
}
'''
    styles.write_text(css)

pdf_path = Path("src/lib/dossier-pdf.ts")
pdf_text = pdf_path.read_text()
needle = '''function addLetterRules(pdf: JsPdf, page: HTMLElement, mmX: number, mmY: number) {'''
helpers = r'''const LETTER_LIST_MARKERS: Record<string, string> = {
  bullet: "•",
  dash: "–",
  plus: "+",
  dot: "·",
};

function addLetterListMarkers(
  pdf: JsPdf,
  page: HTMLElement,
  root: HTMLElement,
  font: PdfFont,
  mmX: number,
  mmY: number,
) {
  const pageRect = page.getBoundingClientRect();
  for (const block of root.querySelectorAll<HTMLElement>(":scope > [data-list]")) {
    const marker = LETTER_LIST_MARKERS[block.dataset.list ?? ""];
    if (!marker) continue;
    const rect = block.getBoundingClientRect();
    const style = window.getComputedStyle(block);
    const fontSizePx = Number.parseFloat(style.fontSize) || 14;
    const fontSizePt = fontSizePx * (72 / 96);
    const [red, green, blue] = rgb(style.color);
    const x = (rect.left - pageRect.left + 2) * mmX;
    const top = (rect.top - pageRect.top) * mmY;
    const baseline = top + fontSizePt * MM_PER_PT * 0.82;
    pdf.setFont(font, "normal");
    pdf.setFontSize(fontSizePt);
    pdf.setTextColor(red, green, blue);
    pdf.text(marker, x, baseline);
  }
}

function addLetterTableBorders(
  pdf: JsPdf,
  page: HTMLElement,
  root: HTMLElement,
  mmX: number,
  mmY: number,
) {
  const pageRect = page.getBoundingClientRect();
  for (const cell of root.querySelectorAll<HTMLElement>("table[data-letter-table] td")) {
    const rect = cell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = window.getComputedStyle(cell);
    const [red, green, blue] = rgb(style.color);
    const left = (rect.left - pageRect.left) * mmX;
    const right = (rect.right - pageRect.left) * mmX;
    const top = (rect.top - pageRect.top) * mmY;
    const bottom = (rect.bottom - pageRect.top) * mmY;
    pdf.setDrawColor(red, green, blue);
    pdf.setLineWidth(0.16);
    pdf.line(left, top, right, top);
    pdf.line(right, top, right, bottom);
    pdf.line(right, bottom, left, bottom);
    pdf.line(left, bottom, left, top);
  }
}

function addLetterRules(pdf: JsPdf, page: HTMLElement, mmX: number, mmY: number) {'''
if needle not in pdf_text:
    raise SystemExit("PDF helper insertion point not found")
pdf_text = pdf_text.replace(needle, helpers, 1)
pdf_text = pdf_text.replace(
    '''  const richBody = page.querySelector<HTMLElement>("[data-letter-pdf-richtext]");
  if (richBody) addRichLetterText(pdf, page, richBody, font, mmX, mmY);
  addLetterRules(pdf, page, mmX, mmY);''',
    '''  const richBody = page.querySelector<HTMLElement>("[data-letter-pdf-richtext]");
  if (richBody) {
    addRichLetterText(pdf, page, richBody, font, mmX, mmY);
    addLetterListMarkers(pdf, page, richBody, font, mmX, mmY);
    addLetterTableBorders(pdf, page, richBody, mmX, mmY);
  }
  addLetterRules(pdf, page, mmX, mmY);''',
    1,
)
pdf_text = pdf_text.replace(
    '''          for (const rule of clonedDocument.querySelectorAll<HTMLElement>(
            "[data-letter-pdf-rule], [data-letter-pdf-richtext] hr",
          )) {
            rule.style.setProperty("border-color", "transparent", "important");
            rule.style.setProperty("background", "transparent", "important");
          }''',
    '''          for (const rule of clonedDocument.querySelectorAll<HTMLElement>(
            "[data-letter-pdf-rule], [data-letter-pdf-richtext] hr",
          )) {
            rule.style.setProperty("border-color", "transparent", "important");
            rule.style.setProperty("background", "transparent", "important");
          }
          for (const cell of clonedDocument.querySelectorAll<HTMLElement>(
            "[data-letter-pdf-richtext] table[data-letter-table] td",
          )) {
            cell.style.setProperty("border-color", "transparent", "important");
          }''',
    1,
)
pdf_path.write_text(pdf_text)

NEW_TEST = r'''  test("letter layout controls and Word-like formatting persist", async ({ page }) => {
    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    // Das Feld wird erst clientseitig aus dem Dossier befüllt und ist damit unser Hydration-Signal.
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    await page.getByRole("button", { name: "Absender Rechts" }).click();
    await page.getByRole("button", { name: "Empfänger Rechts" }).click();
    await page.getByRole("button", { name: "Ort & Datum Rechts" }).click();
    await page.getByLabel("Trennlinie nach Absender").check();
    await page.getByLabel("Trennlinie nach Empfänger").check();

    const preview = page.getByLabel("Vorschau Anschreiben");
    await expect(preview.locator('[data-letter-section="sender"]')).toHaveCSS(
      "text-align",
      "right",
    );
    await expect(preview.locator('[data-letter-section="recipient"]')).toHaveCSS(
      "text-align",
      "right",
    );
    await expect(preview.locator('[data-letter-section="date"]')).toHaveCSS("text-align", "right");
    await expect(preview.locator('[data-letter-pdf-rule="sender"]')).toBeVisible();
    await expect(preview.locator('[data-letter-pdf-rule="recipient"]')).toBeVisible();

    const body = page.getByRole("textbox", { name: "Brieftext" });
    await body.evaluate((element) => {
      element.innerHTML = "<div>Absatz eins formatiert</div><div>Absatz zwei bleibt separat</div>";
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });

    const selectBlock = async (index: number) => {
      await body.evaluate((element, blockIndex) => {
        const block = element.children.item(blockIndex);
        if (!block) throw new Error(`Brieftext-Block ${blockIndex} fehlt`);
        const range = document.createRange();
        range.selectNodeContents(block);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      }, index);
    };

    await selectBlock(0);
    await page.getByRole("button", { name: "Fett" }).click();
    await page.getByRole("button", { name: "Kursiv" }).click();
    await page.getByRole("button", { name: "Unterstrichen" }).click();

    await page.getByRole("button", { name: "Liste" }).click();
    await expect(page.getByRole("button", { name: "Bullet" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Strich" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Plus" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Punkt zentriert" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kein Zeichen" })).toBeVisible();
    await page.getByRole("button", { name: "Bullet" }).click();

    await selectBlock(1);
    await page.getByRole("button", { name: "2 Spalten" }).click();
    await expect(page.getByRole("button", { name: "2 Spalten" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Tabelle" }).click();
    await expect(page.getByRole("grid", { name: "Tabellengrösse auswählen" })).toBeVisible();
    await page.getByRole("gridcell", { name: "Tabelle 2 × 3 einfügen" }).hover();
    await expect(page.getByText("2 × 3 Tabelle")).toBeVisible();
    await page.getByRole("gridcell", { name: "Tabelle 2 × 3 einfügen" }).click();

    const previewBody = preview.locator('[data-letter-pdf-richtext="body"]');
    const previewBlocks = previewBody.locator(":scope > div");
    await expect(previewBlocks).toHaveCount(2);
    await expect(previewBlocks.nth(0)).not.toHaveAttribute("data-columns", /.+/);
    await expect(previewBlocks.nth(0)).toHaveAttribute("data-list", "bullet");
    await expect(previewBlocks.nth(1)).toHaveAttribute("data-columns", "2");
    await expect(previewBlocks.nth(1)).toHaveCSS("column-count", "2");
    await expect(previewBlocks.nth(0).locator("strong")).toContainText("Absatz eins formatiert");
    await expect(previewBlocks.nth(0).locator("em")).toContainText("Absatz eins formatiert");
    await expect(previewBlocks.nth(0).locator("u")).toContainText("Absatz eins formatiert");
    expect(
      await previewBlocks.nth(0).evaluate((element) => getComputedStyle(element, "::before").content),
    ).toContain("•");

    const table = previewBody.locator('table[data-letter-table]');
    await expect(table).toHaveCount(1);
    await expect(table.locator("tr")).toHaveCount(2);
    await expect(table.locator("td")).toHaveCount(6);

    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}")))
      .toMatchObject({
        design: {
          senderAlign: "right",
          recipientAlign: "right",
          dateAlign: "right",
          ruleAfterSender: true,
          ruleAfterRecipient: true,
        },
        data: { text: expect.stringContaining("Absatz eins formatiert") },
      });

    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.richTextHtml ?? "",
    );
    expect(saved).toContain("<strong>");
    expect(saved).toContain("<em>");
    expect(saved).toContain("<u>");
    expect(saved).toContain('data-list="bullet"');
    expect(saved).toContain('data-columns="2"');
    expect(saved).toContain("<table data-letter-table>");
    expect(saved).toContain("<td>");
  });'''

replace_between(
    "tests/e2e/dossier-regression.spec.ts",
    '  test("letter layout controls and rich text formatting persist", async ({ page }) => {',
    '\n\n  test("start screen requires the letter',
    NEW_TEST,
)
