export type SoviaLetter =
  | "S"
  | "F"
  | "O"
  | "E"
  | "V"
  | "Q"
  | "I"
  | "M"
  | "A"
  | "L";

export type AxisKey =
  | "structure"
  | "action"
  | "influence"
  | "understanding"
  | "relation";

export type LetterCopy = {
  name: string;
  zhName: string;
  description: string;
};

export type AxisCopy = {
  label: string;
  letters: Record<string, LetterCopy>;
};

export type QuestionScore = {
  axis: AxisKey;
  weight: number;
};

export type QuestionCopy = {
  id: string;
  statement: string;
  scores: QuestionScore[];
};

export type ArchetypeCopy = {
  title: string;
  description: string;
  unit: string;
  archiveComment: string;
  soviaComment: string;
};

export type TypeEssayCopy = {
  personality: string;
  work: string;
  social: string;
};

export const SOVIA_TEST_AGE_GROUPS = [
  "prefer_not_to_say",
  "under_18",
  "18_24",
  "25_34",
  "35_44",
  "45_54",
  "55_plus",
] as const;

export type SoviaTestAgeGroup = (typeof SOVIA_TEST_AGE_GROUPS)[number];

export const SOVIA_TEST_GENDER_OPTIONS = [
  "prefer_not_to_say",
  "male",
  "female",
  "other",
] as const;

export type SoviaTestGender = (typeof SOVIA_TEST_GENDER_OPTIONS)[number];

export type DemographicsCopy = {
  title: string;
  intro: string;
  ageLabel: string;
  genderLabel: string;
  ageOptions: Record<SoviaTestAgeGroup, string>;
  genderOptions: Record<SoviaTestGender, string>;
};

export type ChannelAdCopy = {
  title: string;
  intro: string;
};

export type SoviaTestCopy = {
  page: {
    title: string;
    eyebrow: string;
    subtitle: string;
    intro: string;
    disclaimer: string;
  };
  system: {
    name: string;
    fullName: string;
    zhName: string;
    department: string;
  };
  language: {
    label: string;
  };
  demographics: DemographicsCopy;
  channelAd: ChannelAdCopy;
  typesPage: {
    title: string;
    subtitle: string;
    intro: string;
    startTestLabel: string;
    codeLabel: string;
    detailLabel: string;
    detailActionLabel: string;
  };
  progress: {
    label: string;
    format: string;
  };
  scale: {
    min: string;
    middle: string;
    max: string;
    leftHint: string;
    rightHint: string;
  };
  actions: {
    start: string;
    types: string;
    previous: string;
    next: string;
    continue: string;
    submit: string;
    restart: string;
    copy: string;
    copyLink: string;
    share: string;
    generateImage: string;
    generatingImage: string;
  };
  status: {
    unanswered: string;
    ready: string;
    copied: string;
    copyFailed: string;
    linkSuccess: string;
    shareSuccess: string;
    resultImageGenerated: string;
  };
  certificate: {
    title: string;
    statusLabel: string;
    statusApproved: string;
    codeLabel: string;
    codeFormat: string;
    systemLabel: string;
    titleLabel: string;
    descriptionLabel: string;
    unitLabel: string;
    axisLabel: string;
    assessmentLabel: string;
    resultLinkLabel: string;
    tendencyLabel: string;
    rawScoreLabel: string;
    oppositeLabel: string;
    archiveCommentLabel: string;
    soviaCommentLabel: string;
    resultImageLabel: string;
    authorityLabel: string;
    authority: string;
  };
  details: {
    title: string;
    personalityLabel: string;
    workLabel: string;
    socialLabel: string;
  };
  axes: Record<AxisKey, AxisCopy>;
  questions: QuestionCopy[];
  types: Record<string, ArchetypeCopy>;
  typeEssays: Record<string, TypeEssayCopy>;
  fallback: {
    archetypeTitleFormat: string;
    archetypeDescription: string;
    unit: string;
    archiveComment: string;
    soviaComment: string;
  };
  copy: {
    template: string;
    success: string;
    failed: string;
    linkSuccess: string;
  };
};
