import fs from "node:fs";

const file = "src/lib/i18n.ts";
const source = fs.readFileSync(file, "utf8");

function fail(message) {
  console.error(`i18n check failed: ${message}`);
  process.exitCode = 1;
}

function readConstObject(name) {
  const start = source.indexOf(`const ${name}: Dictionary = {`);
  if (start === -1) return null;

  const open = source.indexOf("{", start);
  let depth = 0;

  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(open + 1, i);
  }

  return null;
}

function readKeys(name) {
  const body = readConstObject(name);
  if (!body) return null;

  return new Set([...body.matchAll(/^\s*"((?:\\.|[^"\\])+)":/gm)].map((match) => match[1]));
}

const localesMatch = source.match(/export const locales = \[([^\]]+)\] as const;/);
const locales = localesMatch ? [...localesMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]) : [];
if (!locales.length) fail("could not read locale list");

const dictionariesMatch = source.match(/const dictionaries: Record<Locale, Dictionary> = \{([\s\S]*?)\n\};/);
const dictionariesBody = dictionariesMatch?.[1] ?? "";

for (const locale of locales) {
  if (!new RegExp(`(^|\\n)\\s*${locale}(\\s*:|\\s*,)`).test(dictionariesBody)) {
    fail(`locale "${locale}" is not wired into dictionaries`);
  }
  if (!new RegExp(`\\b${locale}: \\{ name:`).test(source)) {
    fail(`locale "${locale}" is missing localeMeta`);
  }
}

const faKeys = readKeys("fa");
const arKeys = readKeys("ar");
if (!faKeys || !arKeys) {
  fail("could not read Arabic/Persian dictionaries");
} else {
  const faMissing = [...arKeys].filter((key) => !faKeys.has(key));
  const arMissing = [...faKeys].filter((key) => !arKeys.has(key));

  if (faMissing.length) fail(`Persian is missing ${faMissing.length} Arabic-source keys`);
  if (arMissing.length) fail(`Arabic is missing ${arMissing.length} Persian-source keys`);

  const baseline = Math.max(faKeys.size, arKeys.size);
  console.log(`fa/ar full dictionaries: ${baseline} keys`);

  for (const locale of locales.filter((item) => !["en", "fa", "ar"].includes(item))) {
    const keys = readKeys(locale);
    if (!keys) {
      fail(`could not read ${locale} dictionary`);
      continue;
    }
    console.log(`${locale} core coverage: ${keys.size}/${baseline} keys`);
  }
}
