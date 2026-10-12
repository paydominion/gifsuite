import type { Metadata } from "next";
import Link from "next/link";
import { Email, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What GifSuite collects when you grab, convert or share a GIF: no accounts, no IP addresses kept, uploads never stored, and no selling of data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" intro="GifSuite collects as little as it can. Here is exactly what happens to your data, in plain words.">
      <h2>The short version</h2>
      <ul>
        <li>There are no accounts, and we never ask for your name or email.</li>
        <li>We don&rsquo;t keep your IP address. To count visitors we keep a scrambled code that changes every day.</li>
        <li>Files you upload to Convert or Compress are never stored. They exist only while we process them.</li>
        <li>GIFs you grab from a link are stored and get a public page. You can keep them off the public timeline.</li>
        <li>We don&rsquo;t sell data, show ads or use advertising trackers.</li>
      </ul>

      <h2>Who runs GifSuite</h2>
      <p>
        GifSuite is run by an individual. For anything about privacy, email <Email />.
      </p>

      <h2>What we collect, and why</h2>
      <h3>When you grab a GIF</h3>
      <p>
        We download the GIF or video from the link you paste and store it, with what the original page says about it: the
        title or post text, the author&rsquo;s name and handle, and like counts where the site shows them. This is what
        makes the GIF&rsquo;s page, downloads and sharing work. We don&rsquo;t store the link you pasted except as the
        &ldquo;View original&rdquo; link on that page.
      </p>
      <h3>The owner cookie</h3>
      <p>
        The first time your browser grabs a GIF, we give it a random key in a cookie called <code>gs_owner</code>. It lets
        that browser, and only that browser, switch its GIFs between public and private. We store only a scrambled
        version of the key. It isn&rsquo;t linked to who you are, isn&rsquo;t used for tracking, and lasts a year.
        Clearing your cookies removes it, and with it the ability to change your earlier GIFs&rsquo; visibility.
      </p>
      <h3>Usage counts</h3>
      <p>
        We record what happens on the site so we can see what people use and fix what breaks: grabs (including which
        website a pasted link came from, but not the link itself), page views, downloads with the chosen format, shares,
        reports, and uses of each tool, with whether they worked and how long they took. Each record carries the
        visitor&rsquo;s country, the kind of device (for example &ldquo;iPhone&rdquo; or &ldquo;desktop&rdquo;), and a
        visitor code made by scrambling your IP address and browser details together with that day&rsquo;s date. The
        code can&rsquo;t be turned back into your IP address, and it changes every day, so it can&rsquo;t follow you
        over time. We use Cloudflare Workers Analytics Engine and Cloudflare Web Analytics, which counts page views
        without cookies.
      </p>
      <h3>Files you upload</h3>
      <p>
        Convert and Compress process your file and send the result straight back. Neither the upload nor the result is
        stored.
      </p>

      <h2>Who else sees data</h2>
      <p>
        GifSuite runs on <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a>, which hosts the site, the
        database and the files, and necessarily handles your IP address to deliver the pages. To grab a GIF, our servers
        contact the site the link points to (for example X or Giphy); those requests come from our servers, not your
        device. When you choose &ldquo;Post on X&rdquo;, you go to X, and X&rsquo;s own privacy policy applies there.
        Nothing else is shared, and nothing is sold.
      </p>

      <h2>Public and private GIFs</h2>
      <p>
        Grabbed GIFs are public by default: they appear on the timeline and anyone can open their page. A private GIF is
        left off the timeline and out of search engines, but anyone you give the link to can still open it. Private is
        not secret. See the <Link href="/terms">Terms</Link> for what may be grabbed.
      </p>

      <h2>Sensitive content checks</h2>
      <p>
        Before a public GIF joins the timeline, an automated check looks at a few of its frames for nudity. It runs on our
        own servers; frames aren&rsquo;t sent to any other company. Flagged GIFs are blurred and kept off the timeline.
      </p>

      <h2>How long we keep things</h2>
      <ul>
        <li>Grabbed GIFs: until they&rsquo;re removed, for example after a takedown request.</li>
        <li>Usage counts: Analytics Engine keeps them for a limited time set by Cloudflare (about three months at the time of writing); the per-GIF counts in our database are kept with the GIF.</li>
        <li>Uploads to Convert and Compress: not kept at all.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <p>
        Because we don&rsquo;t know who you are, we usually can&rsquo;t find &ldquo;your&rdquo; data. If a GIF shows you,
        or you made it, and you want it removed, email <Email /> with its GifSuite link; for copyright, use the{" "}
        <Link href="/copyright">takedown process</Link>. Depending on where you live, you may have rights to access,
        correct or delete personal data, and to complain to your data protection authority. Email us and we&rsquo;ll
        help.
      </p>

      <h2>Children</h2>
      <p>GifSuite isn&rsquo;t meant for children under 13, and we don&rsquo;t knowingly collect anything about them.</p>

      <h2>Changes</h2>
      <p>If this page changes, the date at the top changes too. Big changes will also be noted on the site.</p>
    </LegalPage>
  );
}
