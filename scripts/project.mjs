#!/usr/bin/env node
// Manage and run isolated per-project workspaces under workspaces/<slug>/.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ACTIVE_PROJECT_FILE,
  ENGINE_ROOT,
  WORKSPACES_DIR,
  popProjectArg,
  projectJsonPath,
  readActiveProject,
  resolveProjectDir,
  slugifyWorkspace,
} from "../engine/workspace.mjs";

const PYTHON = process.platform === "win32" ? "python" : "python3";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function relFromRoot(p) {
  const rel = path.relative(ENGINE_ROOT, p).replace(/\\/g, "/");
  return rel || ".";
}

function runCmd(cmd, args, extraEnv = {}) {
  const res = spawnSync(cmd, args, {
    cwd: ENGINE_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32" && cmd.endsWith(".cmd"),
    env: { ...process.env, ...extraEnv },
  });
  if (res.error) throw res.error;
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function resolveTemplateSource(fromSpec, aspect) {
  if (!fromSpec) {
    return path.join(
      ENGINE_ROOT,
      aspect === "9:16" ? "content/video.example.9-16.json" : "content/video.example.json"
    );
  }
  const direct = path.resolve(fromSpec);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  const fromRoot = path.resolve(ENGINE_ROOT, fromSpec);
  if (fs.existsSync(fromRoot) && fs.statSync(fromRoot).isFile()) return fromRoot;
  if (fs.existsSync(fromRoot) && fs.statSync(fromRoot).isDirectory()) {
    const p = projectJsonPath(fromRoot, ENGINE_ROOT);
    if (fs.existsSync(p)) return p;
  }
  const archived = path.join(ENGINE_ROOT, "projects", fromSpec, "video.json");
  if (fs.existsSync(archived)) return archived;
  const ws = path.join(WORKSPACES_DIR, fromSpec, "video.json");
  if (fs.existsSync(ws)) return ws;
  throw new Error(`Template or project source not found: ${fromSpec}`);
}

function cmdNew(args) {
  let rawSlug = "";
  let aspect = "16:9";
  let fromSpec = "";
  let title = "";
  let setUse = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--aspect") aspect = args[++i] || "16:9";
    else if (a === "--from") fromSpec = args[++i] || "";
    else if (a === "--title") title = args[++i] || "";
    else if (a === "--use") setUse = true;
    else if (a === "--force") force = true;
    else if (!a.startsWith("-") && !rawSlug) rawSlug = a;
  }

  if (!rawSlug) {
    console.error("Usage: npm run project:new -- <slug> [--aspect 16:9|9:16] [--from <path|slug>] [--title \"...\"] [--use]");
    process.exit(1);
  }

  const slug = slugifyWorkspace(rawSlug);
  const wsDir = path.join(WORKSPACES_DIR, slug);
  const videoOut = path.join(wsDir, "video.json");

  if (fs.existsSync(videoOut) && !force) {
    console.error(`Workspace already exists: ${relFromRoot(wsDir)} (pass --force to overwrite video.json)`);
    process.exit(1);
  }

  for (const sub of ["notes", "assets/logos", "assets/webref", "thumbnails", "build", "renders"]) {
    fs.mkdirSync(path.join(wsDir, sub), { recursive: true });
  }

  const templatePath = resolveTemplateSource(fromSpec, aspect);
  const data = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  data.slug = slug;
  data.compositionId = slug;
  if (title) data.title = title;
  if (!data.audio || data.audio === "content/voiceover.wav") {
    data.audio = "voiceover.wav";
  }
  if (aspect === "9:16" && !fromSpec) {
    data.aspect = "9:16";
    data.composition = { ...(data.composition || {}), width: 1080, height: 1920, fps: data.composition?.fps || 30 };
  }
  fs.writeFileSync(videoOut, JSON.stringify(data, null, 2) + "\n", "utf8");

  const sourcesFile = path.join(wsDir, "assets/SOURCES.md");
  if (!fs.existsSync(sourcesFile)) {
    fs.writeFileSync(
      sourcesFile,
      `# Asset Sources (${slug})\n\nDocument every local logo, website capture, image, and clip used in \`${slug}\`.\n\n| Asset | Source URL | Publisher / License | Notes |\n|---|---|---|---|\n`,
      "utf8"
    );
  }

  const notesReadme = path.join(wsDir, "notes/README.md");
  if (!fs.existsSync(notesReadme)) {
    fs.writeFileSync(
      notesReadme,
      `# Project Notes (${slug})\n\nStore research notes, fact sheets, TTS scripts, and scratchpads for \`${slug}\` here.\nThis entire \`workspaces/${slug}/\` directory is ignored by git and isolated from the template engine.\n`,
      "utf8"
    );
  }

  if (setUse) {
    fs.writeFileSync(ACTIVE_PROJECT_FILE, `${relFromRoot(wsDir)}\n`, "utf8");
  }

  console.log(`[project] Created isolated workspace: ${relFromRoot(wsDir)}`);
  console.log(`[project] Config: ${relFromRoot(videoOut)}`);
  if (setUse) console.log(`[project] Active workspace set to: ${relFromRoot(wsDir)}`);
  console.log("[project] Next steps:");
  console.log(`  npm run validate -- --project ${slug}`);
  console.log(`  npm run draft -- --project ${slug}`);
}

function cmdUse(args) {
  const target = args.find((a) => !a.startsWith("-"));
  if (!target) {
    console.error("Usage: npm run project:use -- <slug-or-path>");
    process.exit(1);
  }
  const dir = resolveProjectDir(target, { useActive: false, mustExist: true });
  const rel = relFromRoot(dir);
  fs.writeFileSync(ACTIVE_PROJECT_FILE, `${rel}\n`, "utf8");
  console.log(`[project] Active workspace: ${rel}`);
}

function cmdClear() {
  if (fs.existsSync(ACTIVE_PROJECT_FILE)) fs.unlinkSync(ACTIVE_PROJECT_FILE);
  console.log("[project] Cleared active workspace (commands default to template root unless --project is passed)");
}

function cmdList() {
  const active = readActiveProject();
  const activeDir = active ? relFromRoot(resolveProjectDir(active, { useActive: false, mustExist: false })) : null;
  if (!fs.existsSync(WORKSPACES_DIR)) {
    console.log("[project] No workspaces directory yet.");
    return;
  }
  const entries = fs
    .readdirSync(WORKSPACES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (!entries.length) {
    console.log("[project] No workspaces created yet. Create one with: npm run project:new -- <slug>");
    return;
  }
  for (const name of entries) {
    const rel = `workspaces/${name}`;
    const mark = activeDir === rel ? "*" : " ";
    const hasJson = fs.existsSync(path.join(WORKSPACES_DIR, name, "video.json"));
    const hasIndex = fs.existsSync(path.join(WORKSPACES_DIR, name, "index.html"));
    console.log(`${mark} ${name} (${rel}) [video.json:${hasJson ? "yes" : "no"} build:${hasIndex ? "yes" : "no"}]`);
  }
}

function cmdStatus(projectSpec) {
  const dir = resolveProjectDir(projectSpec, { mustExist: true });
  const rel = relFromRoot(dir);
  const vjson = projectJsonPath(dir);
  console.log(`[project] Target directory: ${rel}`);
  console.log(`[project] Project JSON: ${relFromRoot(vjson)} (${fs.existsSync(vjson) ? "exists" : "missing"})`);
  console.log(`[project] Built HTML: ${relFromRoot(path.join(dir, "index.html"))} (${fs.existsSync(path.join(dir, "index.html")) ? "exists" : "missing"})`);
  console.log(`[project] Active file (.active-project): ${readActiveProject() || "(none)"}`);
}

function envForProject(projectDir) {
  return { IDEVAK_PROJECT: relFromRoot(projectDir) };
}

function resolveRenderOutputArgs(args, projectDir) {
  const outArgs = [...args];
  for (let i = 0; i < outArgs.length; i++) {
    if (outArgs[i] === "--output" || outArgs[i] === "-o") {
      if (i + 1 < outArgs.length && !path.isAbsolute(outArgs[i + 1])) {
        outArgs[i + 1] = path.resolve(projectDir, outArgs[i + 1]);
        fs.mkdirSync(path.dirname(outArgs[i + 1]), { recursive: true });
      }
      i++;
    } else if (outArgs[i].startsWith("--output=")) {
      const val = outArgs[i].slice("--output=".length);
      if (!path.isAbsolute(val)) {
        const resolved = path.resolve(projectDir, val);
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        outArgs[i] = `--output=${resolved}`;
      }
    }
  }
  return outArgs;
}

function cmdHf(hfCmd, rawArgs) {
  const { project, rest } = popProjectArg(rawArgs);
  const projectDir = resolveProjectDir(project, { mustExist: true });
  const targetDir = relFromRoot(projectDir);
  const env = envForProject(projectDir);

  if (hfCmd === "render") {
    // Ensure the target workspace composition is freshly built before rendering.
    runCmd(process.execPath, ["engine/build.mjs", "--project", targetDir], env);
    const renderArgs = resolveRenderOutputArgs(rest, projectDir);
    runCmd(NPX, ["--yes", "hyperframes@latest", "render", ...renderArgs, targetDir], env);
    return;
  }

  runCmd(NPX, ["--yes", "hyperframes@latest", hfCmd, ...rest, targetDir], env);
}

function cmdRun(task, rawArgs) {
  const { project, rest } = popProjectArg(rawArgs);
  let chosenProject = project;
  let extra = rest;
  // Allow `npm run project -- run validate my-video` (second positional arg as slug if workspace exists)
  if (!chosenProject && extra.length && !extra[0].startsWith("-")) {
    const maybeWs = path.join(WORKSPACES_DIR, extra[0]);
    if (fs.existsSync(maybeWs) && fs.statSync(maybeWs).isDirectory()) {
      chosenProject = extra[0];
      extra = extra.slice(1);
    }
  }

  const projectDir = resolveProjectDir(chosenProject, { mustExist: true });
  const targetDir = relFromRoot(projectDir);
  const env = envForProject(projectDir);

  switch (task) {
    case "validate":
      runCmd(PYTHON, ["engine/validate.py", "--project", targetDir, ...extra], env);
      break;
    case "transcribe":
      runCmd(PYTHON, ["engine/transcribe.py", "--project", targetDir, ...extra], env);
      break;
    case "align":
      runCmd(PYTHON, ["engine/align.py", "--project", targetDir, ...extra], env);
      break;
    case "align:draft":
      runCmd(PYTHON, ["engine/align.py", "--project", targetDir, "--draft", ...extra], env);
      break;
    case "build":
    case "sfx":
      runCmd(process.execPath, ["engine/build.mjs", "--project", targetDir, ...extra], env);
      break;
    case "draft":
      runCmd(PYTHON, ["engine/align.py", "--project", targetDir, "--draft"], env);
      runCmd(process.execPath, ["engine/build.mjs", "--project", targetDir], env);
      break;
    case "pipeline":
      runCmd(PYTHON, ["engine/validate.py", "--project", targetDir], env);
      runCmd(PYTHON, ["engine/transcribe.py", "--project", targetDir], env);
      runCmd(PYTHON, ["engine/align.py", "--project", targetDir], env);
      runCmd(process.execPath, ["engine/build.mjs", "--project", targetDir], env);
      break;
    case "qa:frames":
      runCmd(process.execPath, ["scripts/qa_frames.mjs", "--project", targetDir, ...extra], env);
      break;
    case "qa:sheets":
      runCmd(PYTHON, ["scripts/qa_sheets.py", "--project", targetDir, ...extra], env);
      break;
    case "fetch:logo":
      runCmd(PYTHON, ["scripts/fetch_logo.py", "--project", targetDir, ...extra], env);
      break;
    case "capture:webref":
      runCmd(process.execPath, ["scripts/capture_webref.mjs", "--project", targetDir, ...extra], env);
      break;
    case "thumbnail":
      runCmd(process.execPath, ["scripts/generate_thumbnail.mjs", "--project", targetDir, ...extra], env);
      break;
    case "daytona":
      runCmd(PYTHON, ["scripts/daytona_video.py", "--project", targetDir, ...extra], env);
      break;
    case "lint":
    case "check":
    case "preview":
      cmdHf(task, ["--project", targetDir, ...extra]);
      break;
    case "render":
      cmdHf("render", ["--project", targetDir, "--quality", "looks", "--output", "renders/video.mp4", ...extra]);
      break;
    case "render:hq":
      cmdHf("render", ["--project", targetDir, "--quality", "delivery", "--output", "renders/video.mp4", ...extra]);
      break;
    default:
      console.error(`Unknown project task: ${task}`);
      process.exit(1);
  }
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);

switch (cmd) {
  case "new":
  case "init":
    cmdNew(rest);
    break;
  case "use":
    cmdUse(rest);
    break;
  case "clear":
    cmdClear();
    break;
  case "list":
    cmdList();
    break;
  case "status": {
    const { project } = popProjectArg(rest);
    cmdStatus(project);
    break;
  }
  case "hf": {
    const hfCmd = rest[0];
    if (!hfCmd) {
      console.error("Usage: node scripts/project.mjs hf <lint|check|preview|render> [args...]");
      process.exit(1);
    }
    cmdHf(hfCmd, rest.slice(1));
    break;
  }
  case "run": {
    const task = rest[0];
    if (!task) {
      console.error("Usage: node scripts/project.mjs run <task> [args...]");
      process.exit(1);
    }
    cmdRun(task, rest.slice(1));
    break;
  }
  default:
    console.log(
      [
        "Usage: node scripts/project.mjs <command> [options]",
        "",
        "Commands:",
        "  new <slug> [--aspect 16:9|9:16] [--from <path|slug>] [--title \"...\"] [--use]",
        "  use <slug-or-path>         Set active workspace in .active-project",
        "  clear                      Clear .active-project",
        "  list                       List all workspaces in workspaces/",
        "  status [--project <slug>]  Show resolved project directory and files",
        "  run <task> [args...]       Run validate|draft|transcribe|align|build|pipeline|qa:frames|qa:sheets|lint|check|preview|render",
        "  hf <cmd> [args...]         Run hyperframes lint|check|preview|render on the target workspace",
      ].join("\n")
    );
    if (cmd && cmd !== "--help" && cmd !== "-h") process.exit(1);
}
