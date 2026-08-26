from pathlib import Path


def replace(path: str, old: str, new: str, minimum: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count < minimum:
        raise SystemExit(f"{path}: expected at least {minimum} matches for {old!r}, found {count}")
    file.write_text(text.replace(old, new))


# Main editor: grammatically correct user-facing terminology.
route = "src/routes/anschreiben.tsx"
replace(route, "Bewerbungsbrief für die Lehrstellenbewerbung", "Motivationsschreiben für die Lehrstellenbewerbung")
replace(
    route,
    "Persönlicher Bewerbungsbrief für deine Lehrstellenbewerbung – passend zu Titelblatt und Lebenslauf.",
    "Persönliches Motivationsschreiben für deine Lehrstellenbewerbung – passend zu Titelblatt und Lebenslauf.",
)
replace(route, ">Bewerbungsbrief</h1>", ">Motivationsschreiben</h1>")
replace(route, "Schreibe deinen Bewerbungsbrief hier.", "Schreibe dein Motivationsschreiben hier.")
replace(route, "Bewerbungsbrief", "Motivationsschreiben", minimum=1)  # remaining comments/internal copy only

# Preview wording.
canvas = "src/components/letter/LetterCanvas.tsx"
replace(
    canvas,
    "Hier entsteht dein persönlicher Bewerbungsbrief.",
    "Hier entsteht dein persönliches Motivationsschreiben.",
)
replace(canvas, "Vorschau Bewerbungsbrief", "Vorschau Motivationsschreiben")
replace(canvas, "Bewerbungsbrief", "Motivationsschreiben", minimum=0)

# Start page needs adjective agreement before the generic noun replacement.
index = "src/routes/index.tsx"
replace(index, "Dein persönlicher Bewerbungsbrief", "Dein persönliches Motivationsschreiben")
replace(index, "Miniatur eines Bewerbungsbriefs", "Miniatur eines Motivationsschreibens")
replace(index, "Bewerbungsbrief", "Motivationsschreiben", minimum=1)

# Dossier dialog: fix the old article bug at the same time.
dialog = "src/components/dossier/DossierExportDialog.tsx"
replace(dialog, "Das Bewerbungsbrief fehlt noch.", "Das Motivationsschreiben fehlt noch.")
replace(dialog, "Bewerbungsbrief", "Motivationsschreiben", minimum=1)

# Menus in the other editors.
for path in ["src/routes/titelblatt.tsx", "src/routes/lebenslauf.tsx"]:
    replace(path, "Bewerbungsbrief", "Motivationsschreiben", minimum=1)

# Keep regression selectors/copy aligned with the visible UI.
tests = "tests/e2e/dossier-regression.spec.ts"
replace(tests, "empty saved Bewerbungsbrief", "empty saved Motivationsschreiben")
replace(tests, "Vorschau Bewerbungsbrief", "Vorschau Motivationsschreiben", minimum=1)
replace(tests, 'name: "Bewerbungsbrief"', 'name: "Motivationsschreiben"', minimum=1)
replace(tests, "Bewerbungsbrief", "Motivationsschreiben", minimum=1)

print("Motivationsschreiben UI terminology applied")
