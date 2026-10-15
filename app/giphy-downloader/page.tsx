import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("giphy-downloader");

export default function Page() {
  return <LandingPage slug="giphy-downloader" />;
}
