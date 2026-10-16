import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("gif-cropper");

export default function Page() {
  return <LandingPage slug="gif-cropper" />;
}
