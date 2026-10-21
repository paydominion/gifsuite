import type { Metadata } from "next";
import Link from "next/link";
import { Email, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using GifSuite: what you may grab and upload, adult content, takedowns, and the limits of what the service promises.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" intro="By using GifSuite you agree to these terms. They're short, and written to be read.">
      <h2>What GifSuite is</h2>
      <p>
        GifSuite is a set of free tools for GIFs: grab a GIF from a link, convert and compress files, and share the
        results. It is run by an individual. Questions go to <Email />.
      </p>

      <h2>Your responsibility for what you grab and upload</h2>
      <p>
        When you grab a GIF, GifSuite downloads it from the link you give and gives it a page. You are responsible for
        having the right to do that. Most GIFs belong to someone, and grabbing one doesn&rsquo;t make it yours. Use GIFs
        the way their owners and the law allow, for example for commentary or with credit where that is lawful.
      </p>
      <p>Don&rsquo;t use GifSuite to grab, upload, store or share anything that:</p>
      <ul>
        <li>infringes someone else&rsquo;s copyright or other rights;</li>
        <li>shows a real person in a sexual way without their consent, or shares someone&rsquo;s private information;</li>
        <li>involves the sexual abuse or exploitation of children (removed immediately and reported to the authorities);</li>
        <li>threatens, harasses or promotes violence against people;</li>
        <li>is illegal where you are or in the country of the site it came from.</li>
      </ul>

      <h2>Adult content</h2>
      <p>
        Links from adult sites can be grabbed. GIFs that are marked or detected as sensitive are blurred, kept off the
        public timeline and out of search results. You must be 18 or older, and allowed to view such material where you
        are, to choose &ldquo;Show anyway&rdquo; on a sensitive GIF. Automated detection makes mistakes, in both
        directions; report anything we missed.
      </p>

      <h2>Public, private and removed GIFs</h2>
      <p>
        Grabbed GIFs are public by default. Private GIFs are left off the timeline but anyone with the link can open
        them. We may hide or remove any GIF, at any time, for example after a{" "}
        <Link href="/copyright">takedown request</Link>, reports from visitors, or if it breaks these terms.
      </p>

      <h2>Fair use of the service</h2>
      <p>
        Don&rsquo;t overload the service, get around its limits, scrape it in bulk, or use it to reach addresses it
        shouldn&rsquo;t. We limit how often each visitor can use the tools, and we may block traffic that looks
        automated or abusive.
      </p>

      <h2>Other websites</h2>
      <p>
        GifSuite is not affiliated with X Corp., Giphy, Tenor or any other site you grab from. Their own terms still
        apply to their content. Grabbing only works while those sites make the media available, and they can change that
        at any time.
      </p>

      <h2>No guarantees</h2>
      <p>
        GifSuite is provided free and &ldquo;as is&rdquo;. We try to keep it working and your GIFs available, but we
        don&rsquo;t promise that it will always be online, that every link can be grabbed, or that stored GIFs will be
        kept forever. Keep your own copy of anything you need. To the extent the law allows, we aren&rsquo;t liable for
        losses that come from using, or not being able to use, GifSuite.
      </p>

      <h2>Changes</h2>
      <p>
        We may change these terms. The date at the top shows the latest version, and using GifSuite after a change means
        you accept it. See also the <Link href="/privacy">privacy page</Link>.
      </p>
    </LegalPage>
  );
}
