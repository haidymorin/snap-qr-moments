import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { photoBg } from "@/lib/photos";

/* Plus d'aplats dégradés en guise de photos : les vignettes montrent de
   vraies photos de mariage, les mêmes que sur l'accueil. */

/* --- Les quatre visuels. Aucune icône étirée : des formes qui disent
       vraiment ce que fait l'étape. --- */

/** Un QR code dessiné en CSS, avec ses trois carrés d'angle. */
function QrVisual() {
  const N = 11;
  const inEye = (r: number, c: number) =>
    (r < 4 && c < 4) || (r < 4 && c > N - 5) || (r > N - 5 && c < 4);
  const filled = (r: number, c: number) => ((r * 5 + c * 3 + ((r * c) % 7)) % 11) < 5;

  return (
    <div className="relative aspect-square w-full max-w-[380px] border border-border bg-card p-[9%]">
      <div className="relative grid h-full w-full grid-cols-11 gap-[2px]">
        {Array.from({ length: N * N }, (_, i) => {
          const r = Math.floor(i / N);
          const c = i % N;
          if (inEye(r, c)) return <span key={i} />;
          return (
            <span
              key={i}
              className="bg-foreground"
              style={{ opacity: filled(r, c) ? 1 : 0 }}
            />
          );
        })}

        {/* Les trois yeux du QR : c'est eux qu'on reconnaît de loin */}
        {[
          { top: 0, left: 0 },
          { top: 0, right: 0 },
          { bottom: 0, left: 0 },
        ].map((pos, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute grid place-items-center border-[3px] border-foreground"
            style={{ ...pos, width: "30%", height: "30%" }}
          >
            <span className="block h-1/2 w-1/2 bg-foreground" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** La galerie qui se remplit : quelques cases encore vides. */
function UploadVisual() {
  const pending = [3, 7, 10];
  return (
    <div className="w-full border border-night-border bg-night-surface p-4">
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="aspect-square"
            style={
              pending.includes(i)
                ? { border: "1px dashed hsl(var(--night-muted))", opacity: 0.5 }
                : { background: photoBg(i * 3 + 1) }
            }
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-night-border pt-3">
        <span className="label-mono text-night-foreground opacity-100">9 / 12</span>
        <span className="h-1.5 w-1.5 animate-pulse bg-night-foreground" />
      </div>
    </div>
  );
}

/** Le tri par visage : six photos retenues sur vingt-quatre. */
function SortVisual() {
  const match = [2, 5, 9, 14, 18, 21];
  return (
    <div className="w-full">
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className={`aspect-square ${
              match.includes(i)
                ? "outline outline-1 outline-offset-2 outline-foreground"
                : "opacity-[0.32] grayscale"
            }`}
            style={{ background: photoBg(i * 3 + 2) }}
          />
        ))}
      </div>
    </div>
  );
}

/** Les objets : trois formats posés côte à côte. */
function ObjectsVisual() {
  const { t } = useLanguage();
  /* Trois formats vraiment différents : l'album est carré, la gazette est
     un tabloïd haut, le PDF a la forme d'une page. Ils reposent sur une
     même ligne, comme des objets posés sur une étagère. */
  const items = [
    { label: t("how.objA"), ratio: "aspect-square" },
    { label: t("how.objB"), ratio: "aspect-[5/8]" },
    { label: t("how.objC"), ratio: "aspect-[1/1.414]" },
  ];
  return (
    <div className="grid w-full grid-cols-3 items-end gap-4">
      {items.map((o, i) => (
        <div key={i}>
          <div
            className={`${o.ratio} grid place-items-center border border-border bg-night px-2 text-center`}
          >
            <span className="label-mono text-night-foreground">{t("home.objSoon")}</span>
          </div>
          <span className="label-mono mt-3 block text-foreground opacity-100">{o.label}</span>
        </div>
      ))}
    </div>
  );
}

const HowItWorks = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-[72px]">
        {/* Titre */}
        <section className="pb-[clamp(34px,4.5vw,60px)] pt-[clamp(52px,6.5vw,92px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] text-center">
            <p className="eyebrow">{t("how.eyebrow")}</p>
            <h1 className="mx-auto mt-3 max-w-[16ch] text-[clamp(40px,6.6vw,86px)]">
              {t("how.title1")}
              <br />
              {t("how.title2")}
            </h1>
            <p className="mx-auto mt-6 max-w-[54ch] text-[clamp(16px,1.7vw,18px)] leading-relaxed text-foreground">
              {t("how.subtitle")}
            </p>
          </div>
        </section>

        {/* 01 — Créer */}
        <section className="border-t border-border py-[clamp(52px,6.5vw,92px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="grid items-center gap-[clamp(30px,5vw,64px)] lg:grid-cols-2">
              <div>
                <span className="label-mono text-foreground opacity-100">{t("how.c1Num")}</span>
                <h2 className="mt-4 text-[clamp(30px,4.4vw,54px)] text-wrap balance">{t("how.c1Title")}</h2>
                <p className="mt-5 max-w-[48ch] leading-relaxed text-foreground">
                  {t("how.c1Desc")}
                </p>
                <ul className="mt-6 border-t border-border">
                  {[t("how.c1B1"), t("how.c1B2"), t("how.c1B3")].map((b) => (
                    <li key={b} className="border-b border-border py-3 text-[15px] text-foreground">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center lg:justify-end">
                <QrVisual />
              </div>
            </div>
          </div>
        </section>

        {/* 02 — Collecter, sur fond sombre */}
        <section className="bg-night py-[clamp(52px,6.5vw,92px)] text-night-foreground">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="grid items-center gap-[clamp(30px,5vw,64px)] lg:grid-cols-2">
              <div className="lg:order-2">
                <span className="label-mono text-night-foreground opacity-100">{t("how.c2Num")}</span>
                <h2 className="mt-4 text-[clamp(30px,4.4vw,54px)] text-wrap balance">{t("how.c2Title")}</h2>
                <p className="mt-5 max-w-[48ch] leading-relaxed">{t("how.c2Desc")}</p>
                <ul className="mt-6 border-t border-night-border">
                  {[t("how.c2B1"), t("how.c2B2"), t("how.c2B3")].map((b) => (
                    <li key={b} className="border-b border-night-border py-3 text-[15px]">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:order-1">
                <UploadVisual />
              </div>
            </div>
          </div>
        </section>

        {/* 03 — Trier */}
        <section className="py-[clamp(52px,6.5vw,92px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="grid items-center gap-[clamp(30px,5vw,64px)] lg:grid-cols-2">
              <div>
                <span className="label-mono text-foreground opacity-100">{t("how.c3Num")}</span>
                <h2 className="mt-4 text-[clamp(30px,4.4vw,54px)] text-wrap balance">{t("how.c3Title")}</h2>
                <p className="mt-5 max-w-[48ch] leading-relaxed text-foreground">
                  {t("how.c3Desc")}
                </p>
                <ul className="mt-6 border-t border-border">
                  {[t("how.c3B1"), t("how.c3B2"), t("how.c3B3")].map((b) => (
                    <li key={b} className="border-b border-border py-3 text-[15px] text-foreground">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <SortVisual />
                <p className="mt-4 text-[14px] italic text-foreground opacity-60">{t("how.c3Caption")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 04 — Garder */}
        <section className="border-t border-border bg-card py-[clamp(52px,6.5vw,92px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="grid items-center gap-[clamp(30px,5vw,64px)] lg:grid-cols-2">
              <div className="lg:order-2">
                <span className="label-mono text-foreground opacity-100">{t("how.c4Num")}</span>
                <h2 className="mt-4 text-[clamp(30px,4.4vw,54px)] text-wrap balance">{t("how.c4Title")}</h2>
                <p className="mt-5 max-w-[48ch] leading-relaxed text-foreground">
                  {t("how.c4Desc")}
                </p>
                <Link
                  to="/pricing"
                  className="label-mono mt-6 inline-block border-b border-foreground pb-0.5 text-foreground opacity-100 transition-opacity hover:opacity-60"
                >
                  {t("how.c4Link")}
                </Link>
              </div>
              <div className="lg:order-1">
                <ObjectsVisual />
              </div>
            </div>
          </div>
        </section>

        {/* Dernier appel */}
        <section className="py-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="bg-primary px-8 py-[clamp(44px,6vw,76px)] text-center text-primary-foreground">
              <p className="eyebrow text-primary-foreground">{t("how.ctaEyebrow")}</p>
              <h2 className="mx-auto mt-3 max-w-[22ch] text-[clamp(28px,4.3vw,50px)] text-wrap balance">
                {t("how.ctaTitle")}
              </h2>
              <p className="mx-auto mt-5 max-w-[48ch] leading-relaxed">{t("how.ctaDesc")}</p>
              <Link
                to="/auth"
                className="mt-8 inline-flex min-h-[48px] items-center border border-primary-foreground bg-primary-foreground px-8 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-transparent hover:text-primary-foreground"
              >
                {t("how.ctaButton")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
