"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getSoviaTestTypeImage } from "../assets/images";

type SoviaTestResultImageProps = {
  code: string;
  title: string;
};

export function SoviaTestResultImage({
  code,
  title,
}: SoviaTestResultImageProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const imageSrc = getSoviaTestTypeImage(code);
  const imageAlt = `${code} ${title}`;

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isPreviewOpen]);

  return (
    <>
      <button
        aria-label={`Open ${imageAlt}`}
        className="block border-[3px] border-ink bg-paper p-2 shadow-[8px_8px_0_rgb(var(--red))] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-red"
        onClick={() => setIsPreviewOpen(true)}
        type="button"
      >
        <Image
          alt={imageAlt}
          className="aspect-square w-full border-[2px] border-ink object-cover"
          height={1254}
          placeholder="blur"
          priority
          sizes="(min-width: 768px) 22rem, 100vw"
          src={imageSrc}
          width={1254}
        />
      </button>

      {isPreviewOpen && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
        >
          <button
            aria-label="Close image preview"
            className="absolute inset-0 bg-ink/90 backdrop-blur-md"
            onClick={() => setIsPreviewOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-5xl pt-14">
            <button
              aria-label="Close image preview"
              className="absolute right-0 top-0 z-10 border-[3px] border-ink bg-paper px-3 py-2 text-sm font-black uppercase leading-none text-ink shadow-[4px_4px_0_rgb(var(--red))]"
              onClick={() => setIsPreviewOpen(false)}
              type="button"
            >
              Close
            </button>
            <div className="border-[3px] border-ink bg-paper p-2 shadow-[10px_10px_0_rgb(var(--red))]">
              <Image
                alt={imageAlt}
                className="max-h-[calc(100vh-7rem)] w-full object-contain"
                height={1254}
                placeholder="blur"
                sizes="100vw"
                src={imageSrc}
                width={1254}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
