// Schema/renderer/aligner parity.
//
// Three contracts describe a scene type's `meta` block:
//   - engine/SCHEMA.md documents it for authors,
//   - engine/validate.py enforces it,
//   - engine/build.mjs and engine/align.py consume it.
// Nothing used to connect them, so a validated key could be silently ignored by
// the renderer and the scene shipped fallback text instead of the authored copy.
// This test fails when a key is validated for a type but read nowhere.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lines = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8").split(/\r?\n/);
const text = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

// ---------------------------------------------------------------- build.mjs
// Renderers are `  name(s) {` ... `  },` at the top level of the RENDER object.
// Everything else in the file is shared build code: the scene wrapper, the
// word-splitting highlights, and the document/evidence markup.
const RENDERER_START = /^  (\w+)\(s\) \{$/;
const RENDERER_END = /^  \},?$/;

function splitRenderers(source) {
  const perType = new Map();
  const shared = [];
  let current = null;
  for (const line of source) {
    if (current) {
      if (RENDERER_END.test(line)) current = null;
      else current.lines.push(line);
      continue;
    }
    const start = RENDERER_START.exec(line);
    if (start) {
      const block = { lines: [] };
      perType.set(start[1], block);
      current = block;
      continue;
    }
    shared.push(line);
  }
  return { perType, shared: shared.join("\n") };
}

// `s.meta?.head`, `s.meta.mediaStart`, `s?.meta?.highlight`. The lookbehind skips
// `import.meta.url`, and requiring the leading dot skips the unrelated local
// `const meta = {...}` metadata object at the bottom of the file.
function buildMetaReads(source) {
  return [...source.matchAll(/(?<!import)\.meta\??\.(\w+)/g)].map((match) => match[1]);
}

// ---------------------------------------------------------------- validate.py
// Per-type blocks are `if scene_type == "cold":` / `elif scene_type == "hero":`.
// The shared `sfield(meta, "source", ...)` above the dispatch is type-agnostic,
// so it is intentionally not attributed to any type.
const VALIDATOR_START = /^\s*(?:el)?if scene_type == "(\w+)":/;

function validatorBlocks(source) {
  const starts = [];
  source.forEach((line, index) => {
    const match = VALIDATOR_START.exec(line);
    if (match) starts.push({ type: match[1], index });
  });
  const blocks = new Map();
  starts.forEach((start, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].index : source.length;
    blocks.set(start.type, source.slice(start.index, end).join("\n"));
  });
  return blocks;
}

function validatedMetaKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(
    /(?:ifield|sfield|listfield|objectfield|boolfield|numfield)\(meta,\s*"(\w+)"/g,
  )) {
    keys.add(match[1]);
  }
  for (const match of source.matchAll(/meta\.get\("(\w+)"/g)) keys.add(match[1]);
  for (const match of source.matchAll(/meta\["(\w+)"\]/g)) keys.add(match[1]);
  // `for key in ("image", "video", "poster"):` loops validate every listed key
  // inside the loop body through a variable instead of a literal.
  for (const loop of source.matchAll(/for key in \(([^)]*)\)/g)) {
    for (const quoted of loop[1].matchAll(/"(\w+)"/g)) keys.add(quoted[1]);
  }
  return keys;
}

// ---------------------------------------------------------------- align.py
// The aligner normalizes `stat` (value/dec/sep/from/nocount), fills `display`,
// copies `ghost`, and reads `revealOn` from the written scene rows.
function alignMetaKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/meta\.get\("(\w+)"/g)) keys.add(match[1]);
  for (const match of source.matchAll(/meta\["(\w+)"\]/g)) keys.add(match[1]);
  for (const match of source.matchAll(/"(\w+)" not in meta/g)) keys.add(match[1]);
  for (const match of source.matchAll(/\["meta"\]\.get\("(\w+)"/g)) keys.add(match[1]);
  return keys;
}

// Validated keys that are legitimately consumed outside the renderer, the
// shared build code, and the aligner. Keep this empty unless a real exception
// exists, and comment each entry with where the key is consumed.
const ALLOWLIST = new Map();

// The contracts must cover the same scene types. A new type has to land in the
// renderer, the validator, and this count together.
const SCENE_TYPES = 21;

test("scene meta contracts stay in parity across builder, validator, and aligner", () => {
  const { perType, shared } = splitRenderers(lines("engine/build.mjs"));
  const blocks = validatorBlocks(lines("engine/validate.py"));
  const consumedEverywhere = new Set([
    ...buildMetaReads(shared),
    ...alignMetaKeys(text("engine/align.py")),
  ]);

  assert.equal(perType.size, SCENE_TYPES,
    `engine/build.mjs defines ${perType.size} renderers, expected ${SCENE_TYPES}`);
  assert.equal(blocks.size, SCENE_TYPES,
    `engine/validate.py validates ${blocks.size} scene types, expected ${SCENE_TYPES}`);
  assert.deepEqual(
    [...perType.keys()].sort(),
    [...blocks.keys()].sort(),
    "engine/build.mjs renderers and engine/validate.py scene blocks disagree",
  );

  const problems = [];
  for (const [type, source] of blocks) {
    const consumed = new Set([...consumedEverywhere, ...buildMetaReads((perType.get(type) || { lines: [] }).lines.join("\n"))]);
    const allowed = ALLOWLIST.get(type) || new Set();
    for (const key of [...validatedMetaKeys(source)].sort()) {
      if (consumed.has(key) || allowed.has(key)) continue;
      problems.push(
        `${type}.meta.${key}: validated by engine/validate.py, but never read by the ` +
        `${type} renderer, shared engine/build.mjs code, or engine/align.py`,
      );
    }
  }

  assert.deepEqual(problems, [],
    `Scene meta contract drift:\n  ${problems.join("\n  ")}`);
});
