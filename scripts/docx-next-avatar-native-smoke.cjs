/** Node-only executable smoke of the real native DOCX avatar shape serializer.
 * Does not claim app exports, Word geometry or Save/Reopen acceptance.
 */
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const dir = mkdtempSync(path.join(os.tmpdir(), 'docx-avatar-shape-'));
try {
  const root = process.env.DOCX_NEXT_SMOKE_SOURCE_DIR ?? path.resolve(__dirname, '..', 'src', 'lib', 'docx-next');
  for (const name of ['xml', 'native-text-shape']) {
    const source = readFileSync(path.join(root, name + '.ts'), 'utf8');
    const transpiled = ts.transpileModule(source, {
      fileName: name + '.ts',
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    assert.equal(transpiled.diagnostics?.length ?? 0, 0, name + ' transpilation diagnostics');
    writeFileSync(path.join(dir, name + '.js'), transpiled.outputText);
  }
  const { nativeTextShapeRun } = require(path.join(dir, 'native-text-shape.js'));
  const cases = [
    { name: 'Verlauf', size: 54, x: 78, y: 46, fill: undefined, border: 'FFFFFF' },
    { name: 'Neon', size: 50, x: 132, y: 26, fill: '0D0B2B', border: 'F8FAFC' },
    { name: 'Warm/Freundlich', size: 60, x: 75, y: 82, fill: 'FFF9EF', border: '0F766E' },
  ];
  for (const item of cases) {
    const frame = {
      id: 'cover.photo.native-avatar', xMm: item.x, yMm: item.y, widthMm: item.size,
      paragraphs: [{ id: 'cover.photo.initials', text: 'LM' }],
      surface: { heightMm: item.size, radiusMm: item.size / 2,
        fillColor: item.fill, borderWidthMm: 0.26458333, borderColor: item.border,
        paddingXMm: 0, paddingYMm: 0, verticalAlign: 'center' },
    };
    const xml = nativeTextShapeRun(frame, 17,
      p => `<w:p><w:r><w:t>${p.text}</w:t></w:r></w:p>`);
    assert.equal((xml.match(/<a:arcTo /g) || []).length, 4, item.name);
    assert.equal((xml.match(/<wps:txbx>/g) || []).length, 1, item.name);
    assert(xml.includes('<w:t>LM</w:t>'), item.name);
    assert(xml.includes('anchor="ctr"'), item.name);
    assert(xml.includes(`name="cover.photo.native-avatar"`), item.name);
    assert(xml.includes(`<wp:posOffset>${Math.round(item.x * 36000)}</wp:posOffset>`), item.name);
    assert(xml.includes(`<wp:posOffset>${Math.round(item.y * 36000)}</wp:posOffset>`), item.name);
    assert(xml.includes(`wR="${Math.round((item.size / 2) * 36000)}"`), item.name);
    assert(xml.includes(`val="${item.border}"`), item.name);
    if (item.fill) assert(xml.includes(`val="${item.fill}"`), item.name);
    else assert(xml.includes('<a:noFill/>'), item.name);
    // Basic balanced-tag integrity for generated DrawingML fragment.
    const stack = [];
    for (const match of xml.matchAll(/<(\/?)([A-Za-z_][\w.:-]*)(?:\s[^<>]*?)?\s*(\/?)>/g)) {
      const [, close, tag, selfClose] = match;
      if (close) assert.equal(stack.pop(), tag, item.name + ' nested markup');
      else if (!selfClose) stack.push(tag);
    }
    assert.deepEqual(stack, [], item.name + ' unclosed XML tags');
    console.log(`${item.name}: native avatar XML smoke PASS`);
  }
  assert.throws(() => nativeTextShapeRun({ id:'bad',widthMm:50,paragraphs:[] }, 1, () => ''),
    /missing native text-shape surface/);
  console.log('3/3 variants PASS; missing-surface guard PASS; no app/Word acceptance implied');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
