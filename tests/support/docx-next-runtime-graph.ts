import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import ts from "typescript";

export const DOCX_NEXT_RUNTIME_ROOTS = [
  "export",
  "source",
  "source-adapter",
  "snapshot",
  "build-model",
  "model",
  "renderer",
  "images",
  "decoration",
].map((name) => `src/lib/docx-next/${name}.ts`);

export type RuntimeEdge = {
  kind: "static" | "dynamic" | "require";
  specifier: string;
  target: string;
};
export type RuntimeGraph = {
  roots: string[];
  modules: Record<string, RuntimeEdge[]>;
  externals: string[];
  unresolved: string[];
};

/** Follow emitted imports, including re-exports and lazy imports, rather than type references.
 * The project's TypeScript emitter erases both explicit and inferred type-only edges.
 * CSS/assets are recorded as leaves; DOCX's boundary rejects browser styles entirely.
 */
export function docxRuntimeGraph(
  roots = DOCX_NEXT_RUNTIME_ROOTS,
  project = process.cwd(),
): RuntimeGraph {
  const configPath = resolve(project, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error)
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const { options, errors } = ts.parseJsonConfigFileContent(config.config, ts.sys, project);
  if (errors.length)
    throw new Error(
      errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n")).join("\n"),
    );
  const emitted = new Map<string, string>();
  const program = ts.createProgram(
    roots.map((root) => resolve(project, root)),
    {
      ...options,
      noEmit: false,
      declaration: false,
      emitDeclarationOnly: false,
      sourceMap: false,
      allowImportingTsExtensions: false,
    },
  );
  program.emit(undefined, (file, text, _bom, _error, sources) => {
    if (/\.[cm]?jsx?$/.test(file))
      for (const source of sources ?? []) emitted.set(resolve(source.fileName), text);
  });
  const local = (file: string) => relative(project, file).replaceAll("\\", "/");
  const result: RuntimeGraph = { roots, modules: {}, externals: [], unresolved: [] };
  const pending = roots.map((root) => resolve(project, root));
  const external = new Set<string>();
  while (pending.length) {
    const file = pending.shift()!;
    const id = local(file);
    if (Object.hasOwn(result.modules, id)) continue;
    const edges: RuntimeEdge[] = [];
    result.modules[id] = edges;
    const text = emitted.get(file);
    if (text === undefined) {
      if (/\.[cm]?[jt]sx?$/.test(file) || !existsSync(file))
        result.unresolved.push(`${id}: no emitted runtime module`);
      continue;
    }
    const source = ts.createSourceFile(
      `${file}.js`,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JSX,
    );
    const add = (argument: ts.Expression | undefined, kind: RuntimeEdge["kind"]) => {
      if (!argument || !ts.isStringLiteralLike(argument)) {
        result.unresolved.push(`${id}: nonliteral ${kind} ${argument?.getText(source) ?? ""}`);
        return;
      }
      const specifier = argument.text;
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        external.add(specifier);
        edges.push({ kind, specifier, target: specifier });
        return;
      }
      const resolved = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule;
      const target = resolved?.resolvedFileName ?? resolve(dirname(file), specifier);
      edges.push({ kind, specifier, target: local(target) });
      pending.push(target);
    };
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier)
        add(node.moduleSpecifier as ts.Expression, "static");
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], "dynamic");
        else if (ts.isIdentifier(node.expression) && node.expression.text === "require")
          add(node.arguments[0], "require");
        else if (
          ts.isPropertyAccessExpression(node.expression) &&
          ["glob", "globEager", "require"].includes(node.expression.name.text)
        )
          result.unresolved.push(
            `${id}: indirect module loading ${node.expression.getText(source)}`,
          );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  result.externals = [...external].sort();
  return result;
}

/** No external package is needed by this closure. Any new one requires an explicit audit.
 * Snapshot capture may read stores upstream; the core must not reach back into capture.
 */
export function docxBoundaryViolations(graph: RuntimeGraph): string[] {
  const core = new Set<string>();
  const pending = graph.roots.filter((root) =>
    /\/(?:export|build-model|model|renderer|images|decoration)\.ts$/.test(root),
  );
  while (pending.length) {
    const file = pending.shift()!;
    if (core.has(file)) continue;
    core.add(file);
    pending.push(...(graph.modules[file] ?? []).map((edge) => edge.target));
  }
  return [
    ...graph.unresolved,
    ...graph.externals.map((name) => `unapproved runtime package: ${name}`),
    ...Object.keys(graph.modules)
      .filter(
        (file) =>
          /\.(?:css|scss|less)$/.test(file) ||
          /(?:^|\/)(?:dossier-(?:pdf(?:-|\.)|native-print|docx(?:-|\.))|(?:[^/]+-)?preflight\.)/.test(
            file,
          ),
      )
      .map((file) => `PDF/Print/legacy runtime module: ${file}`),
    ...[...core]
      .filter((file) => /\/docx-next\/snapshot\.ts$/.test(file))
      .map((file) => `core reaches mutable snapshot capture: ${file}`),
  ];
}
