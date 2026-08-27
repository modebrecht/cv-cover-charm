from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"ambiguous patch anchor: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Shared history: three genuinely separate pools in localStorage.
# ---------------------------------------------------------------------------
path = Path("src/lib/history.ts")
text = path.read_text()
text = replace_once(
    text,
    '''export const HISTORY_KEYS = {\n  cover: "titelblatt:history",\n  cv: "lebenslauf:history",\n} as const;''',
    '''export const HISTORY_KEYS = {\n  cover: "titelblatt:history",\n  letter: "anschreiben:history",\n  cv: "lebenslauf:history",\n} as const;''',
    "letter history key",
)
text = text.replace(
    "Jedes Dokument hat seine eigene Historie. Am Lebenslauf zu arbeiten darf die\n * Stände des Titelblatts nicht anfassen und umgekehrt.",
    "Jedes Dokument hat seine eigene Historie. Titelblatt, Motivationsschreiben\n * und Lebenslauf dürfen ihre früheren Stände nie gegenseitig überschreiben.",
)
path.write_text(text)


# ---------------------------------------------------------------------------
# Titelblatt + CV: keep the History action in the same fixed menu position even
# before the first snapshot exists. It is simply disabled while the pool is 0.
# The main menu migration has already moved the real history block before wipe.
# ---------------------------------------------------------------------------
for filename in ("src/routes/titelblatt.tsx", "src/routes/lebenslauf.tsx"):
    path = Path(filename)
    text = path.read_text()
    marker = "                  {history.length > 0 && (\n"
    placeholder = '''                  {history.length === 0 ? (\n                    <button\n                      type="button"\n                      disabled\n                      className="flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm opacity-45"\n                    >\n                      <EditorMenuLabel icon={History}>Früheren Stand laden</EditorMenuLabel>\n                      <span className="text-xs text-muted-foreground">0</span>\n                    </button>\n                  ) : null}\n'''
    text = replace_once(text, marker, placeholder + marker, f"{filename} empty history action")
    path.write_text(text)


# ---------------------------------------------------------------------------
# Motivationsschreiben: same autosave protection + its own history pool.
# This patch runs after the menu standardization scripts, so use those generated
# imports/menu anchors deliberately.
# ---------------------------------------------------------------------------
path = Path("src/routes/anschreiben.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import { FileDown } from "lucide-react";\n',
    'import { FileDown, History } from "lucide-react";\n',
    "letter history icon",
)
text = replace_once(
    text,
    'import { EditorMenuLabel } from "@/components/dossier/EditorMenuLabel";\n',
    'import { EditorMenuLabel } from "@/components/dossier/EditorMenuLabel";\nimport { useForeignWrite, usePageVisible } from "@/lib/autosave";\nimport {\n  HISTORY_KEYS,\n  formatWhen,\n  hasContent,\n  pushSnapshot,\n  readHistory,\n  type Snapshot,\n} from "@/lib/history";\n',
    "letter history imports",
)
text = replace_once(
    text,
    '  const [menuOpen, setMenuOpen] = useState(false);\n',
    '  const [menuOpen, setMenuOpen] = useState(false);\n  const [historyOpen, setHistoryOpen] = useState(false);\n  const [history, setHistory] = useState<Snapshot[]>([]);\n',
    "letter history state",
)
text = replace_once(
    text,
    '  const menuRef = useRef<HTMLDivElement>(null);\n',
    '  const menuRef = useRef<HTMLDivElement>(null);\n  const visible = usePageVisible();\n  const { markWritten, changedElsewhere } = useForeignWrite(LETTER_STORAGE_KEY);\n',
    "letter autosave guards",
)
text = replace_once(
    text,
    '''  useEffect(() => {\n    const dossier = refreshSource();\n    let nextData: LetterData = { ...EMPTY_LETTER };''',
    '''  useEffect(() => {\n    const dossier = refreshSource();\n    setHistory(readHistory(HISTORY_KEYS.letter));\n    let nextData: LetterData = { ...EMPTY_LETTER };''',
    "letter history hydration",
)
text = replace_once(
    text,
    '''      if (raw) {\n        const parsed = JSON.parse(raw) as Partial<SavedLetter>;''',
    '''      if (raw) {\n        markWritten(raw);\n        const parsed = JSON.parse(raw) as Partial<SavedLetter>;''',
    "letter initial markWritten",
)
text = replace_once(
    text,
    '  }, [refreshSource]);\n\n  useEffect(() => {\n    const refresh = () => refreshSource();',
    '  }, [refreshSource, markWritten]);\n\n  useEffect(() => {\n    const refresh = () => refreshSource();',
    "letter hydration dependencies",
)

source_refresh = '''  useEffect(() => {\n    const refresh = () => refreshSource();\n    const onStorage = (event: StorageEvent) => {\n      if (event.key === LETTER_STORAGE_KEY) return;\n      refresh();\n    };\n    window.addEventListener("focus", refresh);\n    window.addEventListener("storage", onStorage);\n    return () => {\n      window.removeEventListener("focus", refresh);\n      window.removeEventListener("storage", onStorage);\n    };\n  }, [refreshSource]);\n'''
foreign_effect = source_refresh + '''\n  // Ein zweiter Motivationsschreiben-Tab darf beim Zurückkehren nicht seinen\n  // älteren Zustand über den neueren Autosave schreiben. Im Hintergrund wird\n  // deshalb nicht gespeichert; bei Fokuswechsel gewinnt der frischere Key.\n  useEffect(() => {\n    if (!visible || !hydrated || !changedElsewhere()) return;\n    try {\n      const raw = window.localStorage.getItem(LETTER_STORAGE_KEY);\n      if (!raw) return;\n      const parsed = JSON.parse(raw) as Partial<SavedLetter>;\n      if (parsed.data && typeof parsed.data === "object") {\n        setData({ ...EMPTY_LETTER, ...parsed.data });\n      }\n      if (parsed.design) setDesign(normalizeLetterDesign(parsed.design));\n      markWritten(raw);\n      setHistory(readHistory(HISTORY_KEYS.letter));\n      setSaveState("saved");\n      setTransferNote({\n        kind: "ok",\n        text: "Neuerer Stand aus einem anderen Fenster geladen.",\n      });\n    } catch {\n      setSaveState("error");\n    }\n  }, [visible, hydrated, changedElsewhere, markWritten]);\n'''
text = replace_once(text, source_refresh, foreign_effect, "letter foreign-write protection")

old_save = '''  useEffect(() => {\n    if (!hydrated) return;\n    setSaveState("saving");\n    const timer = window.setTimeout(() => {\n      try {\n        const saved: SavedLetter = { version: 1, data, design };\n        window.localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(saved));\n        setSaveState("saved");\n      } catch {\n        setSaveState("error");\n      }\n    }, 250);\n    return () => window.clearTimeout(timer);\n  }, [data, design, hydrated]);\n'''
new_save = '''  const snapshotPayload = useCallback(\n    (): SavedLetter => ({ version: 1, data, design }),\n    [data, design],\n  );\n\n  const keepSnapshot = useCallback(\n    (label: string, force = false) => {\n      const payload = snapshotPayload() as unknown as Record<string, unknown>;\n      if (!hasContent(payload)) return;\n      setHistory(pushSnapshot(HISTORY_KEYS.letter, payload, label, force));\n    },\n    [snapshotPayload],\n  );\n\n  useEffect(() => {\n    if (!hydrated || !visible) return;\n    setSaveState("saving");\n    const timer = window.setTimeout(() => {\n      try {\n        const saved = snapshotPayload();\n        const raw = JSON.stringify(saved);\n        window.localStorage.setItem(LETTER_STORAGE_KEY, raw);\n        markWritten(raw);\n        setSaveState("saved");\n        keepSnapshot("Automatisch");\n      } catch {\n        setSaveState("error");\n      }\n    }, 250);\n    return () => window.clearTimeout(timer);\n  }, [hydrated, visible, snapshotPayload, markWritten, keepSnapshot]);\n'''
text = replace_once(text, old_save, new_save, "letter isolated autosave + history")

text = replace_once(
    text,
    '''    const close = (event: PointerEvent) => {\n      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);\n    };''',
    '''    const close = (event: PointerEvent) => {\n      if (!menuRef.current?.contains(event.target as Node)) {\n        setMenuOpen(false);\n        setHistoryOpen(false);\n      }\n    };''',
    "letter outside close history",
)
text = replace_once(
    text,
    '''  }, [menuOpen]);\n\n  const template = useMemo(''',
    '''  }, [menuOpen]);\n\n  useEffect(() => {\n    if (!menuOpen) setHistoryOpen(false);\n  }, [menuOpen]);\n\n  const template = useMemo(''',
    "letter history closes with menu",
)

restore_anchor = '  const anySource = !!source && (source.hasPersonal || source.hasApplication || source.hasDesign);\n'
restore_code = '''  const restoreSnapshot = (snap: Snapshot) => {\n    keepSnapshot("Vor dem Zurückholen", true);\n    const saved = snap.payload as Partial<SavedLetter>;\n    if (saved.data && typeof saved.data === "object") {\n      setData({ ...EMPTY_LETTER, ...saved.data });\n    }\n    if (saved.design) setDesign(normalizeLetterDesign(saved.design));\n    setMenuOpen(false);\n    setHistoryOpen(false);\n    setTransferNote({\n      kind: "ok",\n      text: `Stand von ${formatWhen(snap.at)} geladen.`,\n    });\n  };\n\n'''
text = replace_once(text, restore_anchor, restore_code + restore_anchor, "letter restoreSnapshot")

own_pdf_block = '''              <button\n                type="button"\n                onClick={() => {\n                  setMenuOpen(false);\n                  void downloadMotivationLetter();\n                }}\n                disabled={letterOverflow || !letterHasStarted(data)}\n                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"\n              >\n                <EditorMenuLabel icon={FileDown}>\n                  Nur Motivationsschreiben als PDF\n                </EditorMenuLabel>\n                <span className="text-xs text-muted-foreground">.pdf</span>\n              </button>\n'''
history_menu = own_pdf_block + '''              <button\n                type="button"\n                onClick={() => setHistoryOpen((value) => !value)}\n                disabled={history.length === 0}\n                className="flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"\n              >\n                <EditorMenuLabel icon={History}>Früheren Stand laden</EditorMenuLabel>\n                <span className="text-xs text-muted-foreground">{history.length}</span>\n              </button>\n              {historyOpen && history.length > 0 ? (\n                <div className="max-h-56 overflow-y-auto border-t bg-muted/20 p-1">\n                  {history.slice(0, 8).map((snap) => (\n                    <button\n                      key={snap.id}\n                      type="button"\n                      data-letter-history-item\n                      onClick={() => restoreSnapshot(snap)}\n                      className="flex w-full items-center justify-between gap-3 rounded px-2 py-2 text-left text-xs hover:bg-accent"\n                    >\n                      <span className="truncate font-medium">{snap.label}</span>\n                      <span className="shrink-0 text-muted-foreground">{formatWhen(snap.at)}</span>\n                    </button>\n                  ))}\n                </div>\n              ) : null}\n'''
text = replace_once(text, own_pdf_block, history_menu, "letter history menu")
path.write_text(text)


# ---------------------------------------------------------------------------
# Regression coverage: menu parity + restoring a letter snapshot must only
# touch the letter's own localStorage keys.
# ---------------------------------------------------------------------------
path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()
text = replace_once(
    text,
    '        await expect(menu.locator("[data-editor-menu-label]")).toHaveText(item.ownPdf);',
    '        await expect(menu.locator("[data-editor-menu-label]")).toHaveText([\n          item.ownPdf,\n          "Früheren Stand laden",\n        ]);',
    "letter menu includes history",
)

marker = '  test("document editors expose one consistent overview home link", async ({ page }) => {'
history_test = '''  test("Motivationsschreiben keeps autosave and earlier states in its own pool", async ({ page }) => {\n    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });\n    const sentinels = await page.evaluate(() => {\n      localStorage.clear();\n      const cover = JSON.stringify({\n        version: 7,\n        data: { vorname: "Cover", nachname: "Pool", beruf: "Informatiker/in EFZ" },\n      });\n      const cv = JSON.stringify({\n        version: 1,\n        data: { person: { vorname: "CV", nachname: "Pool" } },\n      });\n      localStorage.setItem("titelblatt:v3", cover);\n      localStorage.setItem("lebenslauf:v1", cv);\n      localStorage.setItem(\n        "anschreiben:v1",\n        JSON.stringify({\n          version: 1,\n          data: {\n            anrede: "Guten Tag",\n            gruss: "Freundliche Grüsse",\n            betreff: "Aktueller Betreff",\n          },\n          design: {},\n        }),\n      );\n      localStorage.setItem(\n        "anschreiben:history",\n        JSON.stringify([\n          {\n            id: "letter-old",\n            at: Date.now() - 60_000,\n            label: "Älterer Brief",\n            payload: {\n              version: 1,\n              data: {\n                anrede: "Guten Tag",\n                gruss: "Freundliche Grüsse",\n                betreff: "Alter Betreff",\n              },\n            },\n          },\n        ]),\n      );\n      return { cover, cv };\n    });\n    await page.reload({ waitUntil: "domcontentloaded" });\n\n    const downloadToggle = page.getByRole("button", { name: "Download", exact: true });\n    await expect(downloadToggle).toHaveAttribute("data-editor-ready", "true");\n    await expect(page.getByLabel("Titel / Betreff")).toHaveValue("Aktueller Betreff");\n    await downloadToggle.click();\n\n    const historyButton = page\n      .locator("[data-editor-action-menu] button")\n      .filter({ hasText: "Früheren Stand laden" });\n    await expect(historyButton).toBeEnabled();\n    await historyButton.click();\n    await page.locator("[data-letter-history-item]").first().click();\n    await expect(page.getByLabel("Titel / Betreff")).toHaveValue("Alter Betreff");\n\n    await page.waitForFunction(() => {\n      const raw = localStorage.getItem("anschreiben:v1");\n      if (!raw) return false;\n      return JSON.parse(raw).data?.betreff === "Alter Betreff";\n    });\n    const pools = await page.evaluate(() => ({\n      cover: localStorage.getItem("titelblatt:v3"),\n      cv: localStorage.getItem("lebenslauf:v1"),\n      letterHistory: JSON.parse(localStorage.getItem("anschreiben:history") ?? "[]"),\n      coverHistory: localStorage.getItem("titelblatt:history"),\n      cvHistory: localStorage.getItem("lebenslauf:history"),\n    }));\n    expect(pools.cover).toBe(sentinels.cover);\n    expect(pools.cv).toBe(sentinels.cv);\n    expect(pools.letterHistory.length).toBeGreaterThanOrEqual(1);\n    expect(pools.coverHistory).toBeNull();\n    expect(pools.cvHistory).toBeNull();\n  });\n\n'''
text = replace_once(text, marker, history_test + marker, "letter history regression")
path.write_text(text)
