import { randomUUID } from "node:crypto";
import {
  createYouTubeAuthorizedFetch,
  formatYouTubeRequestError,
  type YouTubeApiError,
  type YouTubeCredentials,
} from "./video-metadata";

type YouTubeCaptionResource = {
  id?: string;
  snippet?: {
    language?: string;
    name?: string;
    trackKind?: string;
  };
};

type YouTubeCaptionListResponse = {
  error?: YouTubeApiError;
  items?: YouTubeCaptionResource[];
};

type SyncYouTubeCaptionsInput = {
  credentials: YouTubeCredentials;
  tracks: Record<string, string>;
  videoId: string;
};

type SyncedYouTubeCaption = {
  action: "inserted" | "updated";
  id?: string;
  language: string;
};

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_BASE_URL = "https://www.googleapis.com/upload/youtube/v3";
// YouTube requires a name when inserting a caption track. Existing tracks are
// matched by language so tracks created or edited in Studio are reused too.
const CAPTION_TRACK_NAME = "Sovia";

export async function syncYouTubeCaptions({
  credentials,
  tracks,
  videoId,
}: SyncYouTubeCaptionsInput) {
  const uploadTracks = Object.entries(tracks)
    .map(([language, srt]) => ({ language: language.trim(), srt: srt.trim() }))
    .filter((track) => track.language && track.srt);

  if (!uploadTracks.length) {
    throw new Error("At least one subtitle track is required.");
  }

  const authorizedFetch = createYouTubeAuthorizedFetch(credentials);
  const existingCaptions = await listYouTubeCaptions(videoId, authorizedFetch);
  const synced: SyncedYouTubeCaption[] = [];

  for (const track of uploadTracks) {
    const existing = existingCaptions.find(
      (caption) =>
        caption.id &&
        caption.snippet?.language === track.language &&
        caption.snippet?.trackKind !== "ASR",
    );

    if (existing?.id) {
      await uploadCaptionFile({
        authorizedFetch,
        captionId: existing.id,
        srt: track.srt,
      });
      synced.push({
        action: "updated",
        id: existing.id,
        language: track.language,
      });
    } else {
      const inserted = await uploadCaptionFile({
        authorizedFetch,
        language: track.language,
        srt: track.srt,
        videoId,
      });
      synced.push({
        action: "inserted",
        id: inserted.id,
        language: track.language,
      });
    }
  }

  return {
    estimatedQuotaUnits:
      50 +
      synced.reduce(
        (total, caption) => total + (caption.action === "updated" ? 450 : 400),
        0,
      ),
    synced,
    videoId,
  };
}

async function listYouTubeCaptions(
  videoId: string,
  authorizedFetch: ReturnType<typeof createYouTubeAuthorizedFetch>,
) {
  const params = new URLSearchParams({
    part: "snippet",
    videoId,
  });
  const response = await authorizedFetch(
    `${YOUTUBE_API_BASE_URL}/captions?${params}`,
    {
      method: "GET",
    },
  );
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeCaptionListResponse | null;

  if (!response.ok) {
    throw new Error(
      formatYouTubeRequestError(
        "YouTube caption list",
        response.status,
        payload?.error,
      ),
    );
  }

  return payload?.items ?? [];
}

async function uploadCaptionFile({
  authorizedFetch,
  captionId,
  language,
  srt,
  videoId,
}: {
  authorizedFetch: ReturnType<typeof createYouTubeAuthorizedFetch>;
  captionId?: string;
  language?: string;
  srt: string;
  videoId?: string;
}) {
  const updating = Boolean(captionId);
  const params = new URLSearchParams({
    part: updating ? "id" : "snippet",
    uploadType: "multipart",
  });
  const metadata = updating
    ? { id: captionId }
    : {
        snippet: {
          isDraft: false,
          language,
          name: CAPTION_TRACK_NAME,
          videoId,
        },
      };
  const { body, contentType } = createMultipartRelatedBody(
    metadata,
    `${srt}\n`,
  );
  const response = await authorizedFetch(
    `${YOUTUBE_UPLOAD_BASE_URL}/captions?${params}`,
    {
      body,
      headers: {
        "Content-Type": contentType,
      },
      method: updating ? "PUT" : "POST",
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | (YouTubeCaptionResource & {
        error?: YouTubeApiError;
      })
    | null;

  if (!response.ok) {
    throw new Error(
      formatYouTubeRequestError(
        `YouTube caption ${updating ? "update" : "insert"}`,
        response.status,
        payload?.error,
      ),
    );
  }

  return payload ?? {};
}

function createMultipartRelatedBody(metadata: unknown, srt: string) {
  const boundary = `sovia_${randomUUID().replaceAll("-", "")}`;
  const encoder = new TextEncoder();
  const body = encoder.encode(
    [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: application/octet-stream",
      "Content-Transfer-Encoding: binary",
      "",
      srt,
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );

  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`,
  };
}
