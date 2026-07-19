import { randomUUID } from "node:crypto";
import {
  getYouTubeAccessToken,
  getYouTubeApiErrorMessage,
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

  const accessToken = await getYouTubeAccessToken(credentials);
  const existingCaptions = await listYouTubeCaptions(videoId, accessToken);
  const synced: SyncedYouTubeCaption[] = [];

  for (const track of uploadTracks) {
    const existing = existingCaptions.find(
      (caption) =>
        caption.id &&
        caption.snippet?.language === track.language &&
        caption.snippet?.name === CAPTION_TRACK_NAME &&
        caption.snippet?.trackKind !== "ASR",
    );

    if (existing?.id) {
      await uploadCaptionFile({
        accessToken,
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
        accessToken,
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

async function listYouTubeCaptions(videoId: string, accessToken: string) {
  const params = new URLSearchParams({
    part: "snippet",
    videoId,
  });
  const response = await fetch(`${YOUTUBE_API_BASE_URL}/captions?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "GET",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeCaptionListResponse | null;

  if (!response.ok) {
    throw new Error(
      getYouTubeApiErrorMessage(payload?.error) ||
        "YouTube captions could not be loaded.",
    );
  }

  return payload?.items ?? [];
}

async function uploadCaptionFile({
  accessToken,
  captionId,
  language,
  srt,
  videoId,
}: {
  accessToken: string;
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
  const response = await fetch(
    `${YOUTUBE_UPLOAD_BASE_URL}/captions?${params}`,
    {
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
      getYouTubeApiErrorMessage(payload?.error) ||
        `YouTube caption ${updating ? "update" : "insert"} failed.`,
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
