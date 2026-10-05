import { headers } from "next/headers";
import { setting } from "@/lib/cloudflare";

/**
 * Cloudflare Web Analytics: page views, visitors, countries and Core Web Vitals, cookie-free.
 * Only rendered when CF_WEB_ANALYTICS_TOKEN is set (a public site token from the Cloudflare
 * dashboard, not a secret). The script carries this request's CSP nonce, and the CSP allows its
 * beacon to report to cloudflareinsights.com.
 */
export async function WebAnalytics() {
  const token = setting("CF_WEB_ANALYTICS_TOKEN");
  if (!token || !/^[a-f0-9]{32}$/i.test(token)) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      defer
      nonce={nonce}
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token, spa: true })}
    />
  );
}
