import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("reverse-gif");

export default function Page() {
  return <LandingPage slug="reverse-gif" />;
}
