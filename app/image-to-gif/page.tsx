import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("image-to-gif");

export default function Page() {
  return <LandingPage slug="image-to-gif" />;
}
