// Shared isolated project-workspace resolution for iDevak Video Engine.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const WORKSPACES_DIR = path.join(ENGINE_ROOT, "workspaces");
export const ACTIVE_PROJECT_FILE = path.join(ENGINE_ROOT, ".active-project");

export function slugifyWorkspace(value) {
  const s = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "project";
}

export function readActiveProject(engineRoot = ENGINE_ROOT) {
  const activeFile = path.join(engineRoot, ".active-project");
  if (!fs.existsSync(activeFile)) return null;
  const raw = fs.readFileSync(activeFile, "utf8").trim();
  return raw || null;
}

export function popProjectArg(argv = process.argv.slice(2)) {
  let project = null;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--project" || arg === "--workspace") {
      if (i + 1 >= argv.length) {
        throw new Error(`${arg} requires a workspace slug or directory path`);
      }
      project = argv[++i];
    } else if (arg.startsWith("--project=") || arg.startsWith("--workspace=")) {
      project = arg.slice(arg.indexOf("=") + 1);
    } else {
      rest.push(arg);
    }
  }
  return { project, rest };
}

export function resolveProjectDir(spec = null, { engineRoot = ENGINE_ROOT, useActive = true, mustExist = true } = {}) {
  let chosen = spec;
  if (!chosen || !String(chosen).trim()) {
    const envVal = (process.env.IDEVAK_PROJECT || "").trim();
    if (envVal) chosen = envVal;
    else if (useActive) chosen = readActiveProject(engineRoot);
  }
  if (!chosen || !String(chosen).trim()) return engineRoot;

  const raw = String(chosen).trim();
  if (raw.toLowerCase().endsWith(".json") && fs.existsSync(raw) && fs.statSync(raw).isFile()) {
    const parent = path.dirname(path.resolve(raw));
    if (path.basename(parent) === "content" && fs.existsSync(path.join(path.dirname(parent), "engine"))) {
      return path.dirname(parent);
    }
    return parent;
  }

  if (fs.existsSync(raw) && fs.statSync(raw).isDirectory()) {
    return path.resolve(raw);
  }
  const fromRoot = path.resolve(engineRoot, raw);
  if (fs.existsSync(fromRoot) && fs.statSync(fromRoot).isDirectory()) {
    return fromRoot;
  }

  const isBareSlug = !raw.includes("/") && !raw.includes("\\") && !path.isAbsolute(raw);
  if (isBareSlug) {
    const ws = path.join(engineRoot, "workspaces", raw);
    if ((fs.existsSync(ws) && fs.statSync(ws).isDirectory()) || !mustExist) {
      return ws;
    }
  }

  if (!mustExist) {
    return path.isAbsolute(raw) ? raw : path.resolve(engineRoot, raw);
  }

  throw new Error(
    `Project workspace not found: ${raw}\nCreate one with: npm run project:new -- ${slugifyWorkspace(raw)}`
  );
}

export function projectJsonPath(projectDir, engineRoot = ENGINE_ROOT) {
  if (path.resolve(projectDir) === path.resolve(engineRoot)) {
    return path.join(engineRoot, "content/video.json");
  }
  const direct = path.join(projectDir, "video.json");
  if (fs.existsSync(direct)) return direct;
  const nested = path.join(projectDir, "content/video.json");
  if (fs.existsSync(nested)) return nested;
  return direct;
}

export function defaultAudioRel(projectDir, engineRoot = ENGINE_ROOT) {
  return path.resolve(projectDir) === path.resolve(engineRoot) ? "content/voiceover.wav" : "voiceover.wav";
}
