import Image from "next/image";

interface Props {
  u2bId: string;
  alt: string;
}

export function U2BThumbnail({ u2bId, alt }: Props) {
  return (
    <Image
      src={`/api/u2b-thumbnail?id=${u2bId}`}
      alt={alt}
      width={480}
      height={270}
      unoptimized
      className="aspect-video w-full rounded-xl object-cover"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
