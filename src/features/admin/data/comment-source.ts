import { createHash } from "node:crypto";
export function commentHash(comment: {
  text: string;
  videoId: string;
  authorChannelId: string | null;
  updatedAt: Date;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        comment.text,
        comment.videoId,
        comment.authorChannelId,
        comment.updatedAt.toISOString(),
      ]),
    )
    .digest("hex");
}
