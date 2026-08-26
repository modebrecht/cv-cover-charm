from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


cv_path = Path("src/routes/lebenslauf.tsx")
cv = cv_path.read_text()

anchor = '''  /** Gespeicherten Lebenslauf übernehmen. Gibt zurück, ob es einen gab. */
  const loadFromStorage = useCallback((): boolean => {
'''
helper = '''  /**
   * Titelblatt als gemeinsame Quelle für den CV verwenden.
   *
   * Das ist bewusst dieselbe Komplettübernahme für den ersten leeren CV und
   * für den grossen manuellen Button. CV-eigene Inhalte wie Schule oder
   * Erfahrung bleiben dabei unangetastet; gemeinsame Personendaten und das
   * gesamte übertragbare Design kommen vom Titelblatt.
   */
  const applyEverythingFromCover = useCallback((draft: CoverDraft) => {
    setCover(draft);
    setDesign((current) => ({
      ...current,
      template: draft.template,
      colors: draft.colors,
      font: draft.font ?? undefined,
      titleScale: draft.fontScale,
      headingScale: draft.fontScale,
      bodyScale: draft.fontScale,
      useElements: draft.elements.length > 0,
    }));
    setElements(draft.elements);
    setElementStyles({});
    setCvPhotoStyle(draft.photoStyle);
    setData((current) => ({
      ...current,
      person: { ...current.person, ...draft.person },
    }));
    setLastCoverFingerprint(coverDraftFingerprint(draft));
  }, []);

  /** Gespeicherten Lebenslauf übernehmen und den gelesenen Stand zurückgeben. */
  const loadFromStorage = useCallback((): Partial<Saved> | null => {
'''
if anchor not in cv:
    raise SystemExit("loadFromStorage anchor missing")
cv = cv.replace(anchor, helper, 1)

cv = cv.replace('''    if (!saved) return false;
    try {
      const p = JSON.parse(saved) as Partial<Saved>;
      applySaved(p);
      markWritten(saved);
      setSaveState("saved");
      return true;
    } catch {
      return false;
    }
  }, [markWritten, applySaved]);
''', '''    if (!saved) return null;
    try {
      const p = JSON.parse(saved) as Partial<Saved>;
      applySaved(p);
      markWritten(saved);
      setSaveState("saved");
      return p;
    } catch {
      return null;
    }
  }, [markWritten, applySaved]);
''', 1)

old_effect = '''    if (loadFromStorage()) return;

    // Erster Besuch: alles vom Titelblatt übernehmen – dieselbe Wirkung wie
    // der Knopf mit allen Haken, damit beide Wege dasselbe Ergebnis liefern.
    if (draft) {
      setDesign((d) => ({
        ...d,
        template: draft.template,
        colors: draft.colors,
        font: draft.font ?? undefined,
        titleScale: draft.fontScale,
        headingScale: draft.fontScale,
        bodyScale: draft.fontScale,
        useElements: draft.elements.length > 0,
      }));
      setElements(draft.elements);
      setElementStyles({});
      if (draft.person.foto) setCvPhotoStyle(draft.photoStyle);
      if (personFilled(draft.person)) {
        setData((d) => ({ ...d, person: { ...d.person, ...draft.person } }));
      }
      setLastCoverFingerprint(coverDraftFingerprint(draft));
    }
'''
new_effect = '''    const stored = loadFromStorage();
    const storedData = stored?.data
      ? {
          ...emptyCv,
          ...stored.data,
          person: { ...emptyCv.person, ...stored.data.person },
        }
      : null;

    // Ein leerer, früher automatisch gespeicherter CV zählt weiterhin als
    // "noch nicht begonnen". Sonst würde genau dieser leere Save die sinnvolle
    // Erstübernahme vom Titelblatt dauerhaft blockieren.
    if (storedData && cvHasContent(storedData)) return;

    if (draft) applyEverythingFromCover(draft);
'''
if old_effect not in cv:
    raise SystemExit("first-open effect anchor missing")
cv = cv.replace(old_effect, new_effect, 1)

cv = cv.replace('''    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Zurück im Tab: ein anderes Fenster hat womöglich neuer geschrieben. */
''', '''    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyEverythingFromCover]);

  /* Zurück im Tab: ein anderes Fenster hat womöglich neuer geschrieben. */
''', 1)

active_anchor = '''  const activeTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === design.template) ?? TEMPLATES[0],
    [design.template],
  );
'''
active_new = active_anchor + '''  const coverTemplateName = useMemo(
    () => (cover ? TEMPLATES.find((template) => template.id === cover.template)?.name ?? cover.template : null),
    [cover],
  );
'''
if active_anchor not in cv:
    raise SystemExit("active template anchor missing")
cv = cv.replace(active_anchor, active_new, 1)

sync_anchor = '''  const syncFromCover = useCallback(() => {
'''
sync_all = '''  const syncAllFromCover = useCallback(() => {
    const draft = readCoverDraft();
    setCover(draft);
    if (!draft) {
      setStatus({ kind: "error", text: "Es gibt noch kein gespeichertes Titelblatt." });
      return;
    }

    keepSnapshot("Vor kompletter Titelblatt-Übernahme", true);
    applyEverythingFromCover(draft);
    setTakeover({
      template: true,
      colors: true,
      typography: true,
      elements: true,
      photo: true,
      person: true,
    });
    const templateName =
      TEMPLATES.find((template) => template.id === draft.template)?.name ?? draft.template;
    setStatus({
      kind: "ok",
      text: `Alles vom Titelblatt übernommen · Vorlage ${templateName}`,
    });
  }, [applyEverythingFromCover, keepSnapshot]);

  const syncFromCover = useCallback(() => {
'''
if sync_anchor not in cv:
    raise SystemExit("sync anchor missing")
cv = cv.replace(sync_anchor, sync_all, 1)

ui_anchor = '''            {coverChanged ? (
'''
ui_block = '''            <div className="rounded-lg border bg-primary/5 p-3">
              <div className="text-sm font-semibold">Titelblatt als Ausgangspunkt</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {cover
                  ? `Übernimmt persönliche Angaben, Foto, Vorlage ${coverTemplateName ? `„${coverTemplateName}“` : ""}, Farben, Schrift und Formen.`
                  : "Speichere zuerst ein Titelblatt. Danach kannst du Daten und Design mit einem Klick übernehmen."}
              </p>
              <button
                type="button"
                onClick={syncAllFromCover}
                disabled={!cover}
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Alles vom Titelblatt übernehmen
              </button>
            </div>

            {coverChanged ? (
'''
if ui_anchor not in cv:
    raise SystemExit("top UI anchor missing")
cv = cv.replace(ui_anchor, ui_block, 1)

cv = cv.replace('''                  >
                    Übernehmen
                  </button>
''', '''                  >
                    Auswahl übernehmen
                  </button>
''', 1)

cv_path.write_text(cv)

# Add one regression: an empty persisted CV must still inherit the title page,
# and the prominent all-in-one button must re-sync a later title-page change.
test_path = Path("tests/e2e/dossier-regression.spec.ts")
test_text = test_path.read_text()
test_anchor = '  test("PDF export downloads a non-empty PDF from the export CV pages only", async ({ page }) => {'
if test_anchor not in test_text:
    raise SystemExit("E2E insertion anchor missing")
new_test = '''  test("empty saved CV inherits the full title page and can re-sync everything", async ({ page }) => {
    const cover = coverPayload();
    cover.template = "pastell";
    cover.colors = {
      pastell: { bg: "#fff7ed", primary: "#7c2d12", accent: "#fb923c" },
    };
    cover.font = "serif";
    cover.fontScale = 1.15;

    const emptyStoredCv = cvPayload({ template: "modern" });
    emptyStoredCv.data = {
      person: {
        vorname: "",
        nachname: "",
        adresse: "",
        plzOrt: "",
        telefon: "",
        email: "",
        geburtsdatum: "",
        nationalitaet: "",
        untertitel: "",
        foto: null,
      },
      schule: [],
      erfahrung: [],
      sprachen: [],
      hobbys: [],
      staerken: [],
      referenzen: [],
      labels: {},
      hidden: {},
    };

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ titlePage, cv }) => {
        localStorage.clear();
        localStorage.setItem("titelblatt:v3", JSON.stringify(titlePage));
        localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      },
      { titlePage: cover, cv: emptyStoredCv },
    );
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });

    const takeAll = page.getByRole("button", { name: "Alles vom Titelblatt übernehmen" });
    await expect(takeAll).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
          return {
            template: saved.design?.template,
            font: saved.design?.font,
            vorname: saved.data?.person?.vorname,
          };
        }),
      )
      .toEqual({ template: "pastell", font: "serif", vorname: "Lea" });

    await page.evaluate(() => {
      const titlePage = JSON.parse(localStorage.getItem("titelblatt:v3") ?? "{}");
      titlePage.template = "modern";
      titlePage.colors = {
        ...(titlePage.colors ?? {}),
        modern: { bg: "#ffffff", primary: "#172554", accent: "#38bdf8" },
      };
      titlePage.font = "sans";
      titlePage.data.vorname = "Mia";
      localStorage.setItem("titelblatt:v3", JSON.stringify(titlePage));
    });

    await takeAll.click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
          return {
            template: saved.design?.template,
            accent: saved.design?.colors?.accent,
            font: saved.design?.font,
            vorname: saved.data?.person?.vorname,
          };
        }),
      )
      .toEqual({ template: "modern", accent: "#38bdf8", font: "sans", vorname: "Mia" });
  });

'''
test_path.write_text(test_text.replace(test_anchor, new_test + test_anchor, 1))
