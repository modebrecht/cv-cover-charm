from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, got {count}")
    path.write_text(text.replace(old, new, 1))


reg = Path("tests/e2e/dossier-regression.spec.ts")
transfer = Path("tests/e2e/dossier-transfer-regression.spec.ts")
workflow = Path(".github/workflows/refresh-dossier-smoke-contracts.yml")
script = Path(".github/scripts/refresh-dossier-smoke-contracts.py")

replace_once(
    reg,
    '''    await expect(page.getByRole("heading", { name: "Motivationsschreiben" })).toBeVisible();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Beispiel AG",
    );
    await expect(page.getByLabel("PLZ und Ort").nth(1)).toHaveValue("4500 Solothurn");''',
    '''    await expect(page.getByRole("heading", { name: "Motivationsschreiben" })).toBeVisible();
    await page.getByRole("button", { name: "Meine Kontaktdaten", exact: true }).click();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");
    await expect(page.getByLabel("PLZ und Ort")).toHaveValue("4500 Solothurn");
    await page.getByRole("button", { name: "Firma / Lehrbetrieb", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Beispiel AG",
    );''',
    "inheritance section visibility",
)

replace_once(
    reg,
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    const body = page.getByRole("textbox", { name: "Brieftext" });''',
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Meine Kontaktdaten", exact: true }).click();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    const body = page.getByRole("textbox", { name: "Brieftext" });''',
    "overflow hydration section",
)

replace_once(
    reg,
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    // Das Feld wird erst clientseitig aus dem Dossier befüllt und ist damit unser Hydration-Signal.
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    await page.getByRole("button", { name: "Meine Kontaktdaten Rechts" }).click();''',
    '''    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    // Das Feld wird erst clientseitig aus dem Dossier befüllt und ist damit unser Hydration-Signal.
    await page.getByRole("button", { name: "Meine Kontaktdaten", exact: true }).click();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    await page.getByRole("button", { name: "Meine Kontaktdaten Rechts" }).click();''',
    "layout hydration section",
)

replace_once(
    reg,
    '''      {
        path: "/titelblatt",
        ownPdf: "Nur Titelblatt als PDF",
        full: true,
      },
      {
        path: "/lebenslauf",
        ownPdf: "Nur Lebenslauf als PDF",
        full: true,
      },
      {
        path: "/anschreiben",
        ownPdf: "Nur Motivationsschreiben als PDF",
        full: false,
      },''',
    '''      {
        path: "/titelblatt",
        ownPdf: "Nur Titelblatt als PDF",
        reset: "Titelblatt zurücksetzen",
        full: true,
      },
      {
        path: "/lebenslauf",
        ownPdf: "Nur Lebenslauf als PDF",
        reset: "Lebenslauf zurücksetzen",
        full: true,
      },
      {
        path: "/anschreiben",
        ownPdf: "Nur Motivationsschreiben als PDF",
        reset: "Motivationsschreiben zurücksetzen",
        full: false,
      },''',
    "context reset cases",
)
replace_once(
    reg,
    '''          "Früheren Stand laden",
          "Alles zurücksetzen",
        ]);''',
    '''          "Früheren Stand laden",
          item.reset,
        ]);''',
    "full menu reset label",
)
replace_once(
    reg,
    '''        await expect(menu.locator("[data-editor-menu-label]")).toHaveText([
          item.ownPdf,
          "Beispieldaten übernehmen",
          "Früheren Stand laden",
        ]);''',
    '''        await expect(menu.locator("[data-editor-menu-label]")).toHaveText([
          item.ownPdf,
          "Beispieldaten übernehmen",
          "Früheren Stand laden",
          item.reset,
        ]);''',
    "letter menu reset label",
)

replace_once(
    transfer,
    '''    await expect(body).toHaveText("Mein eigener Brieftext bleibt erhalten.");
    await takeover.getByRole("button", { name: "Alles übernehmen", exact: true }).click();

    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Mia Keller");''',
    '''    await expect(body).toHaveText("Mein eigener Brieftext bleibt erhalten.");
    await takeover.getByRole("button", { name: "Alles übernehmen", exact: true }).click();

    const personal = await openSection(page, /^Meine Kontaktdaten/);
    await expect(personal.getByLabel("Vorname und Nachname")).toHaveValue("Mia Keller");''',
    "transfer personal section visibility",
)

replace_once(
    transfer,
    '''    const box = await image.boundingBox();
    if (!box) throw new Error("flow image has no bounding box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 80, box.y + box.height / 2 + 30, { steps: 5 });
    await page.mouse.up();''',
    '''    const box = await image.boundingBox();
    const layerBox = await preview.locator("[data-letter-text-layer]").first().boundingBox();
    if (!box) throw new Error("flow image has no bounding box");
    if (!layerBox) throw new Error("letter text layer has no bounding box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(layerBox.x + layerBox.width * 0.2, box.y + box.height / 2 + 30, {
      steps: 8,
    });
    await page.mouse.up();''',
    "flow image drag target",
)

workflow.unlink()
script.unlink()
