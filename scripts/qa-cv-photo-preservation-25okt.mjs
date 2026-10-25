import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { plugin } from "bun";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));
const domModule = process.env.DOCX_NEXT_DOM_MODULE;
assert(
  domModule && path.isAbsolute(domModule),
  "Set DOCX_NEXT_DOM_MODULE to jsdom 26.1.0 outside the repository.",
);
const { JSDOM } = require(domModule);
assert.equal(require(path.join(domModule, "package.json")).version, "26.1.0");
const mode = process.argv[2] ?? "auto";
const side = process.argv[3] ?? "standard";
assert(["auto", "left", "right", "frei"].includes(mode), "Unsupported saved mode.");
assert(["standard", "mirrored"].includes(side), "Unsupported Sidebar orientation.");

const formPath = path.join(root, "src/components/cv/CvForm.tsx");
const blobHash = (bytes) =>
  crypto
    .createHash("sha1")
    .update("blob " + bytes.length + "\0")
    .update(bytes)
    .digest("hex");
const legacySource = process.env.DOCX_NEXT_CV_FORM_SOURCE;
if (legacySource) {
  const contents = fs.readFileSync(legacySource);
  assert.equal(
    blobHash(contents),
    "6033a46bd6a2180e0b4c668dec2177b54d6cbf9b",
    "Only the pinned pre-fix CvForm is supported.",
  );
  plugin({
    name: "pinned-previous-photo-form",
    setup(builder) {
      builder.onLoad({ filter: /CvForm[.]tsx$/ }, (args) => {
        assert.equal(args.path, formPath);
        return { contents: contents.toString("utf8"), loader: "tsx" };
      });
    },
  });
}
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "https://cv-photo-test.invalid",
  pretendToBeVisual: true,
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Node",
  "Event",
  "CustomEvent",
  "StorageEvent",
  "MouseEvent",
]) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value: key === "window" ? dom.window : dom.window[key],
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
document.documentElement.dataset.dossierTemplate = "modern";
const saved = { mode, xMm: 39, yMm: 51, widthMm: 41, frameColor: "#123456" };
const placeKey = "lebenslauf:photo-place:v1";
const cropKey = "lebenslauf:photo:v2";
window.localStorage.setItem(placeKey, JSON.stringify(saved));
const { DEFAULT_DOSSIER_PHOTO_STYLE } = await import(
  pathToFileURL(path.join(root, "src/lib/dossier-photo.ts")).href
);
window.localStorage.setItem(
  cropKey,
  JSON.stringify({ ...DEFAULT_DOSSIER_PHOTO_STYLE, zoom: 1.75, x: 32, y: 68, borderWidth: 0.4 }),
);
const { setCvLayout, setCvInfoPosition } = await import(
  pathToFileURL(path.join(root, "src/components/cv/layout.ts")).href
);
setCvLayout("modern");
setCvInfoPosition(side);
const { FormCvPerson } = await import(pathToFileURL(formPath).href);
const { emptyCv } = await import(pathToFileURL(path.join(root, "src/components/cv/types.ts")).href);
const { DEFAULT_CV_PHOTO_PLACEMENT } = await import(
  pathToFileURL(path.join(root, "src/components/cv/photo-place.ts")).href
);
const { createElement, StrictMode, act } = require("react");
const { createRoot } = require("react-dom/client");
const person = structuredClone(emptyCv.person);
const originalPerson = structuredClone(person);
let personChanges = 0;
const props = {
  person,
  onChange: () => {
    personChanges++;
  },
  contactLabel: "",
  onContactLabel: () => {},
  personalInfoColons: false,
  onPersonalInfoColons: () => {},
  personalInfoAligned: false,
  onPersonalInfoAligned: () => {},
};
const capture = () =>
  Object.fromEntries(
    Object.keys(window.localStorage)
      .sort()
      .map((key) => [key, window.localStorage.getItem(key)]),
  );
const before = capture();
const host = document.getElementById("root");
const mounted = createRoot(host);
const element = () => createElement(StrictMode, null, createElement(FormCvPerson, props));
await act(async () => {
  mounted.render(element());
});
assert.deepEqual(capture(), before, "Opening the actual form changed saved state.");
await act(async () => {
  mounted.render(element());
});
assert.deepEqual(capture(), before, "Rendering the form again changed saved state.");
assert.deepEqual(person, originalPerson);
assert.equal(personChanges, 0);
const chooseFree = [...host.querySelectorAll("button")].find(
  (button) => button.textContent.trim() === "Frei positionieren",
);
assert.equal(!!chooseFree, mode !== "frei");
if (chooseFree) {
  await act(async () => {
    chooseFree.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  assert.deepEqual(JSON.parse(window.localStorage.getItem(placeKey)), DEFAULT_CV_PHOTO_PLACEMENT);
  assert.equal(
    window.localStorage.getItem(cropKey),
    before[cropKey],
    "Explicit positioning changed the crop.",
  );
  assert.equal(personChanges, 0);
}
await act(async () => {
  mounted.unmount();
});
dom.window.close();
console.log(
  JSON.stringify({
    mode,
    side,
    formSourceGitBlob: blobHash(fs.readFileSync(legacySource ?? formPath)),
    actualReactClientMount: true,
    strictMode: true,
    savedStatePreservedOnMountAndRerender: true,
    personUnchanged: true,
    cropUnchanged: true,
    explicitFreeTransitionChecked: !!chooseFree,
    realBrowserOrWordTest: false,
  }),
);
