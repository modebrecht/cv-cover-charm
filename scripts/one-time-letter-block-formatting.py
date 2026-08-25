from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1))


EDITOR = r'''import { useEffect, useRef, useState } from "react";
import {
  letterRichHtml,
  richHtmlToPlainText,
  sanitizeLetterRichHtml,
} from "@/components/letter/rich-text";
import type { LetterBodyColumns } from "@/components/letter/types";

const toolClass =
  "rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const activeToolClass = "bg-primary text-primary-foreground hover:bg-primary/90";

type ToolbarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  columns: LetterBodyColumns | null;
};

function topLevelBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
  if (!node) return null;
  let current: Node | null = node;
  while (current?.parentNode && current.parentNode !== editor) current = current.parentNode;
  if (!(current instanceof HTMLElement) || current.parentElement !== editor) return null;
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
    if (node instanceof HTMLHRElement) continue;
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
  const [empty, setEmpty] = useState(!text.trim() && !richTextHtml?.trim());
  const [toolbar, setToolbar] = useState<ToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    columns: 1,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = letterRichHtml(richTextHtml, text);
    if (next === lastEmitted.current) return;
    if (editor.innerHTML !== next) editor.innerHTML = next;
    setEmpty(!richHtmlToPlainText(next));
  }, [richTextHtml, text]);

  const readToolbarState = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || !selection.anchorNode || !editor.contains(selection.anchorNode))
      return;

    const range = selection.getRangeAt(0);
    const blocks = existingSelectedBlocks(editor, range);
    const fallback = topLevelBlock(editor, selection.anchorNode);
    const selected = blocks.length ? blocks : fallback ? [fallback] : [];
    const columnValues = selected.length
      ? selected.map(columnsForBlock)
      : ([1] as LetterBodyColumns[]);
    const columns = columnValues.every((value) => value === columnValues[0])
      ? columnValues[0]
      : null;

    setToolbar({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      columns,
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
    editor.focus();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand(name, false);
    emit();
    readToolbarState();
  };

  const setColumns = (columns: LetterBodyColumns) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    editor.focus();
    const range = selection.getRangeAt(0);
    const blocks = ensureSelectedBlocks(editor, range);
    for (const block of blocks) {
      if (columns === 1) delete block.dataset.columns;
      else block.dataset.columns = String(columns);
    }
    emit();
    setToolbar((current) => ({ ...current, columns }));
  };

  const insertRule = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand("insertHorizontalRule", false);
    emit();
    readToolbarState();
  };

  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-foreground">Brieftext</span>
      <div className="flex flex-wrap gap-1.5 rounded-t-md border border-b-0 bg-muted/30 p-2">
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
        Markiere Text für Fett, Kursiv oder Unterstrichen. 1, 2 und 3 gelten für den aktuellen oder
        markierten Absatz – verschiedene Absätze können unterschiedliche Spalten haben. Mit ─ fügst
        du an der Cursorposition eine Trennlinie ein.
      </p>
    </div>
  );
}
'''

Path("src/components/letter/LetterRichTextEditor.tsx").write_text(EDITOR)

replace_once(
    "src/components/letter/rich-text.ts",
    '  if (ALLOWED_BLOCK.has(tag)) return `<div>${children || "<br>"}</div>`;',
    '''  if (ALLOWED_BLOCK.has(tag)) {
    const columns = element.dataset.columns === "2" || element.dataset.columns === "3"
      ? ` data-columns="${element.dataset.columns}"`
      : "";
    return `<div${columns}>${children || "<br>"}</div>`;
  }''',
)

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
marker = "/* Letter rich-text block columns */"
if marker not in css:
    css += r'''

/* Letter rich-text block columns */
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
'''
    styles.write_text(css)

old_test = r'''    const body = page.getByRole("textbox", { name: "Brieftext" });
    await body.fill("Formatiert");
    await body.press("Control+A");
    await page.getByRole("button", { name: "Fett" }).click();
    await page.getByRole("button", { name: "Kursiv" }).click();
    await page.getByRole("button", { name: "Unterstrichen" }).click();
    await page.getByRole("button", { name: "3 Spalten" }).click();
    await expect(page.getByRole("button", { name: "3 Spalten" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await body.click();
    await body.press("End");
    await page.getByRole("button", { name: "Trennlinie einfügen" }).click();

    await expect(preview.locator('[data-letter-pdf-richtext="body"] strong')).toContainText(
      "Formatiert",
    );
    await expect(preview.locator('[data-letter-pdf-richtext="body"] em')).toContainText(
      "Formatiert",
    );
    await expect(preview.locator('[data-letter-pdf-richtext="body"] u')).toContainText(
      "Formatiert",
    );
    await expect(preview.locator('[data-letter-pdf-richtext="body"] hr')).toHaveCount(1);
    await expect(preview.locator('[data-letter-pdf-richtext="body"]')).toHaveCSS(
      "column-count",
      "3",
    );
    await expect(page.getByRole("button", { name: "Formatierung entfernen" })).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}")))
      .toMatchObject({
        design: {
          senderAlign: "right",
          recipientAlign: "right",
          dateAlign: "right",
          ruleAfterSender: true,
          ruleAfterRecipient: true,
          bodyColumns: 3,
        },
        data: { text: "Formatiert" },
      });

    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.richTextHtml ?? "",
    );
    expect(saved).toContain("<strong>");
    expect(saved).toContain("<em>");
    expect(saved).toContain("<u>");
    expect(saved).toContain("<hr>");'''

new_test = r'''    const body = page.getByRole("textbox", { name: "Brieftext" });
    await body.fill("Erster Absatz");
    await body.press("End");
    await body.press("Enter");
    await body.type("Formatiert zweiter Absatz");

    await body.evaluate((editor) => {
      const blocks = Array.from(editor.children).filter((element) =>
        ["DIV", "P"].includes(element.tagName),
      );
      const target = blocks.at(-1) ?? editor;
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.getByRole("button", { name: "Fett" }).click();
    await page.getByRole("button", { name: "Kursiv" }).click();
    await page.getByRole("button", { name: "Unterstrichen" }).click();
    await page.getByRole("button", { name: "2 Spalten" }).click();
    await expect(page.getByRole("button", { name: "2 Spalten" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const previewBody = preview.locator('[data-letter-pdf-richtext="body"]');
    const previewBlocks = previewBody.locator(":scope > div");
    await expect(previewBlocks).toHaveCount(2);
    await expect(previewBlocks.nth(0)).not.toHaveAttribute("data-columns", /.+/);
    await expect(previewBlocks.nth(1)).toHaveAttribute("data-columns", "2");
    await expect(previewBlocks.nth(1)).toHaveCSS("column-count", "2");
    await expect(previewBlocks.nth(1).locator("strong")).toContainText("Formatiert");
    await expect(previewBlocks.nth(1).locator("em")).toContainText("Formatiert");
    await expect(previewBlocks.nth(1).locator("u")).toContainText("Formatiert");

    await body.click();
    await body.press("End");
    await page.getByRole("button", { name: "Trennlinie einfügen" }).click();
    await expect(previewBody.locator("hr")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Formatierung entfernen" })).toBeVisible();

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
        data: { text: "Erster Absatz\nFormatiert zweiter Absatz" },
      });

    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.richTextHtml ?? "",
    );
    expect(saved).toContain('data-columns="2"');
    expect(saved).toContain("<strong>");
    expect(saved).toContain("<em>");
    expect(saved).toContain("<u>");
    expect(saved).toContain("<hr>");'''
replace_once("tests/e2e/dossier-regression.spec.ts", old_test, new_test)
