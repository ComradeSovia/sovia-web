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

export type YouTubeApiError = {
  error_description?: string;
  errors?: { reason?: string }[];
  message?: string;
};

export type YouTubeCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

type SyncYouTubeVideoMetadataInput = {
  credentials: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  description: string;
  localizations?: Record<string, { description: string; title: string }>;
  title: string;
  videoId: string;
};

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const YOUTUBE_TITLE_MAX_CHARACTERS = 100;
export const YOUTUBE_DESCRIPTION_MAX_BYTES = 5000;

export async function syncYouTubeVideoMetadata({
  credentials,
  description,
  localizations,
  title,
  videoId,
}: SyncYouTubeVideoMetadataInput) {
  assertValidYouTubeVideoMetadata({ description, localizations, title });

  const authorizedFetch = createYouTubeAuthorizedFetch(credentials);
  const current = await getYouTubeVideo(videoId, authorizedFetch);

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
  const response = await authorizedFetch(
    `${YOUTUBE_API_BASE_URL}/videos?part=${parts}`,
    {
      body: JSON.stringify({
        id: videoId,
        localizations: localizations
          ? { ...current.localizations, ...localizations }
          : undefined,
        snippet,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeVideoListResponse | null;

  if (!response.ok) {
    throw new Error(
      formatYouTubeRequestError(
        "YouTube video update",
        response.status,
        payload?.error,
      ),
    );
  }

  return {
    description,
    localizations,
    title,
    videoId,
  };
}

function assertValidYouTubeVideoMetadata({
  description,
  localizations,
  title,
}: Pick<
  SyncYouTubeVideoMetadataInput,
  "description" | "localizations" | "title"
>) {
  const errors = getYouTubeTextErrors("Primary", title, description);

  for (const [locale, localization] of Object.entries(localizations ?? {})) {
    errors.push(
      ...getYouTubeTextErrors(
        `Localization ${locale}`,
        localization.title,
        localization.description,
      ),
    );
  }

  if (errors.length) {
    throw new Error(`YouTube metadata is invalid: ${errors.join("; ")}`);
  }
}

function getYouTubeTextErrors(
  label: string,
  title: string,
  description: string,
) {
  const errors: string[] = [];
  const titleLength = Array.from(title).length;
  const descriptionBytes = new TextEncoder().encode(description).length;

  if (titleLength > YOUTUBE_TITLE_MAX_CHARACTERS) {
    errors.push(
      `${label} title is ${titleLength} characters; the limit is ${YOUTUBE_TITLE_MAX_CHARACTERS}`,
    );
  }
  if (descriptionBytes > YOUTUBE_DESCRIPTION_MAX_BYTES) {
    errors.push(
      `${label} description is ${descriptionBytes} bytes; the limit is ${YOUTUBE_DESCRIPTION_MAX_BYTES}`,
    );
  }
  if (title.includes("<") || title.includes(">")) {
    errors.push(`${label} title cannot contain < or >`);
  }
  if (description.includes("<") || description.includes(">")) {
    errors.push(`${label} description cannot contain < or >`);
  }

  return errors;
}

async function getYouTubeVideo(
  videoId: string,
  authorizedFetch: ReturnType<typeof createYouTubeAuthorizedFetch>,
) {
  const params = new URLSearchParams({
    id: videoId,
    part: "snippet,localizations",
  });
  const response = await authorizedFetch(
    `${YOUTUBE_API_BASE_URL}/videos?${params}`,
    {
      method: "GET",
    },
  );
  const payload = (await response
    .json()
    .catch(() => null)) as YouTubeVideoListResponse | null;

  if (!response.ok) {
    throw new Error(
      formatYouTubeRequestError(
        "YouTube video lookup",
        response.status,
        payload?.error,
      ),
    );
  }

  const video = payload?.items?.[0];
  const snippet = video?.snippet;
  if (!snippet) {
    throw new Error("YouTube video was not found for this account.");
  }

  return { localizations: video.localizations, snippet };
}

// Keep a token only for this operation. Bodies must be buffered so a request
// explicitly rejected with 401 can be replayed once with refreshed credentials.
export function createYouTubeAuthorizedFetch(
  credentials: YouTubeCredentials,
  initialAccessToken?: string,
) {
  let accessToken = initialAccessToken;
  return async (
    url: string,
    init: Omit<RequestInit, "body"> & {
      body?: string | Uint8Array<ArrayBuffer>;
    } = {},
  ) => {
    accessToken ??= await getYouTubeAccessToken(credentials);
    const send = (token: string) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return fetch(url, { ...init, cache: "no-store", headers });
    };
    const response = await send(accessToken);
    if (response.status !== 401) return response;
    await response.body?.cancel();
    accessToken = await getYouTubeAccessToken(credentials);
    return send(accessToken);
  };
}

export async function getYouTubeAccessToken({
  clientId,
  clientSecret,
  refreshToken,
}: YouTubeCredentials) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    body,
    cache: "no-store",
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
      `YouTube OAuth token refresh failed (HTTP ${response.status}${payload?.error ? `, ${payload.error}` : ""}): ${payload?.error_description || "Google did not return an access token."}`,
    );
  }

  return payload.access_token;
}

export function getYouTubeApiErrorMessage(error: YouTubeApiError | undefined) {
  return error?.message || error?.error_description;
}

export function formatYouTubeRequestError(
  operation: string,
  status: number,
  error: YouTubeApiError | undefined,
) {
  const reason = error?.errors?.[0]?.reason;
  return `${operation} failed (HTTP ${status}${reason ? `, ${reason}` : ""}): ${getYouTubeApiErrorMessage(error) || "Google rejected the request."}`;
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}
