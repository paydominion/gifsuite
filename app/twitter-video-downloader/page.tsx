import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("twitter-video-downloader");

export default function Page() {
  return <LandingPage slug="twitter-video-downloader" />;
}
