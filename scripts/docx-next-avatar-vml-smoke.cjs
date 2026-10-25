/** Test the isolated diagnostic VML shape serializer; not an app/Word acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const root = process.env.DOCX_NEXT_SMOKE_SOURCE_DIR ??
  path.resolve(__dirname, '..', 'src', 'lib', 'docx-next');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-vml-smoke-'));
try {
  for (const name of ['xml', 'native-vml-avatar']) {
    const source = fs.readFileSync(path.join(root, name + '.ts'), 'utf8');
    const result = ts.transpileModule(source, {
      fileName: name + '.ts', reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    });
    assert.equal(result.diagnostics?.length ?? 0, 0);
    fs.writeFileSync(path.join(out, name + '.js'), result.outputText);
  }
  const { nativeVMLAvatarRun } = require(path.join(out, 'native-vml-avatar.js'));
  for (const [name, x, y, size, ink, fill] of [
    ['Verlauf', 78, 46, 54, 'FFFFFF', undefined],
    ['Neon', 132, 26, 50, 'F8FAFC', '0D0B2B'],
    ['Freundlich', 75, 82, 60, '0F766E', 'FFF9EF'],
  ]) {
    const frame = { id: 'cover.photo.native-avatar', xMm: x, yMm: y, widthMm: size,
      paragraphs: [{ id: 'cover.photo.initials', text: 'LM' }],
      surface: { diagnosticShapeFormat: 'legacy-vml', heightMm: size,
        radiusMm: size / 2, verticalAlign: 'center',
        borderColor: ink, borderWidthMm: 0.26458333,
        fillColor: fill, paddingXMm: 0, paddingYMm: 0 } };
    const xml = nativeVMLAvatarRun(frame, 17, p =>
      '<w:sdt><w:sdtContent><w:p><w:r><w:t>' + p.text +
      '</w:t></w:r></w:p></w:sdtContent></w:sdt>');
    assert(xml.includes('<w:pict><v:oval'), name);
    assert(xml.includes('id="cover.photo.native-avatar-17"'), name);
    assert(xml.includes('strokecolor="#' + ink + '"'), name);
    assert(xml.includes('margin-left:' + (x * 72 / 25.4).toFixed(3) + 'pt'), name);
    assert(xml.includes('margin-top:' + (y * 72 / 25.4).toFixed(3) + 'pt'), name);
    assert(xml.includes('<w:trHeight w:val="' + Math.round(size * 1440 / 25.4) + '" w:hRule="exact"/>'), name);
    assert(xml.includes('<w:vAlign w:val="center"/>'), name);
    assert(xml.includes('<w:t>LM</w:t>'), name);
    assert(xml.includes('<w:txbxContent><w:tbl>'), name);
    if (fill) assert(xml.includes('fillcolor="#' + fill + '"'), name);
    else assert(xml.includes('filled="f"'), name);
    const tags = [];
    for (const [, close, tag, self] of xml.matchAll(/<(\/?)([A-Za-z_][\w.:-]*)(?:\s[^<>]*?)?\s*(\/?)>/g)) {
      if (close) assert.equal(tags.pop(), tag);
      else if (!self) tags.push(tag);
    }
    assert.deepEqual(tags, [], name);
    console.log(name + ': VML diagnostic smoke PASS');
  }
  assert.throws(() => nativeVMLAvatarRun({ widthMm: 50,
    surface: { diagnosticShapeFormat: 'wrong' } }, 1, () => ''),
    /invalid diagnostic VML avatar/);
  console.log('3/3 source VML serialization PASS; does not certify Word');
} finally { fs.rmSync(out, { recursive: true, force: true }); }
