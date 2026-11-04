import {
  cpSync,
  existsSync,
  lstatSync,
  readdirSync,
  readlinkSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.resolve(root, ".next/standalone");
if (!existsSync(path.join(output, "server.js")))
  throw new Error("Build the standalone server before preparing its assets.");
const insideOutput = (value) => value.startsWith(`${output}${path.sep}`);

// Explicit sharp tracing can flatten its pnpm directory. Keep its runtime
// dependency closure resolvable in standalone on both Windows and Linux.
const packages = [
  { name: "sharp", from: path.join(root, "package.json"), optional: false },
];
const copiedPackages = new Set();
while (packages.length) {
  const { name, from, optional } = packages.pop();
  let manifestPath;
  try {
    manifestPath = createRequire(from).resolve(`${name}/package.json`);
  } catch (error) {
    // Native @img packages expose their binary, but may not export package.json.
    manifestPath = createRequire(from)
      .resolve.paths(name)
      ?.map((directory) => path.join(directory, name, "package.json"))
      .find((file) => existsSync(file));
    if (!manifestPath) {
      if (optional) continue;
      throw error;
    }
  }
  const manifest = createRequire(from)(manifestPath);
  const identity = `${name}@${manifest.version}`;
  if (copiedPackages.has(identity)) continue;
  copiedPackages.add(identity);
  const destination = path.join(output, "node_modules", name);
  if (!insideOutput(destination))
    throw new Error("Invalid standalone package destination.");
  if (existsSync(destination) && lstatSync(destination).isSymbolicLink())
    unlinkSync(destination);
  cpSync(path.dirname(manifestPath), destination, {
    recursive: true,
    dereference: true,
  });
  for (const dependency of Object.keys(manifest.dependencies || {}))
    packages.push({ name: dependency, from: manifestPath, optional: false });
  for (const dependency of Object.keys(manifest.optionalDependencies || {}))
    packages.push({ name: dependency, from: manifestPath, optional: true });
}

// Next's traced directory symlinks can be emitted as file links on Windows.
// Repair only broken generated links, and only when both paths stay in this output.
let repaired = 0;
if (process.platform === "win32") {
  const directories = [output];
  while (directories.length) {
    const directory = directories.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      const info = lstatSync(file);
      if (info.isSymbolicLink()) {
        let target = path.resolve(path.dirname(file), readlinkSync(file));
        const visited = new Set([file]);
        while (insideOutput(target) && lstatSync(target).isSymbolicLink()) {
          if (visited.has(target))
            throw new Error(`Circular standalone link: ${file}`);
          visited.add(target);
          target = path.resolve(path.dirname(target), readlinkSync(target));
        }
        if (!insideOutput(file) || !insideOutput(target))
          throw new Error(`Standalone link escapes the output: ${file}`);
        if (!statSync(target).isDirectory()) continue;
        try {
          statSync(file);
        } catch {
          unlinkSync(file);
          symlinkSync(target, file, "junction");
          repaired++;
        }
      } else if (info.isDirectory()) directories.push(file);
    }
  }
}

// Make the local standalone folder runnable like the Docker runtime image.
for (const [source, destination] of [
  ["public", "public"],
  [".next/static", ".next/static"],
]) {
  cpSync(path.join(root, source), path.join(output, destination), {
    recursive: true,
  });
}
console.log(
  `Standalone prepared with public/static assets${repaired ? `; repaired ${repaired} Windows directory links` : ""}.`,
);
