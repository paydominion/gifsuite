import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("reverse-video");

export default function Page() {
  return <LandingPage slug="reverse-video" />;
}
