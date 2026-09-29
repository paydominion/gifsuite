import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page is rendered per request (they read live data), so no incremental cache is needed.
export default defineCloudflareConfig({});
