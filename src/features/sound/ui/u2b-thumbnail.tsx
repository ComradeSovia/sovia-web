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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shouldRenderImage, setShouldRenderImage] = useState(
    Boolean(blurDataURL),
  );

  useEffect(() => {
    if (!u2bId) {
      return;
    }

    setNearViewport(Boolean(blurDataURL));
    setResolvedBlurDataURL(blurDataURL ?? null);
    setShouldRenderImage(Boolean(blurDataURL));
    setImageLoaded(false);
  }, [blurDataURL, u2bId]);

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

  useEffect(() => {
    if (nearViewport) {
      setShouldRenderImage(true);
    }
  }, [nearViewport]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden border-[3px] border-ink bg-paper"
    >
      {resolvedBlurDataURL && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 scale-105 bg-cover bg-center blur-md transition-opacity duration-500 ${
            imageLoaded ? "opacity-0" : "opacity-100"
          }`}
          style={{ backgroundImage: `url(${resolvedBlurDataURL})` }}
        />
      )}

      {shouldRenderImage ? (
        <Image
          alt={alt}
          className={`object-cover transition-opacity duration-500 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          fill
          onLoad={() => setImageLoaded(true)}
          sizes="(min-width: 768px) 50vw, 100vw"
          src={`/api/u2b-thumbnail?id=${u2bId}`}
          unoptimized
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-paper" />
      )}
    </div>
  );
}
