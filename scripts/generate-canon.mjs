import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourcePath = path.join(root, "data/canon/sovia.json");
const canon = JSON.parse(await readFile(sourcePath, "utf8"));
const { project, creator, characters } = canon.entities;
const characterEntries = Object.entries(characters);
const checkOnly = process.argv.includes("--check");

function validate() {
  const ids = [
    project["@id"],
    creator["@id"],
    ...characterEntries.map(([, character]) => character["@id"]),
  ];
  if (new Set(ids).size !== ids.length)
    throw new Error("Canon entity @id values must be unique.");
  if (project["@id"] !== `${canon.canonicalSite}/#project`)
    throw new Error("The project @id must remain bound to the canonical site.");
  if (creator["@id"] !== `${canon.canonicalSite}/en-US/creator#person`)
    throw new Error(
      "The creator @id must remain bound to the official profile.",
    );
  if (
    project.creatorId !== creator["@id"] ||
    creator.projectId !== project["@id"]
  ) {
    throw new Error("Project and creator references must agree.");
  }
  if (
    creator.inUniverseRunaId !== characters.runa["@id"] ||
    characters.runa.realWorldCreatorId !== creator["@id"]
  ) {
    throw new Error(
      "The creator and in-universe Runa profiles must reference each other.",
    );
  }
  if (
    project.characterIds.length !== characterEntries.length ||
    !characterEntries.every(([, character]) =>
      project.characterIds.includes(character["@id"]),
    )
  ) {
    throw new Error(
      "Project character IDs must match the official character set.",
    );
  }
  const polarizationTypes = new Set(
    canon.worldPolarizationTypes.map((type) => type.type),
  );
  const plusI = canon.worldPolarizationTypes.find(
    (type) => type.symbol === "+i",
  );
  if (
    plusI?.type !== "realWorldOrigin" ||
    characters.runa.worldPolarizationType !== plusI.type
  ) {
    throw new Error("+i must classify Runa's world of origin only.");
  }
  for (const [slug, character] of characterEntries) {
    if (
      character["@id"] !==
      `${canon.canonicalSite}/en-US/characters/${slug}#character`
    )
      throw new Error(`Invalid permanent @id for ${slug}.`);
    const publicSlug = character.publicSlug ?? slug;
    if (!/^[a-z0-9-]+$/.test(publicSlug))
      throw new Error(`Invalid public slug for ${slug}.`);
    if (!character.url.endsWith(`/characters/${publicSlug}`))
      throw new Error(`Invalid URL for ${slug}.`);
    if (!polarizationTypes.has(character.worldPolarizationType))
      throw new Error(`Unknown world type for ${slug}.`);
    for (const relation of character.relationships) {
      if (!characters[relation.characterId])
        throw new Error(`Unknown relationship for ${slug}.`);
    }
    for (const imagePath of Object.values(character.images)) {
      awaitImagePaths.push(
        path.join(root, "public", imagePath.replace(/^\//, "")),
      );
    }
    const expectedImages = {
      hero: `/assets/characters/${slug}_hero.png`,
      portrait: `/assets/characters/${slug}_main.png`,
      expressions: `/assets/characters/${slug}_emote.png`,
      outfits: `/assets/characters/${slug}_outfit.png`,
    };
    for (const [kind, expectedPath] of Object.entries(expectedImages)) {
      if (character.images[kind] !== expectedPath) {
        throw new Error(
          `${slug}: ${kind} image differs from the profile UI path.`,
        );
      }
    }
  }
}

const awaitImagePaths = [];
validate();
for (const imagePath of awaitImagePaths) await access(imagePath);

const siteLocales = ["en-US", "ru-RU", "ja-JP", "ko-KR", "zh-CN", "zh-TW"];
const requiredDossierFields = [
  "quote",
  "origin",
  "gender",
  "languages",
  "nationality",
  "residence",
  "species",
  "identity",
  "biography",
  "fullName",
];

for (const locale of siteLocales) {
  const copyPath = path.join(root, `src/features/home/i18n/${locale}.json`);
  const copy = JSON.parse(await readFile(copyPath, "utf8"));
  const characterCopy = copy.characters;
  const dossiers = characterCopy?.dossiers;
  const expectedIds = characterEntries.map(([slug]) => slug).sort();
  if (
    JSON.stringify(Object.keys(dossiers ?? {}).sort()) !==
    JSON.stringify(expectedIds)
  ) {
    throw new Error(
      `${locale}: character dossiers must match the Canon character IDs.`,
    );
  }
  if (
    characterCopy.worldTypes?.length !== canon.worldPolarizationTypes.length ||
    characterCopy.worldTypes.some((description) => !description?.trim())
  ) {
    throw new Error(
      `${locale}: world polarization descriptions are incomplete.`,
    );
  }
  const worldTypeNames = characterCopy.worldTypeNames ?? {};
  const expectedWorldTypeNames = canon.worldPolarizationTypes
    .map(({ type }) => type)
    .sort();
  if (
    JSON.stringify(Object.keys(worldTypeNames).sort()) !==
    JSON.stringify(expectedWorldTypeNames)
  ) {
    throw new Error(`${locale}: world polarization names differ from Canon.`);
  }
  for (const { type } of canon.worldPolarizationTypes) {
    if (!worldTypeNames[type]?.trim()) {
      throw new Error(`${locale}: missing world polarization type ${type}.`);
    }
  }
  for (const [slug, character] of characterEntries) {
    const dossier = dossiers[slug];
    if (!Array.isArray(dossier.relationships)) {
      throw new Error(`${locale}: ${slug}.relationships is missing.`);
    }
    for (const field of requiredDossierFields) {
      if (typeof dossier[field] !== "string" || !dossier[field].trim()) {
        throw new Error(`${locale}: ${slug}.${field} is missing.`);
      }
    }
    if (!character.localizedNames?.[locale]?.trim()) {
      throw new Error(`${locale}: ${slug} has no localized display name.`);
    }
    const languageCount = dossier.languages
      .split(/[,，、]/)
      .filter((part) => part.trim()).length;
    if (languageCount !== character.languages.length) {
      throw new Error(`${locale}: ${slug} language count differs from Canon.`);
    }
    if (
      locale === "en-US" &&
      dossier.languages !== character.languages.join(", ")
    ) {
      throw new Error(`en-US: ${slug} languages differ from Canon.`);
    }
    const relationIds = (dossier.relationships ?? [])
      .map((relation) => relation.id)
      .sort();
    const expectedRelations = character.relationships
      .map((relation) => relation.characterId)
      .sort();
    if (JSON.stringify(relationIds) !== JSON.stringify(expectedRelations)) {
      throw new Error(`${locale}: ${slug} relationships differ from Canon.`);
    }
    if (
      dossier.relationships.some((relation) => !relation.description?.trim())
    ) {
      throw new Error(
        `${locale}: ${slug} has an empty relationship description.`,
      );
    }
  }
  if (dossiers.runa.residence !== characterCopy.labels?.unknown) {
    throw new Error(
      `${locale}: Runa's in-universe residence must remain classified.`,
    );
  }
  if (!copy.creator?.locationValue?.trim()) {
    throw new Error(`${locale}: the creator location is missing.`);
  }
  if (locale === "en-US" && copy.creator.locationValue !== creator.basedIn) {
    throw new Error("en-US: creator location differs from Canon.");
  }
}

const characterData = {
  version: canon.version,
  updatedAt: canon.updatedAt,
  language: canon.language,
  projectId: project["@id"],
  creatorId: creator["@id"],
  policy: canon.policy,
  worldPolarizationTypes: canon.worldPolarizationTypes,
  characters,
};

const mdLines = [
  "# Comrade Sovia — Official Canon",
  "",
  `- Version: ${canon.version}`,
  `- Updated: ${canon.updatedAt}`,
  `- Language: ${canon.language}`,
  "",
  "This document is generated from `data/canon/sovia.json`. The JSON source is authoritative for the facts below.",
  "",
  "## Three distinct entities",
  "",
  `- **Project — ${project.name}** (${project["@type"]}): ${project.description} Permanent @id: ${project["@id"]}. Official page: ${project.url}.`,
  `- **Real creator — ${creator.name}** (${creator["@type"]}): ${creator.description} Permanent @id: ${creator["@id"]}. Official page: ${creator.url}.`,
  `- Creator location: ${creator.basedIn}.`,
  `- **Fictional central character — ${characters.sovia.name}** (${characters.sovia.nativeName}): ${characters.sovia.description} Permanent @id: ${characters.sovia["@id"]}. Official page: ${characters.sovia.url}.`,
  "",
  `In-universe Runa (${characters.runa["@id"]}): ${characters.runa.identityNote}`,
  "",
  "## Official character profiles",
  "",
];

for (const [, character] of characterEntries) {
  mdLines.push(
    `### ${character.displayName} — ${character.name}`,
    "",
    `- @id: ${character["@id"]}`,
    `- Official page: ${character.url}`,
    `- Native name: ${character.nativeName}`,
    `- Identity number: ${character.identityNumber}`,
    `- Role: ${character.identity}`,
    `- World of origin: ${character.worldOrigin}`,
    `- World polarization: ${character.worldPolarizationRate} (${character.worldPolarizationType})`,
    `- Age: ${character.age ?? character.ageDisplay}`,
    `- Languages: ${character.languages.join(", ")}`,
    `- Nationality: ${character.nationality}`,
    `- Residence: ${character.residence}`,
    `- Species: ${character.species}`,
    `- Quote: ${character.quotes.join("; ")}`,
    `- Signature lines: ${character.signatureLines.join("; ") || "None"}`,
    `- Biography: ${character.biography}`,
    `- Summary: ${character.description}`,
    `- Relationships: ${character.relationships.map((relation) => `${characters[relation.characterId].displayName} — ${relation.description}`).join("; ")}`,
    `- Artwork: ${canon.canonicalSite}${character.images.portrait}`,
    "",
  );
}

mdLines.push(
  "## Canon boundary",
  "",
  canon.policy.scope,
  "",
  canon.policy.nonCanon,
  "",
  canon.policy.changes,
  "",
  "## Machine-readable data",
  "",
  `- All entities: ${canon.canonicalSite}/knowledge/entities.json`,
  `- All characters: ${canon.canonicalSite}/knowledge/characters.json`,
  `- Source index: ${canon.canonicalSite}/llms.txt`,
  "",
);

const llmsLines = [
  "# Comrade Sovia",
  "",
  "> Official entry points for the independent music and visual art project and its fictional universe.",
  "",
  `Canon version: ${canon.version}; updated: ${canon.updatedAt}.`,
  "",
  "## Identity",
  "",
  `- Project: [${project.name}](${project.url}) — @id ${project["@id"]}`,
  `- Real creator: [${creator.name}](${creator.url}) — @id ${creator["@id"]}`,
  `- Fictional central character: [${characters.sovia.name}](${characters.sovia.url}) — @id ${characters.sovia["@id"]}`,
  `- In-universe Runa: [character profile](${characters.runa.url}) — ${characters.runa.identityNote}`,
  "",
  "## Canon and data",
  "",
  `- [Official canon](${canon.canonicalSite}/knowledge/sovia.md)`,
  `- [All entities (JSON)](${canon.canonicalSite}/knowledge/entities.json)`,
  `- [All character data (JSON)](${canon.canonicalSite}/knowledge/characters.json)`,
  ...characterEntries.map(
    ([slug, character]) =>
      `- [${character.displayName} (JSON)](${canon.canonicalSite}/knowledge/characters/${character.publicSlug ?? slug}.json)`,
  ),
  "",
  "Song-specific stories, satire, jokes, fan works, and derivative works are not automatically canon.",
  "",
];

const outputs = new Map([
  ["public/llms.txt", `${llmsLines.join("\n")}`],
  ["public/knowledge/sovia.md", `${mdLines.join("\n")}`],
  [
    "public/knowledge/entities.json",
    `${JSON.stringify({ version: canon.version, updatedAt: canon.updatedAt, language: canon.language, entities: canon.entities }, null, 2)}\n`,
  ],
  [
    "public/knowledge/characters.json",
    `${JSON.stringify(characterData, null, 2)}\n`,
  ],
  ...characterEntries.flatMap(([slug, character]) => {
    const contents = `${JSON.stringify({ version: canon.version, updatedAt: canon.updatedAt, language: canon.language, projectId: project["@id"], character }, null, 2)}\n`;
    const publicSlug = character.publicSlug ?? slug;
    const paths = [
      [`public/knowledge/characters/${publicSlug}.json`, contents],
    ];
    if (publicSlug !== slug)
      paths.push([`public/knowledge/characters/${slug}.json`, contents]);
    return paths;
  }),
]);

for (const [relativePath, contents] of outputs) {
  const target = path.join(root, relativePath);
  if (checkOnly) {
    const existing = await readFile(target, "utf8").catch(() => null);
    if (existing !== contents)
      throw new Error(
        `${relativePath} is missing or out of date. Run pnpm canon:generate.`,
      );
  } else {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
}

console.log(
  `${checkOnly ? "Verified" : "Generated"} ${outputs.size} Canon artifacts (v${canon.version}).`,
);
