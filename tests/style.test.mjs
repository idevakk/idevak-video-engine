import assert from "node:assert/strict";
import test from "node:test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("visual style defaults to classic when omitted and switches to repochad for both 16:9 and 9:16", () => {
  // Test 1: Python validation of style
  const validClassic = execSync("python engine/validate.py", { cwd: ROOT, encoding: "utf8" });
  assert.match(validClassic, /0 errors/);

  // Test 2: Project draft build in default style (classic, 16:9 landscape)
  execSync("npm run draft", { cwd: ROOT, encoding: "utf8" });
  const htmlDefault = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(htmlDefault.includes('data-style="classic"'), "Default build must have data-style='classic'");
  assert.ok(htmlDefault.includes('class="is-landscape style-classic"'), "Default build must have class is-landscape style-classic");

  // Test 3: RepoChad project build in 16:9 landscape
  const projectJsonPath = path.join(ROOT, "build/project.json");
  const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, "utf8"));
  projectJson.style = "repochad";
  projectJson.aspect = "16:9";
  projectJson.isPortrait = false;
  projectJson.width = 1920;
  projectJson.height = 1080;
  fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2), "utf8");

  execSync("node engine/build.mjs", { cwd: ROOT, encoding: "utf8" });
  const htmlRepoChad169 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(htmlRepoChad169.includes('data-style="repochad"'), "RepoChad build must have data-style='repochad'");
  assert.ok(htmlRepoChad169.includes('class="is-landscape style-repochad"'), "RepoChad build must have class is-landscape style-repochad");
  assert.ok(htmlRepoChad169.includes('#root[data-style="repochad"]'), "RepoChad build must bundle repochad CSS rules");

  // Test 4: RepoChad project build in 9:16 portrait
  projectJson.style = "repochad";
  projectJson.aspect = "9:16";
  projectJson.isPortrait = true;
  projectJson.width = 1080;
  projectJson.height = 1920;
  fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2), "utf8");

  execSync("node engine/build.mjs", { cwd: ROOT, encoding: "utf8" });
  const htmlRepoChad916 = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.ok(htmlRepoChad916.includes('data-style="repochad"'), "RepoChad 9:16 build must have data-style='repochad'");
  assert.ok(htmlRepoChad916.includes('class="is-portrait style-repochad"'), "RepoChad 9:16 build must have class is-portrait style-repochad");
  assert.ok(htmlRepoChad916.includes('data-aspect="9:16"'), "RepoChad 9:16 build must have data-aspect='9:16'");
  assert.ok(htmlRepoChad916.includes('--composition-width: 1080px;'), "RepoChad 9:16 build must set width 1080");
  assert.ok(htmlRepoChad916.includes('--composition-height: 1920px;'), "RepoChad 9:16 build must set height 1920");

  // Restore default build
  execSync("npm run draft", { cwd: ROOT, encoding: "utf8" });
});
