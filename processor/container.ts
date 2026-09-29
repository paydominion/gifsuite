import { Container } from "@cloudflare/containers";

/**
 * Runs processor/Dockerfile as a Cloudflare Container. It has no public address:
 * only this Worker can reach it. It sleeps after 5 idle minutes and wakes on the next request.
 */
export class MediaProcessor extends Container {
  defaultPort = 8080;
  sleepAfter = "5m";
}
