import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";

/* Photos de mariage libres de droits (Pexels — licence gratuite, usage
   commercial autorisé, sans attribution obligatoire). Servies par le CDN de
   Pexels, recadrées en carré à 420 px : une vingtaine de Ko par vignette.
   Pour les héberger nous-mêmes plus tard, il suffira de remplacer photoUrl. */
const PHOTO_IDS = [
  36028957, 10622328, 12919433, 19691776,
  6918173, 2765703, 8210489, 1128784,
  28123410, 15964962, 10360902, 15964954,
  26558729, 30505255, 10360901, 17111049,
];
const photoUrl = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=420&h=420&fit=crop`;
const photo = (i: number) =>
  photoUrl(PHOTO_IDS[((i % PHOTO_IDS.length) + PHOTO_IDS.length) % PHOTO_IDS.length]);

/** Le mur de photos qui se remplit au chargement, puis laisse place au titre. */
function PhotoWall() {
  const { t } = useLanguage();
  const [shown, setShown] = useState<number[]>([]);
  const [veil, setVeil] = useState(false);
  const [title, setTitle] = useState(false);
  const [size, setSize] = useState(48);
  const timers = useRef<number[]>([]);
  const wallRef = useRef<HTMLDivElement>(null);

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const el = wallRef.current;
    const cols = el && el.clientWidth < 560 ? 3 : el && el.clientWidth < 900 ? 5 : 8;
    const w = el?.clientWidth ?? 1200;
    const h = el?.clientHeight ?? 700;
    const total = cols * Math.max(Math.ceil(h / (w / cols)), 3);
    setSize(total);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(Array.from({ length: total }, (_, i) => i));
      setVeil(true);
      setTitle(true);
      return;
    }

    setShown([]);
    setVeil(false);
    setTitle(false);

    const order = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5);
    const step = 1900 / total;
    order.forEach((idx, k) => {
      timers.current.push(
        window.setTimeout(() => setShown((s) => [...s, idx]), 180 + k * step)
      );
    });

    timers.current.push(window.setTimeout(() => setVeil(true), 2250));
    timers.current.push(window.setTimeout(() => setTitle(true), 2750));
  }, []);

  useEffect(() => {
    play();
    return () => timers.current.forEach(clearTimeout);
  }, [play]);

  const cols = "grid-cols-3 sm:grid-cols-5 lg:grid-cols-8";

  return (
    <section className="relative flex min-h-[min(86vh,730px)] items-center justify-center overflow-hidden bg-[#DCD7CF]">
      <div ref={wallRef} aria-hidden className={`absolute inset-0 grid gap-1 p-1 ${cols}`}>
        {Array.from({ length: size }, (_, i) => (
          <div
            key={i}
            className="relative overflow-hidden bg-secondary transition-[opacity,transform] duration-500 ease-out"
            style={{
              opacity: shown.includes(i) ? 1 : 0,
              transform: shown.includes(i) ? "scale(1)" : "scale(0.93)",
            }}
          >
            <img
              src={photo(i * 5 + (i % 7))}
              alt=""
              loading={i < 12 ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.visibility = "hidden";
              }}
            />
          </div>
        ))}
      </div>

      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          opacity: veil ? 1 : 0,
          background:
            "linear-gradient(180deg, hsl(var(--background)/0.46), hsl(var(--background)/0.78) 46%, hsl(var(--background)/0.88))",
        }}
      />

      <div className="relative z-10 max-w-3xl px-5 py-16 text-center">

        <div
          className="transition-[opacity,transform] duration-700 ease-out"
          style={{ opacity: title ? 1 : 0, transform: title ? "none" : "translateY(14px)" }}
        >
          <p className="eyebrow mt-4">{t("home.heroEyebrow")}</p>
          <h1 className="mt-3 text-[clamp(46px,8.4vw,104px)] text-wrap balance">
            {t("home.heroTitle1")}
            <br />
            {t("home.heroTitle2")}
          </h1>
          <p className="mx-auto mt-6 max-w-[50ch] text-[clamp(16px,1.7vw,18px)] text-muted-foreground leading-relaxed">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex min-h-[48px] items-center border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
            >
              {t("home.ctaCreate")}
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex min-h-[48px] items-center border border-border px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary"
            >
              {t("home.ctaDiscover")}
            </Link>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={play}
        className="label-mono absolute bottom-4 right-4 z-10 min-h-[38px] border border-border bg-card px-4 py-2 transition-colors hover:text-foreground"
      >
        {t("home.replay")}
      </button>
    </section>
  );
}

const Index = () => {
  const { t } = useLanguage();

  const steps = [
    { n: t("home.step1Num"), title: t("home.step1Title"), text: t("home.step1Desc") },
    { n: t("home.step2Num"), title: t("home.step2Title"), text: t("home.step2Desc") },
    { n: t("home.step3Num"), title: t("home.step3Title"), text: t("home.step3Desc") },
  ];

  const objects = [
    { tag: t("home.obj1Tag"), title: t("home.obj1Title"), text: t("home.obj1Desc"), g: 4 },
    { tag: t("home.obj2Tag"), title: t("home.obj2Title"), text: t("home.obj2Desc"), g: 0 },
    { tag: t("home.obj3Tag"), title: t("home.obj3Title"), text: t("home.obj3Desc"), g: 6 },
    { tag: t("home.obj4Tag"), title: t("home.obj4Title"), text: t("home.obj4Desc"), g: 2 },
  ];

  const plans = [
    {
      name: t("home.plan1Name"),
      price: t("home.plan1Price"),
      text: t("home.plan1Desc"),
    },
    {
      name: t("home.plan2Name"),
      price: t("home.plan2Price"),
      text: t("home.plan2Desc"),
      highlighted: true,
      badge: t("home.plan2Badge"),
    },
    {
      name: t("home.plan3Name"),
      price: t("home.plan3Price"),
      text: t("home.plan3Desc"),
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <PhotoWall />

      {/* Le déroulé */}
      <section className="py-[clamp(58px,7.5vw,100px)]">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
          <div className="mx-auto mb-[clamp(32px,4.2vw,52px)] max-w-2xl text-center">
            <p className="eyebrow">{t("home.stepsEyebrow")}</p>
            <h2 className="mt-3 text-[clamp(34px,5.2vw,64px)] text-wrap balance">
              {t("home.stepsTitle1")}
              <br />
              {t("home.stepsTitle2")}
            </h2>
          </div>
          <div className="grid border-t border-border md:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={i}
                className="border-b border-border px-7 pb-10 pt-8 md:border-r md:last:border-r-0"
              >
                <div className="label-mono text-foreground">{s.n}</div>
                <h3 className="mb-3 mt-4 text-[clamp(24px,2.2vw,32px)] text-wrap balance">{s.title}</h3>
                <p className="text-[15.5px] leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Le tri automatique, sur fond sombre */}
      <section className="bg-night py-[clamp(58px,7.5vw,100px)] text-night-foreground">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
          <div className="grid items-center gap-[clamp(28px,5vw,58px)] lg:grid-cols-2">
            <div>
              <p className="eyebrow text-night-foreground">{t("home.aiEyebrow")}</p>
              <h2 className="mt-3 text-[clamp(34px,5.2vw,64px)] text-wrap balance">
                {t("home.aiTitle1")}
                <br />
                {t("home.aiTitle2")}
              </h2>
              <p className="mt-5 max-w-[50ch] leading-relaxed text-night-foreground opacity-85">{t("home.aiDesc")}</p>

              <div className="mt-6 flex flex-wrap items-center gap-4 border border-night-border bg-night-surface px-5 py-4">
                <div
                  className="h-12 w-12 shrink-0 rounded-full"
                  style={{ background: "linear-gradient(150deg,#8A6A46,#3A2E22)" }}
                />
                <div className="min-w-[210px] flex-1">
                  <strong className="block text-[15px] font-semibold text-night-foreground">{t("home.selfieTitle")}</strong>
                  <span className="text-[14px] text-night-foreground opacity-70">{t("home.selfieDesc")}</span>
                </div>
              </div>

              <Link
                to="/auth"
                className="mt-7 inline-flex min-h-[48px] items-center border border-night-foreground bg-night-foreground px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-night transition-colors hover:bg-transparent hover:text-night-foreground"
              >
                {t("home.aiCta")}
              </Link>
            </div>

            <div>
              <span className="label-mono text-night-muted">{t("home.gridFull")}</span>
              <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {Array.from({ length: 24 }, (_, i) => {
                  const match = [2, 5, 9, 14, 18, 21].includes(i);
                  return (
                    <div
                      key={i}
                      className={`relative aspect-square overflow-hidden bg-night-surface ${match ? "outline outline-1 outline-offset-2 outline-night-foreground" : "opacity-[0.16] grayscale"}`}
                    >
                      <img
                        src={photo(i * 3 + 2)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  );
                })}
              </div>
              <span className="label-mono mt-4 block text-night-foreground">{t("home.gridMatched")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Le livre d'or */}
      <section className="py-[clamp(58px,7.5vw,100px)]">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
          <div className="grid items-center gap-[clamp(28px,5vw,58px)] lg:grid-cols-2">
            <div>
              <p className="eyebrow">{t("home.guestbookEyebrow")}</p>
              <h2 className="mt-3 text-[clamp(34px,5.2vw,64px)] text-wrap balance">
                {t("home.guestbookTitle1")}
                <br />
                {t("home.guestbookTitle2")}
              </h2>
              <p className="mt-5 max-w-[50ch] leading-relaxed text-foreground opacity-80">{t("home.guestbookP1")}</p>
              <p className="mt-4 max-w-[50ch] leading-relaxed text-foreground opacity-80">{t("home.guestbookP2")}</p>
            </div>

            <figure className="m-0 border border-border bg-card p-[clamp(26px,3.6vw,42px)]">
              <div className="font-display text-[88px] leading-[0.52] opacity-30">&ldquo;</div>
              <blockquote className="m-0 mt-2 font-display text-[clamp(24px,3.1vw,34px)] italic leading-[1.32]">
                {t("home.quoteText")}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div
                  className="h-12 w-12 shrink-0 rounded-full"
                  style={{ background: "linear-gradient(150deg,#C9B79A,#8E7A5C)" }}
                />
                <div>
                  <b className="block text-[15px] font-semibold">{t("home.quoteAuthor")}</b>
                  <span className="label-mono">{t("home.quoteMeta")}</span>
                </div>
              </figcaption>
              <div className="mt-5 flex items-center gap-3 border border-border bg-background px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-[11px] text-primary-foreground">
                  ▶
                </span>
                <div className="flex h-6 flex-1 items-center gap-[2.5px]">
                  {Array.from({ length: 44 }, (_, i) => (
                    <i
                      key={i}
                      className="flex-1 bg-foreground opacity-40"
                      style={{ height: `${18 + Math.sin(i * 0.7) * 10 + Math.abs(Math.sin(i * 2.3)) * 40}%` }}
                    />
                  ))}
                </div>
                <span className="label-mono">0:38</span>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* Les offres : ce que ça coûte, avant de parler des objets */}
      <section className="border-t border-border py-[clamp(58px,7.5vw,100px)]">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
          <div className="mx-auto mb-[clamp(32px,4.2vw,52px)] max-w-2xl text-center">
            <p className="eyebrow">{t("home.plansEyebrow")}</p>
            <h2 className="mt-3 text-[clamp(34px,5.2vw,64px)] text-wrap balance">{t("home.plansTitle")}</h2>
            <p className="mx-auto mt-4 max-w-[52ch] leading-relaxed text-foreground opacity-80">
              {t("home.plansDesc")}
            </p>
          </div>

          <div className="grid gap-[clamp(13px,1.7vw,20px)] md:grid-cols-3">
            {plans.map((p, i) => (
              <article
                key={i}
                className={`flex flex-col border p-[clamp(22px,2.4vw,30px)] ${
                  p.highlighted
                    ? "border-night bg-night text-night-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <div className="flex min-h-[24px] items-start justify-between gap-3">
                  <h3 className="text-[clamp(24px,2.4vw,30px)] leading-none">{p.name}</h3>
                  {p.badge && (
                    <span
                      className={`label-mono shrink-0 border px-2 py-1 opacity-100 ${
                        p.highlighted ? "border-night-border text-night-foreground" : "border-border text-foreground"
                      }`}
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="mt-4 font-display text-[clamp(36px,3.8vw,46px)] leading-none">{p.price}</p>
                <p className={`mt-4 flex-1 text-[14.5px] leading-relaxed ${p.highlighted ? "opacity-75" : "opacity-80"}`}>
                  {p.text}
                </p>
                <Link
                  to="/pricing"
                  className={`label-mono mt-6 self-start border-b pb-0.5 opacity-100 transition-opacity hover:opacity-60 ${
                    p.highlighted ? "border-night-foreground text-night-foreground" : "border-foreground text-foreground"
                  }`}
                >
                  {t("home.planDetail")}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Les objets imprimés, avec le mot posé en très grand */}
      <section className="relative overflow-hidden bg-card py-[clamp(58px,7.5vw,100px)]">
        <div className="giant-word bottom-[6%] text-[clamp(120px,21vw,300px)]">MEMORIES</div>
        <div className="relative z-10 mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
          <div className="mx-auto mb-[clamp(32px,4.2vw,52px)] max-w-2xl text-center">
            <p className="eyebrow">{t("home.objEyebrow")}</p>
            <h2 className="mt-3 text-[clamp(34px,5.2vw,64px)] text-wrap balance">{t("home.objTitle")}</h2>
            <p className="mx-auto mt-4 max-w-[54ch] leading-relaxed text-foreground opacity-80">{t("home.objDesc")}</p>
          </div>

          <div className="grid gap-[clamp(13px,1.7vw,20px)] sm:grid-cols-2 xl:grid-cols-4">
            {objects.map((o, i) => (
              <article key={i} className="flex flex-col border border-border bg-background">
                <div className="relative aspect-[3/2] border-b border-border bg-secondary">
                  <span className="label-mono absolute left-2.5 top-2.5 bg-card px-2 py-1 text-foreground">
                    {o.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-3 text-[clamp(22px,2vw,28px)] text-wrap balance text-foreground">{o.title}</h3>
                  <p className="mb-5 flex-1 text-[14.5px] leading-relaxed text-foreground opacity-80">{o.text}</p>
                  <div className="border-t border-border pt-4">
                    <Link
                      to="/pricing"
                      className="label-mono border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
                    >
                      {t("home.see")}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Dernier appel */}
      <section className="py-[clamp(58px,7.5vw,100px)]">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
          <div className="bg-primary px-8 py-[clamp(44px,6vw,76px)] text-center text-primary-foreground">
            <p className="eyebrow text-primary-foreground">{t("home.finalEyebrow")}</p>
            <h2 className="mx-auto mt-3 max-w-[22ch] text-[clamp(32px,5vw,58px)] text-wrap balance">{t("home.finalTitle")}</h2>
            <p className="mx-auto mt-5 max-w-[48ch] leading-relaxed opacity-90">{t("home.finalDesc")}</p>
            <Link
              to="/auth"
              className="mt-8 inline-flex min-h-[48px] items-center border border-primary-foreground bg-primary-foreground px-8 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-transparent hover:text-primary-foreground"
            >
              {t("home.finalCta")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
