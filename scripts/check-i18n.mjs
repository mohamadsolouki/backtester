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

  return new Set([...body.matchAll(/^\s*"((?:\\.|[^"\\])+)":/gm)].map((match) => decodeStringLiteral(`"${match[1]}"`)));
}

function decodeStringLiteral(literal) {
  // The script only evaluates string literals from this repository.
  return Function(`return ${literal}`)();
}

function normalizeKey(value) {
  return value.replace(/\s+/g, " ").trim();
}

function mergeSets(...sets) {
  return new Set(sets.flatMap((set) => [...(set ?? [])]));
}

function listSourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function readLiteralTKeys() {
  const keys = new Set();
  for (const path of listSourceFiles("src")) {
    const content = fs.readFileSync(path, "utf8");
    for (const match of content.matchAll(/\bt\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
      if (match[1] === "`" && match[2].includes("${")) continue;
      const value = normalizeKey(decodeStringLiteral(`${match[1]}${match[2]}${match[1]}`));
      if (value) keys.add(value);
    }
  }
  return keys;
}

function readStringArrayValues(path, name) {
  const content = fs.readFileSync(path, "utf8");
  const match = content.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) return [];
  return [...match[1].matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)]
    .map((item) => normalizeKey(decodeStringLiteral(`${item[1]}${item[2]}${item[1]}`)))
    .filter(Boolean);
}

function readRecordStringValues(path, name) {
  const content = fs.readFileSync(path, "utf8");
  const match = content.match(new RegExp(`(?:export\\s+)?const ${name}[^=]*= \\{([\\s\\S]*?)\\n\\};`));
  if (!match) return [];
  return [...match[1].matchAll(/:\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)]
    .map((item) => normalizeKey(decodeStringLiteral(`${item[1]}${item[2]}${item[1]}`)))
    .filter(Boolean);
}

function readPropertyStringValues(path, propertyNames) {
  const content = fs.readFileSync(path, "utf8");
  const propertyPattern = propertyNames.join("|");
  return [...content.matchAll(new RegExp(`\\b(?:${propertyPattern}):\\s*(["'\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`, "g"))]
    .map((item) => normalizeKey(decodeStringLiteral(`${item[1]}${item[2]}${item[1]}`)))
    .filter(Boolean);
}

function readDateRangeLabels() {
  const content = fs.readFileSync("src/lib/date-range.ts", "utf8");
  return [...content.matchAll(/\blabel:\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)]
    .map((item) => normalizeKey(decodeStringLiteral(`${item[1]}${item[2]}${item[1]}`)))
    .filter(Boolean);
}

function readHelpItemValues() {
  const content = fs.readFileSync("src/lib/help-content.ts", "utf8");
  return [...content.matchAll(/\bitems:\s*\[([\s\S]*?)\]/g)]
    .flatMap((match) => [...match[1].matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)])
    .map((item) => normalizeKey(decodeStringLiteral(`${item[1]}${item[2]}${item[1]}`)))
    .filter(Boolean);
}

function requiredTranslationKeys() {
  return mergeSets(
    readLiteralTKeys(),
    new Set(readRecordStringValues("src/lib/domain.ts", "platformLabels")),
    new Set(readStringArrayValues("src/lib/domain.ts", "contextTagNames")),
    new Set(readStringArrayValues("src/lib/domain.ts", "skipReasons")),
    new Set(readDateRangeLabels()),
    new Set(readRecordStringValues("src/components/modules/backtest-lab.tsx", "STRATEGY_LABELS")),
    new Set(readPropertyStringValues("src/lib/help-content.ts", ["title", "body", "label", "tagline", "heading"])),
    new Set(readHelpItemValues()),
    new Set(readRecordStringValues("src/lib/help-content.ts", "helpTips"))
  );
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

const requiredKeys = requiredTranslationKeys();
for (const locale of locales.filter((item) => item !== "en")) {
  const keys = locale === "fa"
    ? mergeSets(readKeys("fa"), readKeys("faCasual"))
    : locale === "ar"
      ? mergeSets(readKeys("ar"), readKeys("arCasual"))
      : readKeys(locale);
  if (!keys) {
    fail(`could not read ${locale} merged dictionary`);
    continue;
  }

  const missing = [...requiredKeys].filter((key) => !keys.has(key));
  if (missing.length) {
    fail(`${locale} is missing ${missing.length} required UI keys: ${missing.slice(0, 20).join(", ")}`);
  } else {
    console.log(`${locale} required UI coverage: ${requiredKeys.size}/${requiredKeys.size} keys`);
  }
}
