"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface Props {
  u2bId: string;
  alt: string;
  blurDataURL?: string | null;
}

export function U2BThumbnail({ u2bId, alt, blurDataURL }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(Boolean(blurDataURL));
  const [resolvedBlurDataURL, setResolvedBlurDataURL] = useState(
    blurDataURL ?? null,
  );
  const [shouldRenderImage, setShouldRenderImage] = useState(
    Boolean(blurDataURL),
  );

  useEffect(() => {
    if (nearViewport) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(container);

    return () => observer.disconnect();
  }, [nearViewport]);

  useEffect(() => {
    if (!nearViewport || resolvedBlurDataURL) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/u2b-thumbnail?id=${u2bId}&format=blur`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Thumbnail blur not found.");
        }

        return response.text();
      })
      .then((dataUrl) => {
        setResolvedBlurDataURL(dataUrl);
        setShouldRenderImage(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setShouldRenderImage(true);
      });

    return () => controller.abort();
  }, [nearViewport, resolvedBlurDataURL, u2bId]);

  return (
    <div ref={containerRef} className="aspect-video w-full bg-paper">
      {shouldRenderImage ? (
        <Image
          alt={alt}
          blurDataURL={resolvedBlurDataURL ?? undefined}
          className="aspect-video w-full border-[3px] border-ink object-cover"
          height={270}
          placeholder={resolvedBlurDataURL ? "blur" : "empty"}
          src={`/api/u2b-thumbnail?id=${u2bId}`}
          unoptimized
          width={480}
        />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-video w-full border-[3px] border-ink bg-paper"
        />
      )}
    </div>
  );
}
