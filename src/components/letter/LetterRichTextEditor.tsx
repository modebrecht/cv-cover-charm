import { useEffect, useRef, useState } from "react";
import {
  letterRichHtml,
  richHtmlToPlainText,
  sanitizeLetterRichHtml,
} from "@/components/letter/rich-text";

const toolClass =
  "rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = letterRichHtml(richTextHtml, text);
    if (next === lastEmitted.current) return;
    if (editor.innerHTML !== next) editor.innerHTML = next;
    setEmpty(!richHtmlToPlainText(next));
  }, [richTextHtml, text]);

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
  };

  const insertRule = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand("insertHorizontalRule", false);
    emit();
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
          className={`${toolClass} font-bold`}
          aria-label="Fett"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("bold")}
        >
          B
        </button>
        <button
          type="button"
          className={`${toolClass} italic`}
          aria-label="Kursiv"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("italic")}
        >
          I
        </button>
        <button
          type="button"
          className={`${toolClass} underline`}
          aria-label="Unterstrichen"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => command("underline")}
        >
          U
        </button>
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
            Warum möchtest du diesen Beruf lernen? Warum passt dieser Betrieb zu dir? Was bringst du mit?
          </div>
        ) : null}
        <div
          ref={editorRef}
          role="textbox"
          aria-label="Brieftext"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
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
        Markiere Text und wähle Fett, Kursiv oder Unterstrichen. Mit ─ fügst du an der Cursorposition eine Trennlinie ein.
      </p>
    </div>
  );
}
