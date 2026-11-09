import {
  BookOpen,
  Download,
  Flame,
  Gamepad2,
  Library,
  MonitorPlay,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: Gamepad2,
    title: "Interactive CockHero",
    copy: "Beat-synced experiences with hand-tuned funscripts. Pair with your device and press play.",
    tone: "pink",
  },
  {
    icon: Library,
    title: "100+ Media Files",
    copy: "Videos, galleries, illustrated PDFs and interactive scripts — all in one private library.",
    tone: "purple",
  },
  {
    icon: BookOpen,
    title: "Immersive Stories",
    copy: "Long-form illustrated stories built for the built-in reader. Slow burn, high production.",
    tone: "amber",
  },
  {
    icon: MonitorPlay,
    title: "2K Quality",
    copy: "Crisp 2K masters with clean audio. No compressed previews, no watermarked streams.",
    tone: "cyan",
  },
  {
    icon: Sparkles,
    title: "Daily Updates",
    copy: "A new drop almost every day, with a featured release every week. The library never sits still.",
    tone: "pink",
  },
  {
    icon: ShieldCheck,
    title: "Exclusive Access",
    copy: "Everything is private and members-only. No public feed, no leaks, no ads.",
    tone: "purple",
  },
  {
    icon: Download,
    title: "Download Offline",
    copy: "Save any file for offline viewing. Signed links are issued only to verified patrons.",
    tone: "green",
  },
  {
    icon: Smartphone,
    title: "Watch Everywhere",
    copy: "A mobile-first player that works on your phone, tablet, laptop and TV browser.",
    tone: "cyan",
  },
];

export function Features() {
  return (
    <section className="section features-section" id="features">
      <div className="container">
        <div className="features-head">
          <div>
            <p className="eyebrow">Built for members</p>
            <h2 className="section-title">Everything you want. Nothing you don&apos;t.</h2>
          </div>
          <p className="features-lede">
            A premium streaming experience designed around the way you actually watch:
            fast, private, high quality and always growing.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="feature-card" key={feature.title}>
                <span className={`feature-icon feature-icon--${feature.tone}`}>
                  <Icon size={20} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            );
          })}
        </div>

        <div className="feature-strip">
          <span><Flame size={15} /> 100% private</span>
          <span>No ads</span>
          <span>No pay-per-view</span>
          <span>Cancel anytime</span>
          <span>Patreon verified</span>
        </div>
      </div>
    </section>
  );
}
