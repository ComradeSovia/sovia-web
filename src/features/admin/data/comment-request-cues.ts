import { Prisma } from "@/generated/prisma/client";

// Discovery cues for the unsorted backlog. A match is only a candidate for review.
// Keep the parameter separate from SQL; both callers alias the source comment as c.
const phrases = [
  String.raw`\m(can|could|would|will) you (please )?(cover|sing|remake|perform|arrange|do a version|make a cover)\M`,
  String.raw`\m(please (cover|sing|remake|do a cover)|song request|cover request|request a song|cover of|would love (to hear|a cover)|you should (cover|sing))\M`,
  String.raw`\m(can|could|may)\s+i\s+(please\s+)?request\s+(the|this)\s+song\M(?!\s+(lyrics|credits|file|link|be removed)\M)`,
  String.raw`\m((can|could|would|will) you|please) (please )?(make|do|record) (an? |the )?([[:alpha:]-]+ ){0,3}(version|cover|arrangement) of\M`,
  "(мож(ешь|ете|но)|пожалуйста|прошу).{0,45}(кавер|спеть|спой|песн|перепеть|перепой|версию)|(сделай(те)?|хочу услышать).{0,25}(кавер|версию)|спой(те)? (пожалуйста|песню)",
  String.raw`(?<![а-яё])(хотелось\s+бы\s+(услышать\s+)?(советскую|советизированную)\s+версию|нам\s+нужна\s+(советская|советизированная)\s+версия)(?![а-яё])`,
  String.raw`点歌|點歌|求(翻唱|改编|改編|一首)|想[听聽].{0,25}(唱|版)|能不能.{0,16}(唱|改编|改編)|可以.{0,16}(翻唱|唱一下)|歌って(ほしい|欲しい|ください)|リクエスト|カバーして|불러\s*주세요|신청곡|커버해\s*주`,
  String.raw`\m(podrías|puedes|podrían) (cantar|hacer (un |una )?(cover|versión))\M|\m(kannst|könntest) du.{0,35}(covern|singen)\M`,
];

export const songRequestCueSql = Prisma.sql`c.text ~* ${phrases.join("|")}`;
