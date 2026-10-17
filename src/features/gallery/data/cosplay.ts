export const COSPLAY_PHOTOS = [
  { id: "08", file: 8, layout: "wide" },
  { id: "01", file: 1, layout: "portrait" },
  { id: "02", file: 2, layout: "landscape" },
  { id: "07", file: 7, layout: "landscape" },
  { id: "10", file: 10, layout: "portrait" },
  { id: "04", file: 4, layout: "landscape" },
  { id: "03", file: 3, layout: "portrait" },
  { id: "09", file: 9, layout: "portrait" },
  { id: "12", file: 12, layout: "landscape" },
  { id: "05", file: 5, layout: "landscape" },
  { id: "06", file: 6, layout: "portrait" },
  { id: "11", file: 11, layout: "wide" },
] as const;

export function getCosplayPhotoPath(file: number) {
  return `/assets/photos/sovia/sovia_cosplay_qi_${file}.jpg`;
}
