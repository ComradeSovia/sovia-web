import type {
  COMMENT_CATEGORIES,
  COMMENT_REPLY_STATES,
  REPLY_ADVICE,
} from "./comment-review";

export const categoryLabel: Record<
  (typeof COMMENT_CATEGORIES)[number],
  string
> = {
  UNCLASSIFIED: "Unclassified",
  SONG_REQUEST: "Song request",
  QUESTION: "Question",
  FEEDBACK: "Feedback",
  OTHER: "Other",
};
export const replyStatusLabel: Record<
  (typeof COMMENT_REPLY_STATES)[number],
  string
> = {
  UNREPLIED: "Unreplied",
  DRAFTED: "Reply drafted",
  REPLIED: "Already replied",
  NO_REPLY: "Not planning to reply",
};
export const adviceLabel: Record<(typeof REPLY_ADVICE)[number], string> = {
  REPLY: "Reply recommended",
  SKIP: "No reply recommended",
  UNDECIDED: "Needs your judgment",
};
