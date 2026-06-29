import type { StaticImageData } from "next/image";
import allTypes from "./images/all_types.jpg";
import banner from "./images/banner.jpg";
import feqia from "./images/code/feqia.jpg";
import feqil from "./images/code/feqil.jpg";
import feqma from "./images/code/feqma.jpg";
import feqml from "./images/code/feqml.jpg";
import fevia from "./images/code/fevia.jpg";
import fevil from "./images/code/fevil.jpg";
import fevma from "./images/code/fevma.jpg";
import fevml from "./images/code/fevml.jpg";
import foqia from "./images/code/foqia.jpg";
import foqil from "./images/code/foqil.jpg";
import foqma from "./images/code/foqma.jpg";
import foqml from "./images/code/foqml.jpg";
import fovia from "./images/code/fovia.jpg";
import fovil from "./images/code/fovil.jpg";
import fovma from "./images/code/fovma.jpg";
import fovml from "./images/code/fovml.jpg";
import seqia from "./images/code/seqia.jpg";
import seqil from "./images/code/seqil.jpg";
import seqma from "./images/code/seqma.jpg";
import seqml from "./images/code/seqml.jpg";
import sevia from "./images/code/sevia.jpg";
import sevil from "./images/code/sevil.jpg";
import sevma from "./images/code/sevma.jpg";
import sevml from "./images/code/sevml.jpg";
import soqia from "./images/code/soqia.jpg";
import soqil from "./images/code/soqil.jpg";
import soqma from "./images/code/soqma.jpg";
import soqml from "./images/code/soqml.jpg";
import sovia from "./images/code/sovia.jpg";
import sovil from "./images/code/sovil.jpg";
import sovma from "./images/code/sovma.jpg";
import sovml from "./images/code/sovml.jpg";

export const SOVIA_TEST_ALL_TYPES_IMAGE = allTypes;
export const SOVIA_TEST_BANNER_IMAGE = banner;

export const SOVIA_TEST_TYPE_IMAGES = {
  feqia,
  feqil,
  feqma,
  feqml,
  fevia,
  fevil,
  fevma,
  fevml,
  foqia,
  foqil,
  foqma,
  foqml,
  fovia,
  fovil,
  fovma,
  fovml,
  seqia,
  seqil,
  seqma,
  seqml,
  sevia,
  sevil,
  sevma,
  sevml,
  soqia,
  soqil,
  soqma,
  soqml,
  sovia,
  sovil,
  sovma,
  sovml,
} as const satisfies Record<string, StaticImageData>;

const SOVIA_TEST_TYPE_IMAGE_MAP: Record<string, StaticImageData> =
  SOVIA_TEST_TYPE_IMAGES;

export function getSoviaTestTypeImage(code: string) {
  return (
    SOVIA_TEST_TYPE_IMAGE_MAP[code.toLowerCase()] ??
    SOVIA_TEST_TYPE_IMAGES.sovia
  );
}
