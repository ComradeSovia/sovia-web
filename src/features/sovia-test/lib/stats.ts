import type { SoviaTestStats } from "../data/submissions";
import type { SoviaTestLocale } from "../i18n/config";

type TypeShareCopy = {
  resultLabel: string;
  typeLabel: string;
};

const TYPE_SHARE_COPY: Record<string, TypeShareCopy> = {
  fallback: {
    resultLabel: "Your type in the test population",
    typeLabel: "Test population share",
  },
  "ja-JP": {
    resultLabel: "あなたのタイプがテスト参加者に占める割合",
    typeLabel: "テスト参加者内の割合",
  },
  "ko-KR": {
    resultLabel: "테스트 참여자 중 당신의 유형 비율",
    typeLabel: "테스트 참여자 내 비율",
  },
  "ru-RU": {
    resultLabel: "Доля вашего типа среди участников теста",
    typeLabel: "Доля среди участников теста",
  },
  "zh-CN": {
    resultLabel: "你的类型占测试人群比例",
    typeLabel: "测试人群占比",
  },
  "zh-TW": {
    resultLabel: "你的類型占測試人群比例",
    typeLabel: "測試人群占比",
  },
};

export function getSoviaTypeShareCopy(locale: SoviaTestLocale) {
  return TYPE_SHARE_COPY[locale] ?? TYPE_SHARE_COPY.fallback;
}

export function getSoviaTypeSharePercentage(
  stats: SoviaTestStats | null | undefined,
  code: string,
) {
  if (!stats || stats.totalSubmissions <= 0) {
    return null;
  }

  const result = stats.topResults.find((item) => item.code === code);

  if (!result) {
    return "0.00";
  }

  return ((result.count / stats.totalSubmissions) * 100).toFixed(2);
}
