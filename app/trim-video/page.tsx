import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("trim-video");

export default function Page() {
  return <LandingPage slug="trim-video" />;
}
