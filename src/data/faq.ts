export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "What is Jerryhub?",
    answer:
      "Jerryhub is a premium, members-only entertainment club for anime, interactive experiences, high-resolution artwork, 2D games and illustrated stories. Everything lives in one private library, with no ads and no public feed.",
  },
  {
    question: "What membership plans are available?",
    answer:
      "Jerryhub offers two membership levels: Basic Access starting at $5 and Full Access at $9.50. Each plan provides access according to its assigned membership benefits.",
  },
  {
    question: "What is included in Basic Access?",
    answer:
      "Basic Access provides access to content and features specifically assigned to the Basic membership tier. That includes the entry-level premium collection, Basic member-exclusive content, and streaming or downloads for Basic content.",
  },
  {
    question: "What is included in Full Access?",
    answer:
      "Full Access includes every Basic Access benefit plus all content designated for Full Access members: all premium animation collections, eligible videos, artwork, 2D games, manga and comics, and future Full Access drops.",
  },
  {
    question: "How do I get access?",
    answer:
      "Click any membership or 'Log in with Patreon' button. You'll be sent to Patreon to authorise the connection. When you return, we verify your current entitled tier server-side and unlock the content included with that tier.",
  },
  {
    question: "Can I upgrade my membership?",
    answer:
      "Yes. Members can upgrade through the available Patreon membership options. Your access updates after membership verification — Full Access unlocks the complete library, including every Basic benefit.",
  },
  {
    question: "What happens if my membership expires?",
    answer:
      "Access to member-exclusive content is updated according to your verified membership status. If your pledge becomes inactive, declined or changes tier, access is recalculated from your current entitlement. A previous higher tier never grants Full Access on its own.",
  },
  {
    question: "What is an interactive CockHero or funscript?",
    answer:
      "A funscript is a small file that syncs an interactive device (like the Handy or OSR2) to a video. CockHero experiences are edited videos built around a beat and paired with a funscript. Download the file, load it in a supported player, and press play.",
  },
  {
    question: "Is the content really in 2K?",
    answer:
      "Yes. New animations are mastered and uploaded in 2K where the source allows. Older titles are being remastered over time. Each set shows its available quality and file details before you download.",
  },
  {
    question: "Can I download content?",
    answer:
      "Members can download the videos, images, PDF stories and funscripts included with their access level. Downloads use short-lived signed links tied to your account. Please keep files private — sharing them can result in losing access.",
  },
  {
    question: "How often is new content added?",
    answer:
      "We aim for a new drop every day, with larger featured releases each week. Follow the Newest Uploads page or keep an eye on the announcement bar for the latest additions.",
  },
  {
    question: "How do I cancel or manage my membership?",
    answer:
      "All billing is handled by Patreon. Open the Account page and choose 'Manage on Patreon' to change your tier, update payment details or cancel. Cancelling stops future billing and updates library access at the end of your current period.",
  },
  {
    question: "Is my payment information secure?",
    answer:
      "We never see or store your card details. Patreon processes every payment. This site only receives your Patreon identity, membership status and entitled tier IDs so it can decide which content to unlock.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Because access is delivered instantly and the library is digital, memberships are generally non-refundable. If something went wrong with a charge, contact us and we'll help you resolve it with Patreon.",
  },
  {
    question: "Is this site only for adults?",
    answer:
      "Yes. Jerryhub is strictly 18+ and contains explicit adult animation. By entering you confirm you are of legal age in your jurisdiction and consent to viewing adult material.",
  },
];
