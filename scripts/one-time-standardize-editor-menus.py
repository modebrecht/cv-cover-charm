from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"ambiguous patch anchor: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


def swap_history_before_wipe(text: str, wipe_marker: str, history_marker: str) -> str:
    wipe_start = text.index(wipe_marker)
    history_start = text.index(history_marker, wipe_start)
    dropdown_end = text.index("\n                </div>\n              )}", history_start)
    wipe = text[wipe_start:history_start].rstrip()
    history = text[history_start:dropdown_end].rstrip()
    return text[:wipe_start] + history + "\n\n" + wipe + text[dropdown_end:]


component = Path("src/components/dossier/EditorMenuLabel.tsx")
component.write_text(
    '''import type { LucideIcon } from "lucide-react";\n\nexport function EditorMenuLabel({\n  icon: Icon,\n  children,\n}: {\n  icon: LucideIcon;\n  children: React.ReactNode;\n}) {\n  return (\n    <span data-editor-menu-label className="flex min-w-0 items-center gap-2">\n      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.7} />\n      <span className="truncate">{children}</span>\n    </span>\n  );\n}\n'''
)

# Titelblatt
path = Path("src/routes/titelblatt.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import { ThemeToggle } from "@/components/cover/ThemeToggle";\n',
    'import { ThemeToggle } from "@/components/cover/ThemeToggle";\nimport { FileDown, Files, FolderOpen, History, MoveDiagonal2, RotateCcw, Save, Sparkles } from "lucide-react";\nimport { EditorMenuLabel } from "@/components/dossier/EditorMenuLabel";\n',
    "titelblatt imports",
)
text = replace_once(
    text,
    '<div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-md border bg-popover shadow-lg">',
    '<div data-editor-action-menu className="absolute right-0 mt-2 w-72 overflow-hidden rounded-md border bg-popover shadow-lg">',
    "titelblatt menu container",
)
replacements = [
    ('<span>Ganzes Dossier als PDF</span>', '<EditorMenuLabel icon={Files}>Ganzes Dossier als PDF</EditorMenuLabel>', "titelblatt whole pdf"),
    ('<span>Nur Titelblatt als PDF</span>', '<EditorMenuLabel icon={FileDown}>Nur Titelblatt als PDF</EditorMenuLabel>', "titelblatt own pdf"),
    ('<span>Dossier speichern</span>', '<EditorMenuLabel icon={Save}>Dossier speichern</EditorMenuLabel>', "titelblatt save"),
    ('<span>Dossier laden</span>', '<EditorMenuLabel icon={FolderOpen}>Dossier laden</EditorMenuLabel>', "titelblatt load"),
    ('<span>Positionen &amp; Grössen zurücksetzen</span>', '<EditorMenuLabel icon={MoveDiagonal2}>Positionen &amp; Grössen zurücksetzen</EditorMenuLabel>', "titelblatt layout reset"),
    ('<span>Früheren Stand laden</span>', '<EditorMenuLabel icon={History}>Früheren Stand laden</EditorMenuLabel>', "titelblatt history"),
]
for old, new, label in replacements:
    text = replace_once(text, old, new, label)
text = replace_once(
    text,
    'className="w-full border-t px-3 py-2 text-left text-sm hover:bg-accent"\n                    >\n                      Beispieldaten\n',
    'className="flex w-full items-center border-t px-3 py-2 text-left text-sm hover:bg-accent"\n                    >\n                      <EditorMenuLabel icon={Sparkles}>Beispieldaten übernehmen</EditorMenuLabel>\n',
    "titelblatt demo label",
)
text = replace_once(
    text,
    'className="w-full border-t px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"\n                    >\n                      Alles zurücksetzen\n',
    'className="flex w-full items-center border-t px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"\n                    >\n                      <EditorMenuLabel icon={RotateCcw}>Alles zurücksetzen</EditorMenuLabel>\n',
    "titelblatt wipe label",
)
text = swap_history_before_wipe(
    text,
    '                  {/* Werkseinstellung – zweistufig, weil dabei alles verloren geht */}',
    '                  {/*\n                    Ganz unten und zunächst zugeklappt:',
)
path.write_text(text)

# Lebenslauf
path = Path("src/routes/lebenslauf.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import { ThemeToggle } from "@/components/cover/ThemeToggle";\n',
    'import { ThemeToggle } from "@/components/cover/ThemeToggle";\nimport { FileDown, Files, FolderOpen, History, MoveDiagonal2, RotateCcw, Save, Sparkles } from "lucide-react";\nimport { EditorMenuLabel } from "@/components/dossier/EditorMenuLabel";\n',
    "cv imports",
)
text = replace_once(
    text,
    '<div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-md border bg-popover shadow-lg">',
    '<div data-editor-action-menu className="absolute right-0 mt-2 w-72 overflow-hidden rounded-md border bg-popover shadow-lg">',
    "cv menu container",
)
replacements = [
    ('<span>Ganzes Dossier als PDF</span>', '<EditorMenuLabel icon={Files}>Ganzes Dossier als PDF</EditorMenuLabel>', "cv whole pdf"),
    ('<span>Nur Lebenslauf als PDF</span>', '<EditorMenuLabel icon={FileDown}>Nur Lebenslauf als PDF</EditorMenuLabel>', "cv own pdf"),
    ('<span>Dossier speichern</span>', '<EditorMenuLabel icon={Save}>Dossier speichern</EditorMenuLabel>', "cv save"),
    ('<span>Dossier laden</span>', '<EditorMenuLabel icon={FolderOpen}>Dossier laden</EditorMenuLabel>', "cv load"),
    ('<span>Positionen &amp; Grössen zurücksetzen</span>', '<EditorMenuLabel icon={MoveDiagonal2}>Positionen &amp; Grössen zurücksetzen</EditorMenuLabel>', "cv layout reset"),
    ('<span>Früheren Stand laden</span>', '<EditorMenuLabel icon={History}>Früheren Stand laden</EditorMenuLabel>', "cv history"),
]
for old, new, label in replacements:
    text = replace_once(text, old, new, label)
text = replace_once(
    text,
    'className="w-full border-t px-3 py-2 text-left text-sm hover:bg-accent"\n                    >\n                      Beispieldaten\n',
    'className="flex w-full items-center border-t px-3 py-2 text-left text-sm hover:bg-accent"\n                    >\n                      <EditorMenuLabel icon={Sparkles}>Beispieldaten übernehmen</EditorMenuLabel>\n',
    "cv demo label",
)
text = replace_once(
    text,
    'className="w-full border-t px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"\n                    >\n                      Alles zurücksetzen\n',
    'className="flex w-full items-center border-t px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"\n                    >\n                      <EditorMenuLabel icon={RotateCcw}>Alles zurücksetzen</EditorMenuLabel>\n',
    "cv wipe label",
)
text = swap_history_before_wipe(
    text,
    '                  {/* Wie im Titelblatt: zweistufig, weil dabei alles verloren geht. */}',
    '                  {history.length > 0 && (',
)
path.write_text(text)

# Motivationsschreiben: move the existing PDF action into the same top-right menu pattern.
path = Path("src/routes/anschreiben.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import { useCallback, useEffect, useMemo, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useRef, useState } from "react";',
    "letter react import",
)
text = replace_once(
    text,
    'import { ThemeToggle } from "@/components/cover/ThemeToggle";\n',
    'import { ThemeToggle } from "@/components/cover/ThemeToggle";\nimport { FileDown } from "lucide-react";\nimport { EditorMenuLabel } from "@/components/dossier/EditorMenuLabel";\n',
    "letter imports",
)
text = replace_once(
    text,
    '  const [panelOpen, setPanelOpen] = useState(true);\n',
    '  const [panelOpen, setPanelOpen] = useState(true);\n  const [menuOpen, setMenuOpen] = useState(false);\n',
    "letter menu state",
)
text = replace_once(
    text,
    '  const [takeover, setTakeover] = useState({\n',
    '  const menuRef = useRef<HTMLDivElement>(null);\n  const [takeover, setTakeover] = useState({\n',
    "letter menu ref",
)
anchor = '''  useEffect(() => {\n    if (!transferNote) return;\n    const timer = window.setTimeout(() => setTransferNote(null), 6000);\n    return () => window.clearTimeout(timer);\n  }, [transferNote]);\n'''
addition = anchor + '''\n  useEffect(() => {\n    if (!menuOpen) return;\n    const close = (event: PointerEvent) => {\n      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);\n    };\n    document.addEventListener("pointerdown", close);\n    return () => document.removeEventListener("pointerdown", close);\n  }, [menuOpen]);\n'''
text = replace_once(text, anchor, addition, "letter outside-click effect")
text = replace_once(
    text,
    '        <SaveStatus state={saveState} />\n        <ThemeToggle />\n',
    '''        <SaveStatus state={saveState} />\n        <ThemeToggle />\n        <div className="relative" ref={menuRef}>\n          <button\n            type="button"\n            onClick={() => setMenuOpen((value) => !value)}\n            disabled={pdfDownloading}\n            aria-expanded={menuOpen}\n            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:px-4"\n          >\n            {pdfDownloading ? "PDF…" : "Download"}\n            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">\n              <path\n                d="M3 4.5l3 3 3-3"\n                fill="none"\n                stroke="currentColor"\n                strokeWidth="1.5"\n                strokeLinecap="round"\n                strokeLinejoin="round"\n              />\n            </svg>\n          </button>\n          {menuOpen ? (\n            <div\n              data-editor-action-menu\n              className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-md border bg-popover shadow-lg"\n            >\n              <button\n                type="button"\n                onClick={() => {\n                  setMenuOpen(false);\n                  void downloadMotivationLetter();\n                }}\n                disabled={letterOverflow || !letterHasStarted(data)}\n                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"\n              >\n                <EditorMenuLabel icon={FileDown}>\n                  Nur Motivationsschreiben als PDF\n                </EditorMenuLabel>\n                <span className="text-xs text-muted-foreground">.pdf</span>\n              </button>\n            </div>\n          ) : null}\n        </div>\n''',
    "letter header menu",
)
old_download_card = '''            <div className="rounded-lg border bg-background p-3">\n              <button\n                type="button"\n                onClick={downloadMotivationLetter}\n                disabled={pdfDownloading || letterOverflow || !letterHasStarted(data)}\n                className="w-full rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"\n              >\n                {pdfDownloading\n                  ? "PDF wird erstellt…"\n                  : "Motivationsschreiben als PDF herunterladen"}\n              </button>\n              {pdfError ? (\n                <div role="status" className="mt-2 text-xs text-destructive">\n                  {pdfError}\n                </div>\n              ) : null}\n              {letterOverflow ? (\n                <p className="mt-2 text-[11px] text-muted-foreground">\n                  PDF-Download ist verfügbar, sobald alles auf eine A4-Seite passt.\n                </p>\n              ) : null}\n            </div>\n'''
new_error = '''            {pdfError ? (\n              <div role="status" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">\n                {pdfError}\n              </div>\n            ) : null}\n'''
text = replace_once(text, old_download_card, new_error, "letter sidebar pdf card")
path.write_text(text)

# Regression test for order, wording and icon presence.
path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()
marker = '  test("document editors expose one consistent overview home link", async ({ page }) => {'
test_block = '''  test("editor action menus share order, wording and monochrome icon labels", async ({ page }) => {\n    const cases = [\n      {\n        path: "/titelblatt",\n        ownPdf: "Nur Titelblatt als PDF",\n        full: true,\n      },\n      {\n        path: "/lebenslauf",\n        ownPdf: "Nur Lebenslauf als PDF",\n        full: true,\n      },\n      {\n        path: "/anschreiben",\n        ownPdf: "Nur Motivationsschreiben als PDF",\n        full: false,\n      },\n    ] as const;\n\n    for (const item of cases) {\n      await page.goto(`${BASE_URL}${item.path}`, { waitUntil: "domcontentloaded" });\n      await page.evaluate(() => localStorage.clear());\n      await page.reload({ waitUntil: "domcontentloaded" });\n\n      await page.getByRole("button", { name: "Download", exact: true }).click();\n      let menu = page.locator("[data-editor-action-menu]");\n      await expect(menu).toBeVisible();\n\n      if (item.full) {\n        await page.getByRole("button", { name: "Beispieldaten übernehmen", exact: true }).click();\n        await page.getByRole("button", { name: "Ja", exact: true }).click();\n        await page.getByRole("button", { name: "Download", exact: true }).click();\n        menu = page.locator("[data-editor-action-menu]");\n        await expect(menu).toBeVisible();\n\n        const labels = await menu.locator("[data-editor-menu-label]").allTextContents();\n        expect(labels).toEqual([\n          "Ganzes Dossier als PDF",\n          item.ownPdf,\n          "Dossier speichern",\n          "Dossier laden",\n          "Beispieldaten übernehmen",\n          "Positionen & Grössen zurücksetzen",\n          "Früheren Stand laden",\n          "Alles zurücksetzen",\n        ]);\n      } else {\n        await expect(menu.locator("[data-editor-menu-label]")).toHaveText(item.ownPdf);\n      }\n\n      const labels = menu.locator("[data-editor-menu-label]");\n      await expect(labels.locator("svg")).toHaveCount(await labels.count());\n    }\n  });\n\n'''
text = replace_once(text, marker, test_block + marker, "menu regression insertion")
path.write_text(text)
