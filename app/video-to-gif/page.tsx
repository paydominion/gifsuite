import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("video-to-gif");

export default function Page() {
  return <LandingPage slug="video-to-gif" />;
}
