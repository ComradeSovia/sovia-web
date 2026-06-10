import { HomePage as HomePageContent } from "@sovia/home";
import { SITE_DESCRIPTION, SITE_TITLE } from "@sovia/shared";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
};

export default function CenterPage() {
  return <HomePageContent />;
}
