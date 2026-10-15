import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("gif-to-mp4");

export default function Page() {
  return <LandingPage slug="gif-to-mp4" />;
}
