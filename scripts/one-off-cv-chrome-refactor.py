from pathlib import Path
import re

BASE_SHA = "8324551d90c42f8f4d7c907afb84621712eee90a"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)


cv_path = Path("src/components/cv/CvCanvas.tsx")
cv = cv_path.read_text()
cv = replace_once(
    cv,
    'import { DossierSheetBackground } from "@/components/dossier/DossierSheetBackground";\n',
    'import { DossierHeaderFooterChrome } from "@/components/dossier/DossierHeaderFooterChrome";\nimport { DossierSheetBackground } from "@/components/dossier/DossierSheetBackground";\n',
    "CvCanvas import",
)
cv = replace_once(
    cv,
    '            {chrome(i)}\n            {layout === "modern" && modernSidebar(i)}',
    '''            {chrome(i)}
            <DossierHeaderFooterChrome
              scope="cv"
              template={design.template}
              colors={design.colors}
              contact={{
                name,
                address: p.adresse ?? "",
                place: p.plzOrt ?? "",
                phone: p.telefon ?? "",
                email: p.email ?? "",
              }}
              pageIndex={i}
              footerLeft={name || "Lebenslauf"}
              footerRight={`Seite ${i + 1}`}
            />
            {layout === "modern" && modernSidebar(i)}''',
    "CvCanvas chrome insertion",
)
cv_path.write_text(cv)

bg_path = Path("src/components/dossier/DossierSheetBackground.tsx")
bg = bg_path.read_text()
bg = replace_once(
    bg,
    'import { getCurrentCvChromeContact } from "@/lib/dossier-chrome";\nimport { DossierHeaderFooterChrome } from "./DossierHeaderFooterChrome";\n',
    "",
    "background chrome imports",
)
bg, count = re.subn(
    r'\n  const contact = getCurrentCvChromeContact\(\);\n  const chrome = \(\n    <DossierHeaderFooterChrome[\s\S]*?\n  \);\n',
    "\n",
    bg,
    count=1,
)
if count != 1:
    raise SystemExit(f"background chrome block: expected 1 match, got {count}")
bg, chrome_children = re.subn(r"^\s*\{chrome\}\n", "", bg, flags=re.MULTILINE)
if chrome_children != 3:
    raise SystemExit(f"background chrome children: expected 3, got {chrome_children}")
bg_path.write_text(bg)

chrome_path = Path("src/lib/dossier-chrome.ts")
chrome = chrome_path.read_text()
chrome, count = re.subn(
    r'\nconst EMPTY_CONTACT: DossierChromeContact = \{[\s\S]*?\n\};\n',
    "\n",
    chrome,
    count=1,
)
if count != 1:
    raise SystemExit(f"EMPTY_CONTACT: expected 1 match, got {count}")
chrome = replace_once(
    chrome,
    "let cached: DossierChromeState | null = null;\nlet currentCvContact: DossierChromeContact = EMPTY_CONTACT;\n",
    "let cached: DossierChromeState | null = null;\n",
    "currentCvContact cache",
)
chrome, count = re.subn(
    r'\nexport function setCurrentCvChromeContact\([\s\S]*?\nexport function getCurrentCvChromeContact\(\): DossierChromeContact \{\n  return currentCvContact;\n\}\n?',
    "\n",
    chrome,
    count=1,
)
if count != 1:
    raise SystemExit(f"CV contact globals: expected 1 match, got {count}")
chrome_path.write_text(chrome)

test_path = Path("tests/unit/dossier-sheet-background.test.tsx")
test = test_path.read_text()
test = replace_once(
    test,
    '      expect(markup).toContain(\'data-dossier-chrome="cv"\');\n',
    '      expect(markup).not.toContain(\'data-dossier-chrome="cv"\');\n',
    "background architecture assertion",
)
test = replace_once(
    test,
    '  test("every dossier template renders the shared non-brief background", () => {',
    '  test("every dossier template renders a motif-only shared non-brief background", () => {',
    "background test title",
)
test_path.write_text(test)
