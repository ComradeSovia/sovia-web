import banner from "./images/banner.jpg";
import banner16To19 from "./images/banner16-19.jpg";
import banner20To21 from "./images/banner20-21.jpg";
import banner22To26 from "./images/banner22-26.jpg";
import banner27To28 from "./images/banner27-28.jpg";
import banner29To30 from "./images/banner29-30.jpg";

export const AIR_CON_STANDBY_BANNER = banner;

export const AIR_CON_BANNERS = [
  { min: 16, max: 19, src: banner16To19 },
  { min: 20, max: 21, src: banner20To21 },
  { min: 22, max: 26, src: banner22To26 },
  { min: 27, max: 28, src: banner27To28 },
  { min: 29, max: 30, src: banner29To30 },
] as const;
