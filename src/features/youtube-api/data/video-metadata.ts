type YouTubeSnippet = {
  categoryId?: string;
  defaultAudioLanguage?: string;
  defaultLanguage?: string;
  description?: string;
  tags?: string[];
  title?: string;
};

type YouTubeVideoListResponse = {
  error?: YouTubeApiError;
  items?: {
    id?: string;
    localizations?: Record<string, { description: string; title: string }>;
    snippet?: YouTubeSnippet;
  }[];
};

type YouTubeTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type YouTubeApiError = {
  error_description?: string;
  message?: string;
};

type SyncYouTubeVideoMetadataInput = {
  description: string;
  localizations?: Record<string, { description: string; title: string }>;
  title: string;
  videoId: string;
};

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function syncYouTubeVideoMetadata({
  description,
  localizations,
  title,
  videoId,
}: SyncYouTubeVideoMetadataInput) {
  const accessToken = await getYouTubeAccessToken();
  const current = await getYouTubeVideo(videoId, accessToken);

  if (!current.snippet.title || !current.snippet.categoryId) {
    throw new Error(
      "YouTube video metadata is missing title or categoryId, so it cannot be safely updated.",
    );
  }

  const snippet = removeUndefinedValues({
    categoryId: current.snippet.categoryId,
    defaultAudioLanguage: current.snippet.defaultAudioLanguage,
    defaultLanguage: current.snippet.defaultLanguage,
    description,
    tags: current.snippet.tags,
    title,
  });

  const parts = localizations ? "snippet,localizations" : "snippet";
  const response = await fetch(`${YOUTUBE_API_BASE_URL}/videos?part=${parts}`, {
    body: JSON.stringify({
      id: videoId,
      localizations: localizations
        ? { ...current.localizations, ...localizations }
        : undefined,
      snippet,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeVideoListResponse | null;

  if (!response.ok) {
    throw new Error(
      getYouTubeApiErrorMessage(payload?.error) ||
        "YouTube video metadata could not be updated.",
    );
  }

  return {
    description,
    localizations,
    title,
    videoId,
  };
}

async function getYouTubeVideo(videoId: string, accessToken: string) {
  const params = new URLSearchParams({
    id: videoId,
    part: "snippet,localizations",
  });
  const response = await fetch(`${YOUTUBE_API_BASE_URL}/videos?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    method: "GET",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeVideoListResponse | null;

  if (!response.ok) {
    throw new Error(
      getYouTubeApiErrorMessage(payload?.error) ||
        "YouTube video metadata could not be loaded.",
    );
  }

  const video = payload?.items?.[0];
  const snippet = video?.snippet;
  if (!snippet) {
    throw new Error("YouTube video was not found for this account.");
  }

  return { localizations: video.localizations, snippet };
}

async function getYouTubeAccessToken() {
  const clientId = getRequiredEnv("YOUTUBE_DATA_API_CLIENT_ID");
  const clientSecret = getRequiredEnv("YOUTUBE_DATA_API_CLIENT_SECRET");
  const refreshToken = getRequiredEnv("YOUTUBE_DATA_API_REFRESH_TOKEN");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeTokenResponse | null;

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "YouTube Data API OAuth token could not be refreshed.",
    );
  }

  return payload.access_token;
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getYouTubeApiErrorMessage(error: YouTubeApiError | undefined) {
  return error?.message || error?.error_description;
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}
