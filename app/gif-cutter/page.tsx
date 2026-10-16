import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("gif-cutter");

export default function Page() {
  return <LandingPage slug="gif-cutter" />;
}
