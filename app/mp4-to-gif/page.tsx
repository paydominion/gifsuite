import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("mp4-to-gif");

export default function Page() {
  return <LandingPage slug="mp4-to-gif" />;
}
