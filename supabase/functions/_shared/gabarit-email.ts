// Le gabarit des e-mails envoyés aux invités et aux mariés.
//
// Il reprend la direction artistique du site (« Signal », septembre 2026) :
// fond blanc, aubergine pour l'action, cuivre pour les étiquettes en
// capitales espacées, Bricolage Grotesque pour les titres, Instrument Sans
// pour le texte. La couleur vient des photos de l'événement, pas du gabarit.
//
// Contraintes propres aux e-mails, qui expliquent la forme du code :
//   · mise en page en tableaux et styles en ligne : Gmail et Outlook
//     ignorent la plupart des feuilles de style ;
//   · les polices du site se chargent sur iPhone et Apple Mail ; ailleurs,
//     Helvetica et Arial prennent le relais, d'où les piles de polices ;
//   · largeur 560 px, lisible sur téléphone sans zoom.
//
// Règle de rédaction : pas de tiret long dans les textes envoyés.

export const COULEURS = {
  encre: "#111014",
  aubergine: "#40203B",
  cuivre: "#C1793E",
  gris: "#69606C",
  filet: "#EAE6EA",
  surface: "#F8F7F8",
  blanc: "#FFFFFF",
};

const TITRE = "'Bricolage Grotesque','Helvetica Neue',Helvetica,Arial,sans-serif";
const TEXTE = "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'JetBrains Mono',Menlo,Consolas,monospace";

export const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Un texte libre, découpé en paragraphes. Rien d'autre n'est interprété. */
export const paragraphes = (texte: string) =>
  texte
    .split(/\n{2,}/)
    .map((p) =>
      `<p style="margin:0 0 14px;font:16px/1.6 ${TEXTE};color:${COULEURS.encre}">` +
      `${echapper(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

export interface Bouton {
  texte: string;
  lien: string;
  /** Le bouton principal est plein ; le second est cerné. */
  secondaire?: boolean;
}

export interface Gabarit {
  /** Le texte que la boîte de réception montre sous l'objet. */
  apercu: string;
  /** Étiquette en capitales, au-dessus du titre (ex. « Mariage · 27 juillet 2026 »). */
  etiquette?: string;
  titre: string;
  /** Du HTML déjà échappé (voir `paragraphes`). */
  corps: string;
  /** Jusqu'à trois vignettes de l'événement. */
  photos?: string[];
  /** Une ligne sous les photos, ex. « 143 photos déjà déposées ». */
  legendePhotos?: string;
  boutons: Bouton[];
  /** Une phrase rassurante sous les boutons. */
  apres?: string;
  /** Pourquoi la personne reçoit ce message. */
  pied: string;
}

const bouton = (b: Bouton) => {
  const plein = !b.secondaire;
  return `
    <tr><td style="padding:0 0 10px">
      <a href="${b.lien}" style="display:block;text-align:center;text-decoration:none;
        padding:16px 24px;border-radius:999px;font:600 13px ${TEXTE};letter-spacing:.08em;text-transform:uppercase;
        ${plein
          ? `background:${COULEURS.aubergine};color:${COULEURS.blanc};border:1px solid ${COULEURS.aubergine}`
          : `background:${COULEURS.blanc};color:${COULEURS.aubergine};border:1px solid ${COULEURS.aubergine}`}">
        ${echapper(b.texte)}
      </a>
    </td></tr>`;
};

const grillePhotos = (photos: string[]) => {
  if (photos.length === 0) return "";
  const cases = photos.slice(0, 3).map((url, i, tout) => `
    <td width="${Math.floor(100 / tout.length)}%" style="padding:0 ${i < tout.length - 1 ? 6 : 0}px 0 0" valign="top">
      <img src="${url}" alt="" width="100%" style="display:block;width:100%;height:150px;object-fit:cover;border-radius:14px;border:0">
    </td>`).join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${cases}</tr></table>`;
};

export function rendreEmail(g: Gabarit): string {
  const c = COULEURS;
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700&family=Instrument+Sans:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<title>${echapper(g.titre)}</title>
</head>
<body style="margin:0;padding:0;background:${c.surface}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${echapper(g.apercu)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.surface}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${c.blanc};border:1px solid ${c.filet};border-radius:22px">
    <tr><td style="padding:26px 32px 0">
      <span style="font:700 19px ${TITRE};letter-spacing:-.02em;color:${c.encre}">QR <i>Memories</i></span>
    </td></tr>
    <tr><td style="padding:34px 32px 0">
      ${g.etiquette
        ? `<p style="margin:0 0 12px;font:500 11.5px ${MONO};letter-spacing:.2em;text-transform:uppercase;color:${c.cuivre}">${echapper(g.etiquette)}</p>`
        : ""}
      <h1 style="margin:0 0 18px;font:700 34px/1.08 ${TITRE};letter-spacing:-.035em;color:${c.encre}">${echapper(g.titre)}</h1>
      ${g.corps}
    </td></tr>
    ${g.photos && g.photos.length
      ? `<tr><td style="padding:10px 32px 0">${grillePhotos(g.photos)}
          ${g.legendePhotos
            ? `<p style="margin:10px 0 0;font:500 11px ${MONO};letter-spacing:.16em;text-transform:uppercase;color:${c.gris}">${echapper(g.legendePhotos)}</p>`
            : ""}
        </td></tr>`
      : ""}
    <tr><td style="padding:28px 32px 4px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${g.boutons.map(bouton).join("")}</table>
    </td></tr>
    ${g.apres
      ? `<tr><td style="padding:4px 32px 0"><p style="margin:0;font:14px/1.55 ${TEXTE};color:${c.gris}">${echapper(g.apres)}</p></td></tr>`
      : ""}
    <tr><td style="padding:28px 32px 28px">
      <p style="margin:0;padding-top:18px;border-top:1px solid ${c.filet};font:12.5px/1.6 ${TEXTE};color:${c.gris}">${echapper(g.pied)}</p>
    </td></tr>
  </table>
  <p style="margin:16px 0 0;font:500 10.5px ${MONO};letter-spacing:.2em;text-transform:uppercase;color:${c.gris}">qr-memories.fr</p>
</td></tr>
</table>
</body></html>`;
}

/** Une version texte, pour les messageries qui n'affichent pas le HTML. */
export function rendreTexte(g: Gabarit, texteBrut: string): string {
  return [
    g.titre,
    "",
    texteBrut,
    "",
    ...g.boutons.map((b) => `${b.texte} : ${b.lien}`),
    "",
    g.pied,
  ].join("\n");
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
  "septembre", "octobre", "novembre", "décembre"];

/** « 27 juillet 2026 », sans dépendre des réglages de langue du serveur. */
export const dateEnFrancais = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
};

const TYPES: Record<string, string> = {
  mariage: "Mariage", anniversaire: "Anniversaire", bapteme: "Baptême",
  entreprise: "Événement", autre: "Événement",
};
export const typeEnFrancais = (t: string | null | undefined) => TYPES[t ?? ""] ?? "Événement";

/** Le nom d'expéditeur sans les caractères qui casseraient l'en-tête. */
export const nomExpediteur = (nom: string) =>
  `${nom.replace(/["<>\r\n]/g, "").slice(0, 60)} via QR Memories <contact@qr-memories.fr>`;
