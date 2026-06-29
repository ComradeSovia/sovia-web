import Image from "next/image";

interface Props {
  u2bId: string;
  alt: string;
  blurDataURL?: string | null;
}

export function U2BThumbnail({ u2bId, alt, blurDataURL }: Props) {
  return (
    <Image
      src={`/api/u2b-thumbnail?id=${u2bId}`}
      alt={alt}
      width={480}
      height={270}
      blurDataURL={blurDataURL ?? undefined}
      unoptimized
      placeholder={blurDataURL ? "blur" : "empty"}
      className="aspect-video w-full border-[3px] border-ink object-cover"
    />
  );
}
