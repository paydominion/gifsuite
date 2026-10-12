import type { Metadata } from "next";
import { Email, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Copyright & takedowns",
  description: "How to ask GifSuite to remove a GIF that uses your copyrighted work without permission, what to include, and how counter-notices work.",
};

export default function CopyrightPage() {
  return (
    <LegalPage
      title="Copyright & takedowns"
      intro="GifSuite stores GIFs that people grab from links. If one of them uses your work without permission, tell us and we'll take it down."
    >
      <h2>How to ask for a GIF to be removed</h2>
      <p>
        Email <Email /> with the subject &ldquo;Takedown&rdquo;. To act quickly, we need these (they are what the US
        Digital Millennium Copyright Act asks for):
      </p>
      <ol>
        <li>The work you own (or represent), described or linked.</li>
        <li>The GifSuite link of each GIF you want removed (it looks like gifsuite.com/g/…).</li>
        <li>Your name, postal address, phone number and email.</li>
        <li>
          This statement: &ldquo;I have a good faith belief that use of the material in the manner complained of is not
          authorized by the copyright owner, its agent, or the law.&rdquo;
        </li>
        <li>
          This statement: &ldquo;The information in this notice is accurate, and under penalty of perjury, I am the owner,
          or an agent authorized to act on behalf of the owner, of an exclusive right that is allegedly infringed.&rdquo;
        </li>
        <li>Your physical or electronic signature (typing your full name works).</li>
      </ol>
      <p>
        We remove or disable access to the GIF, usually within two working days. Its page, downloads and timeline entry
        stop working. Each &ldquo;Report this GIF&rdquo; link on a GIF&rsquo;s page also reaches us, and enough reports
        hide a GIF automatically while we look at it.
      </p>

      <h2>If your GIF was removed by mistake</h2>
      <p>
        If you grabbed a GIF that was removed and you believe that was a mistake or that you had the right to use it, you
        can send a counter-notice to <Email /> with:
      </p>
      <ol>
        <li>The GifSuite link of the removed GIF.</li>
        <li>Your name, address, phone number and email.</li>
        <li>
          A statement, under penalty of perjury, that you have a good faith belief the material was removed as a result of
          mistake or misidentification.
        </li>
        <li>
          A statement that you consent to the jurisdiction of the courts for your address (or, outside the United States,
          any judicial district in which GifSuite may be found), and that you will accept service of process from the
          person who sent the takedown.
        </li>
        <li>Your physical or electronic signature.</li>
      </ol>
      <p>
        We forward the counter-notice to the person who asked for the removal. Unless they tell us within 10 to 14
        working days that they have started a court case, we may restore the GIF.
      </p>

      <h2>Before you send a notice</h2>
      <p>
        Short clips used for comment, criticism or parody can be lawful in some countries. Sending a notice you know to
        be false can make you liable for damages. If you&rsquo;re not sure, ask a lawyer.
      </p>

      <h2>Other removal requests</h2>
      <p>
        For anything that isn&rsquo;t copyright (a GIF that shows you without consent, private information, or illegal
        content), email <Email /> with the GIF&rsquo;s link and why it should come down. Content that sexualises minors
        is removed immediately and reported to the authorities.
      </p>
    </LegalPage>
  );
}
