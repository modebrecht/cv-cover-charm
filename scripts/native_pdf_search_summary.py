"""Summarize literal gates separately from diagnostic whitespace reconstruction."""
from collections import Counter
import argparse
import json
import re
from pathlib import Path


def compact(text):
    return re.sub(r"\s+", "", text).lower()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    catalog = json.loads((args.directory / "catalog/results.json").read_text())
    readers = json.loads((args.directory / "catalog/readers.json").read_text())
    actual = {row["file"]: row for row in readers["rows"]}
    rows = []
    for row in catalog["rows"]:
        results = {}
        for cap in row["captures"]:
            channels = {}
            for engine in ["pdfjs", "mupdf", "pdfium"]:
                pages = cap["pages"] if engine == "pdfjs" else actual[cap["file"]]["pages"]
                texts = [p["text" if engine == "pdfjs" else engine] for p in pages]
                cv = "\n".join(t for i, t in enumerate(texts) if row["canonical"][i]["kind"] == "cv")
                letter = "\n".join(t for i, t in enumerate(texts) if row["canonical"][i]["kind"] == "letter")
                fields = []
                for query in cap["queries"]:
                    phrase, text = query["phrase"], texts[query["page"]]
                    literal = phrase.lower() in text.lower()
                    fields.append({**query, "literal": literal,
                                   "diagnosticCompactPresent": compact(phrase) in compact(text),
                                   "classification": "literal-pass" if literal else
                                   "reader-whitespace-or-run-segmentation" if compact(phrase) in compact(text) else
                                   "requires-content-or-encoding-inspection"})
                mismatches = []
                for i, source in enumerate(row["canonical"]):
                    if source["kind"] == "cover":
                        continue  # Decorative artwork/raster labels are inventoried separately.
                    expected, found = compact(source["text"]), compact(texts[i])
                    # Count occurrences of source lexical words in the complete
                    # compact stream. This is only a loss/duplication diagnostic.
                    for word in set(re.findall(r"[^\W\d_]+", source["text"].lower())):
                        if expected.count(word) != found.count(word):
                            mismatches.append({"page": i, "word": word,
                                               "expected": expected.count(word), "found": found.count(word)})
                # Only experience/education anchors establish the CV header
                # order; sidebar language entries may precede the main header.
                entries = [f for f in fields if "data-cv-entry-title=" in f["tag"] and
                           any(word in f["phrase"].lower() for word in ("schule", "schnupperlehre"))]
                name = next(f["phrase"] for f in fields if "data-cv-name=" in f["tag"])
                title = next(f["phrase"] for f in fields if "data-cv-doc-title=" in f["tag"])
                cv_compact = compact(cv)
                first_entry = min((cv_compact.find(compact(f["phrase"])) for f in entries), default=-1)
                unicode_words = sorted(set(re.findall(r"[^\W\d_]+", "\n".join(p["text"] for p in row["canonical"] if p["kind"] != "cover"))))
                unicode_words = [word for word in unicode_words if not word.isascii()]
                channels[engine] = {
                    "literalFamilie": bool(re.search(r"\bfamilie\b", cv, re.I)),
                    "fields": fields,
                    "recipientLiteral": [phrase in letter for phrase in row["recipient"]],
                    "unicodeLiteral": {word: word.lower() in "\n".join(texts).lower() for word in unicode_words},
                    "cvTitleAndNameBeforeEntries": 0 <= cv_compact.find(compact(title)) < first_entry and
                                                  0 <= cv_compact.find(compact(name)) < first_entry,
                    "letterRecipientBeforeSalutationBeforeClosing":
                        0 <= compact(letter).find(compact(row["recipient"][0])) <
                        compact(letter).find(compact(row["recipient"][2])) <
                        compact(letter).find(compact("Freundliche Grüsse")),
                    "diagnosticWordCountMismatches": mismatches,
                }
            results[cap["kind"]] = {"file": cap["file"], "sha256": cap["sha256"], "channels": channels}
        delta = max(abs(a-b) for p, q in zip(row["canonical"], row["printGeometry"])
                    for n, m in zip(p["nodes"], q["nodes"])
                    for a, b in zip(n["box"], m["box"]))
        rows.append({"id": row["id"], "template": row["template"], "fixtureHash": row["fixtureHash"],
                     "pageCount": len(row["canonical"]), "canonicalToPrintMaxBoxDeltaMm": delta, "results": results})
    totals = {}
    for kind in ["automatic", "native"]:
        totals[kind] = {}
        for engine in ["pdfjs", "mupdf", "pdfium"]:
            channels = [row["results"][kind]["channels"][engine] for row in rows]
            fields = [field for channel in channels for field in channel["fields"]]
            totals[kind][engine] = {
                "literalFamilie": sum(c["literalFamilie"] for c in channels),
                "literalFields": sum(f["literal"] for f in fields), "totalFields": len(fields),
                "recipientAllLiteral": sum(all(c["recipientLiteral"]) for c in channels),
                "titleNameOrder": sum(c["cvTitleAndNameBeforeEntries"] for c in channels),
                "letterOrder": sum(c["letterRecipientBeforeSalutationBeforeClosing"] for c in channels),
                "diagnosticWordCountMismatches": sum(len(c["diagnosticWordCountMismatches"]) for c in channels),
                "unresolvedFieldLoss": sum(not f["diagnosticCompactPresent"] for f in fields),
                "unicodeFailures": Counter(word for c in channels for word, ok in c["unicodeLiteral"].items() if not ok),
            }
    result = {"source": catalog["source"], "browser": catalog["browser"], "engines": readers["engines"],
              "catalogCount": len(rows), "totals": totals, "rows": rows,
              "acceptance": "NO-GO for production-grade native search; whitespace reconstruction is diagnostic only"}
    (args.directory / "summary.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(totals, ensure_ascii=False))


if __name__ == "__main__":
    main()
