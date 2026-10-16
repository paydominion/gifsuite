import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("photo-to-gif");

export default function Page() {
  return <LandingPage slug="photo-to-gif" />;
}
