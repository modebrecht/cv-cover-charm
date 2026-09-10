import { test } from "bun:test";
import { readFileSync } from "node:fs";
import { format } from "prettier";

test("prints canonical release formatting for the Warm layout test", async () => {
  const path = new URL("./letter-layout-system.test.ts", import.meta.url);
  const source = readFileSync(path, "utf8");
  const formatted = await format(source, {
    filepath: "tests/unit/letter-layout-system.test.ts",
    printWidth: 100,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
  });

  console.log("PRETTIER_OUTPUT_BEGIN");
  console.log(formatted);
  console.log("PRETTIER_OUTPUT_END");
});
