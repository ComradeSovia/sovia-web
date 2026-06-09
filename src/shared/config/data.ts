import path from "node:path";

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "data");
export const DATA_LIST_FILE = path.join(DATA_DIR, "list.json");
export const DATA_WORKS_DIR = path.join(DATA_DIR, "works");
export const DATA_CACHE_DIR = path.join(DATA_DIR, "cache");
