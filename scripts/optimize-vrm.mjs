import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

// Repack embedded textures without re-exporting VRM extensions, rigs or morphs.
const root = resolve(import.meta.dirname, "..");
const source = await readFile(resolve(root, "public/assets/models/sovia.vrm"));
if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) {
  throw new Error("Expected a binary glTF 2.0 VRM file.");
}
const jsonLength = source.readUInt32LE(12);
const document = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const binStart = 20 + jsonLength + 8;
if (
  source.readUInt32LE(binStart - 4) !== 0x004e4942 ||
  document.buffers.length !== 1
) {
  throw new Error("Expected one embedded binary buffer.");
}
const normalTextures = new Set();
for (const material of document.materials ?? []) {
  if (material.normalTexture) normalTextures.add(material.normalTexture.index);
  const normal = material.extensions?.VRMC_materials_mtoon?.shadingShiftTexture;
  if (normal) normalTextures.add(normal.index);
}
const normalImages = new Set(
  [...normalTextures].map((i) => document.textures[i].source),
);
const replacements = new Map();
for (const [index, image] of document.images.entries()) {
  if (image.uri || image.bufferView === undefined)
    throw new Error("Expected embedded images.");
  const view = document.bufferViews[image.bufferView];
  const bytes = source.subarray(
    binStart + (view.byteOffset ?? 0),
    binStart + (view.byteOffset ?? 0) + view.byteLength,
  );
  const metadata = await sharp(bytes).metadata();
  const isNormal = normalImages.has(index) || /normal/i.test(image.name ?? "");
  const limit = isNormal ? 1024 : 2048;
  const pipeline = sharp(bytes).resize({
    width: limit,
    height: limit,
    fit: "inside",
    withoutEnlargement: true,
  });
  // Core glTF image formats keep this compatible with the existing VRM loader.
  const png = isNormal || metadata.hasAlpha;
  const optimized = await (png
    ? pipeline.png({ compressionLevel: 9 })
    : pipeline.jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
  ).toBuffer();
  image.mimeType = png ? "image/png" : "image/jpeg";
  replacements.set(image.bufferView, optimized);
}
const chunks = [];
const seen = new Map();
let offset = 0;
for (const [index, view] of document.bufferViews.entries()) {
  if ((view.buffer ?? 0) !== 0) throw new Error("Unexpected buffer reference.");
  const original = source.subarray(
    binStart + (view.byteOffset ?? 0),
    binStart + (view.byteOffset ?? 0) + view.byteLength,
  );
  const bytes = replacements.get(index) ?? original;
  const key = createHash("sha256").update(bytes).digest("hex");
  let position = seen.get(key);
  if (position === undefined) {
    position = offset;
    chunks.push(bytes);
    offset += bytes.length;
    const padding = (4 - (offset % 4)) % 4;
    chunks.push(Buffer.alloc(padding));
    offset += padding;
    seen.set(key, position);
  }
  view.byteOffset = position;
  view.byteLength = bytes.length;
}
document.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(document));
const jsonPadding = Buffer.alloc((4 - (json.length % 4)) % 4, 0x20);
const binary = Buffer.concat(chunks);
const result = Buffer.alloc(
  12 + 8 + json.length + jsonPadding.length + 8 + binary.length,
);
result.writeUInt32LE(0x46546c67, 0);
result.writeUInt32LE(2, 4);
result.writeUInt32LE(result.length, 8);
result.writeUInt32LE(json.length + jsonPadding.length, 12);
result.writeUInt32LE(0x4e4f534a, 16);
json.copy(result, 20);
jsonPadding.copy(result, 20 + json.length);
const binHeader = 20 + json.length + jsonPadding.length;
result.writeUInt32LE(binary.length, binHeader);
result.writeUInt32LE(0x004e4942, binHeader + 4);
binary.copy(result, binHeader + 8);
await writeFile(
  resolve(root, "public/assets/models/sovia-preview.vrm"),
  result,
);
await writeFile(
  resolve(root, "src/features/tools/data/vrm-preview.json"),
  `${JSON.stringify({ url: "/assets/models/sovia-preview.vrm", bytes: result.length, originalBytes: source.length }, null, 2)}\n`,
);
console.log(
  `VRM preview: ${(source.length / 1e6).toFixed(1)} MB → ${(result.length / 1e6).toFixed(1)} MB (${(100 * (1 - result.length / source.length)).toFixed(1)}% smaller).`,
);
