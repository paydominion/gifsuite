import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("twitter-gif-downloader");

export default function Page() {
  return <LandingPage slug="twitter-gif-downloader" />;
}
