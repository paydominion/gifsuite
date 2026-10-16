import { LandingPage, landingMetadata } from "@/components/marketing/LandingPage";

export const dynamic = "force-dynamic";
export const generateMetadata = () => landingMetadata("video-cropper");

export default function Page() {
  return <LandingPage slug="video-cropper" />;
}
