import { createHash } from "node:crypto";
import { getPrismaClient } from "@sovia/sound/data/prisma";
import OpenAI from "openai";

const SEARCH_EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_BATCH_SIZE = 64;

export type SearchEmbeddingDocument = {
  contentId: string;
  text: string;
};

export async function getSearchEmbeddings(
  documents: SearchEmbeddingDocument[],
) {
  if (!documents.length || !process.env.OPENAI_API_KEY) {
    return {
      available: false,
      generatedCount: 0,
      vectors: new Map<string, number[]>(),
    };
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return {
      available: false,
      generatedCount: 0,
      vectors: new Map<string, number[]>(),
    };
  }

  const hashes = new Map(
    documents.map((document) => [
      document.contentId,
      getDocumentHash(document.text),
    ]),
  );
  const stored = await prisma.musicWorkSearchEmbedding.findMany({
    where: {
      contentId: { in: documents.map((document) => document.contentId) },
    },
  });
  const vectors = new Map<string, number[]>();
  const staleDocuments: SearchEmbeddingDocument[] = [];

  for (const document of documents) {
    const record = stored.find((item) => item.contentId === document.contentId);
    const vector = record ? toEmbedding(record.embedding) : null;
    if (
      record?.model === SEARCH_EMBEDDING_MODEL &&
      record.contentHash === hashes.get(document.contentId) &&
      vector
    ) {
      vectors.set(document.contentId, vector);
    } else {
      staleDocuments.push(document);
    }
  }

  if (!staleDocuments.length) {
    return { available: true, generatedCount: 0, vectors };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  for (
    let index = 0;
    index < staleDocuments.length;
    index += EMBEDDING_BATCH_SIZE
  ) {
    const batch = staleDocuments.slice(index, index + EMBEDDING_BATCH_SIZE);
    const response = await client.embeddings.create({
      input: batch.map((document) => document.text),
      model: SEARCH_EMBEDDING_MODEL,
    });

    await prisma.$transaction(
      batch.map((document, batchIndex) => {
        const embedding = response.data[batchIndex]?.embedding;
        if (!embedding) {
          throw new Error(
            "The embedding response did not include every document.",
          );
        }
        vectors.set(document.contentId, embedding);

        return prisma.musicWorkSearchEmbedding.upsert({
          create: {
            contentHash: hashes.get(document.contentId) ?? "",
            contentId: document.contentId,
            embedding,
            model: SEARCH_EMBEDDING_MODEL,
          },
          update: {
            contentHash: hashes.get(document.contentId) ?? "",
            embedding,
            model: SEARCH_EMBEDDING_MODEL,
          },
          where: { contentId: document.contentId },
        });
      }),
    );
  }

  console.info("OpenAI search embeddings indexed", {
    documentCount: staleDocuments.length,
    model: SEARCH_EMBEDDING_MODEL,
  });

  return {
    available: true,
    generatedCount: staleDocuments.length,
    vectors,
  };
}

export async function getSearchQueryEmbedding(query: string) {
  if (!process.env.OPENAI_API_KEY) return null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.embeddings.create({
    input: query,
    model: SEARCH_EMBEDDING_MODEL,
  });

  return response.data[0]?.embedding ?? null;
}

function getDocumentHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function toEmbedding(value: unknown) {
  if (!Array.isArray(value)) return null;

  const embedding = value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item),
  );
  return embedding.length === value.length && embedding.length
    ? embedding
    : null;
}
