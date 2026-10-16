import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("add-text-to-gif");

export default function Page() {
  return <LandingPage slug="add-text-to-gif" />;
}
