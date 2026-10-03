import { DECL, PR, R, xml } from "./xml";
import { writeZipEntries, DOCX_MIME_TYPE, type ZipEntry } from "./zip";

export type PackagePart = ZipEntry & { contentType: string };
export type Relationship = { source: string; id: string; type: string; target: string };
const MAIN = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
export class WordPackage {
  readonly parts = new Map<string, PackagePart>();
  readonly relationships: Relationship[] = [];
  add(name: string, contentType: string, value: string | Uint8Array): void {
    if (this.parts.has(name)) throw new Error(`Duplicate package part ${name}`);
    if (!/^[\w./-]+$/.test(name) || name.includes("..") || name.startsWith("/"))
      throw new Error(`Unsafe package part ${name}`);
    this.parts.set(name, {
      name,
      contentType,
      bytes: typeof value === "string" ? new TextEncoder().encode(value) : value,
    });
  }
  relate(source: string, id: string, type: string, target: string): void {
    if (this.relationships.some((rel) => rel.source === source && rel.id === id))
      throw new Error(`Duplicate relationship ${source}:${id}`);
    this.relationships.push({ source, id, type: `${R}/${type}`, target });
  }
  entries(): ZipEntry[] {
    const entries: ZipEntry[] = [...this.parts.values()];
    const types = [...this.parts.values()]
      .map(
        (part) =>
          `<Override PartName="/${xml(part.name)}" ContentType="${xml(part.contentType)}"/>`,
      )
      .join("");
    entries.push({
      name: "[Content_Types].xml",
      bytes: new TextEncoder().encode(
        `${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>${types}</Types>`,
      ),
    });
    for (const source of new Set(this.relationships.map((rel) => rel.source))) {
      const slash = source.lastIndexOf("/");
      const path = source
        ? `${source.slice(0, slash + 1)}_rels/${source.slice(slash + 1)}.rels`
        : "_rels/.rels";
      const relationships = this.relationships
        .filter((rel) => rel.source === source)
        .map(
          (rel) =>
            `<Relationship Id="${xml(rel.id)}" Type="${xml(rel.type)}" Target="${xml(rel.target)}"/>`,
        )
        .join("");
      entries.push({
        name: path,
        bytes: new TextEncoder().encode(
          `${DECL}<Relationships xmlns="${PR}">${relationships}</Relationships>`,
        ),
      });
    }
    return entries;
  }
  blob(): Blob {
    return new Blob([writeZipEntries(this.entries())], { type: DOCX_MIME_TYPE });
  }
}
export const WORD_PART_TYPES = {
  document: MAIN,
  styles: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
  settings: "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml",
  fontTable: "application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml",
  numbering: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
  header: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
  footer: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
};
