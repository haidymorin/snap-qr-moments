import Header from "@/components/Header";
import Footer from "@/components/Footer";

/* Conditions générales de vente.

   Rédigées à partir de la grille tarifaire réelle (59 / 179 / 390 €, acompte
   de 50 %, hébergement 6 mois pour toutes les formules) et du fonctionnement réel du
   service. Les mentions entre crochets doivent être remplies dès l'obtention
   du SIRET : sans elles, le document est incomplet au regard du code de la
   consommation, et Stripe le vérifie avant d'activer les paiements réels.

   Le contenu est ici en français seulement, comme les mentions légales et la
   politique de confidentialité. Il est rangé dans un tableau de sections pour
   qu'une version anglaise puisse être ajoutée sans retoucher la mise en page. */

const A_COMPLETER = "[à compléter]";

type Bloc = { t?: string; p?: string[]; li?: string[] };
type Section = { n: string; titre: string; blocs: Bloc[] };

const SECTIONS: Section[] = [
  {
    n: "01",
    titre: "Qui vend, et à qui",
    blocs: [
      {
        p: [
          `Le service QR Memories est édité par Haïdy Morin, entrepreneur individuel, immatriculée sous le numéro SIRET ${A_COMPLETER}, dont le siège est situé ${A_COMPLETER}.`,
          `Contact : ${A_COMPLETER}. C'est l'adresse à laquelle toute question, réclamation ou demande d'annulation doit être adressée.`,
          "Les présentes conditions régissent toute commande passée sur le site par un particulier agissant en dehors de son activité professionnelle. Elles sont acceptées au moment du paiement et prévalent sur tout autre document.",
        ],
      },
    ],
  },
  {
    n: "02",
    titre: "Ce qui est vendu",
    blocs: [
      {
        p: [
          "QR Memories fournit une page de collecte accessible par QR code, sur laquelle les invités d'un événement déposent leurs photos et vidéos sans installer d'application, ainsi qu'une galerie en ligne où l'hôte les retrouve triées.",
        ],
      },
      {
        t: "Les trois formules",
        li: [
          "Essentiel — 59 € : QR code et page de collecte, galerie partagée, téléchargement en haute définition, nettoyage automatique des doublons et des photos floues, PDF de signalétique à imprimer, hébergement 6 mois.",
          "Souvenir — 179 € : tout l'Essentiel, plus le livre d'or numérique (messages écrits, vocaux et vidéo), le tri par visage, le diaporama projeté pendant la soirée, la personnalisation aux couleurs de l'événement, hébergement 6 mois.",
          "Héritage — 390 € : tout le Souvenir, plus l'album imprimé grand format et la gazette de l'événement en 50 exemplaires, hébergement 6 mois.",
        ],
      },
      {
        t: "Les objets imprimés, commandés séparément",
        li: [
          "Album grand format — 249 €",
          "Gazette de l'événement, 50 exemplaires — 149 € · 100 exemplaires — 219 €",
          "Mini-album personnalisé — 79 €",
          "Kit de signalétique imprimé — 89 €",
          "Année d'hébergement supplémentaire — 29 €",
        ],
      },
      {
        p: [
          "Les prix sont indiqués en euros, toutes taxes comprises. TVA non applicable, article 293 B du code général des impôts, tant que le seuil de la franchise en base n'est pas dépassé. Les frais de livraison des objets imprimés sont inclus pour la France métropolitaine.",
        ],
      },
    ],
  },
  {
    n: "03",
    titre: "Commander et payer",
    blocs: [
      {
        p: [
          "La commande se fait en ligne sur le site, ou sur devis lorsque la vente passe par un prestataire de mariage. Elle est ferme à réception du paiement.",
          "Les paiements sont traités par Stripe. Aucune donnée de carte bancaire ne transite par nos serveurs ni n'y est conservée. Le libellé qui apparaît sur le relevé bancaire est QR MEMORIES.",
          "Sur devis, un acompte de 50 % est exigible à la commande et le solde le jour de la livraison de la galerie. Un devis est valable 30 jours.",
        ],
      },
    ],
  },
  {
    n: "04",
    titre: "Ce qui est livré, et quand",
    blocs: [
      {
        p: [
          "Le QR code, la page de collecte et les fichiers de signalétique sont mis à disposition dans les 48 heures suivant la commande, et au plus tard la veille de l'événement.",
          "La collecte reste ouverte pendant l'événement et les 48 heures qui suivent. La galerie triée est livrée dans les 7 jours suivant la fermeture de la collecte.",
          "Les objets imprimés sont commandés après validation de la sélection par le client. Ils sont expédiés sous 10 à 15 jours ouvrés à compter de cette validation. Ce délai dépend de l'imprimeur et ne peut être garanti pour une date précise.",
        ],
      },
    ],
  },
  {
    n: "05",
    titre: "Combien de temps les photos sont conservées",
    blocs: [
      {
        p: [
          "La galerie reste en ligne six mois à compter de la date de l'événement, quelle que soit la formule. Cette durée est la même pour tous parce que nous préférons tenir un engagement court plutôt qu'en promettre un long dont nous ne pourrions pas répondre.",
          "Un rappel est envoyé au client 30 jours avant l'échéance. Passé ce terme, les photos, vidéos et messages sont supprimés définitivement de nos serveurs et de ceux de notre hébergeur. Cette suppression est irréversible.",
          "La galerie peut être prolongée d'une année pour 29 €, à tout moment tant que l'échéance n'est pas atteinte. Il appartient au client de télécharger ses fichiers avant le terme.",
        ],
      },
    ],
  },
  {
    n: "06",
    titre: "Rétractation",
    blocs: [
      {
        p: [
          "Le client dispose de quatorze jours à compter de la commande pour se rétracter, sans avoir à motiver sa décision, en écrivant à l'adresse de contact indiquée à l'article 01. Le remboursement intervient dans les quatorze jours suivant la réception de cette demande, par le même moyen de paiement.",
        ],
      },
      {
        t: "Les deux cas où ce droit ne s'applique pas",
        p: [
          "Lorsque l'événement a lieu avant la fin du délai de quatorze jours, le client demande expressément l'exécution anticipée du service. Conformément à l'article L221-28 du code de la consommation, il perd alors son droit de rétractation une fois la prestation pleinement exécutée, et cette demande lui est présentée au moment du paiement.",
          "Les objets imprimés sont confectionnés à partir des photos et des textes choisis par le client. Ce sont des biens nettement personnalisés au sens du même article : une fois la sélection validée et la fabrication lancée, ils ne peuvent être ni repris ni remboursés, sauf défaut de fabrication.",
        ],
      },
    ],
  },
  {
    n: "07",
    titre: "Si l'événement est reporté ou annulé",
    blocs: [
      {
        p: [
          "Un mariage se déplace parfois. Le report est gratuit et sans limite de nombre : il suffit de nous prévenir avant la date initialement prévue. La prestation est reportée à la nouvelle date, et la durée d'hébergement court à compter de celle-ci.",
        ],
      },
      {
        t: "En cas d'annulation pure et simple",
        p: [
          "L'annulation s'entend du renoncement définitif à la prestation, par opposition au report, qui reste ouvert à tout moment et sans frais.",
        ],
        li: [
          "Plus de 90 jours avant l'événement : remboursement de 70 % du montant versé, 30 % restant acquis au titre de l'ouverture du dossier et de la préparation.",
          "Entre 90 et 30 jours avant : remboursement de 50 % du montant versé.",
          "Moins de 30 jours avant : aucun remboursement. À ce stade la prestation est préparée, le QR code émis, la signalétique produite et la date réservée. Le client conserve à tout moment la possibilité de reporter plutôt que d'annuler.",
          "Les objets imprimés dont la fabrication est lancée restent dus en totalité, quelle que soit la date.",
        ],
      },
      {
        p: [
          "Si nous nous trouvions dans l'impossibilité d'assurer la prestation, le client serait intégralement remboursé sous quatorze jours.",
        ],
      },
    ],
  },
  {
    n: "08",
    titre: "Les photos déposées par les invités",
    blocs: [
      {
        p: [
          "Le client reste propriétaire des contenus déposés sur sa galerie. Nous n'en acquérons aucun droit et ne les utilisons ni à des fins commerciales, ni promotionnelles, ni d'entraînement de modèles.",
          "Le client est responsable de l'information de ses invités et se porte garant du fait qu'aucun contenu déposé ne porte atteinte aux droits d'un tiers. Toute personne figurant sur une photo peut en demander le retrait à l'adresse de contact ; nous procédons au retrait sans délai et en informons le client.",
          "Le tri par visage repose sur un consentement individuel : l'invité qui souhaite retrouver ses propres photos se prend en photo pour être reconnu. Ceux qui ne le font pas ne sont pas indexés. Les données biométriques correspondantes sont supprimées en même temps que la galerie.",
          "Nous nous réservons le droit de retirer sans préavis tout contenu manifestement illicite.",
        ],
      },
    ],
  },
  {
    n: "09",
    titre: "Ce dont nous répondons",
    blocs: [
      {
        p: [
          "Nous mettons en œuvre les moyens nécessaires à la disponibilité du service et à la sauvegarde des contenus, sans pouvoir garantir un fonctionnement ininterrompu — nous dépendons pour cela de nos hébergeurs et du réseau du lieu de réception.",
          "Le tri automatique est une aide à la sélection, non une garantie de résultat : il peut écarter une photo réussie ou en conserver une ratée. Le client garde la main sur la sélection finale de tout objet imprimé.",
          "Notre responsabilité ne saurait excéder le montant effectivement payé pour la commande concernée. Rien dans le présent article n'écarte la garantie légale de conformité ni la garantie des vices cachés.",
        ],
      },
    ],
  },
  {
    n: "10",
    titre: "Données personnelles",
    blocs: [
      {
        p: [
          "Le traitement des données personnelles est décrit dans la politique de confidentialité, accessible depuis le pied de page. Le client et ses invités disposent d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité, qu'ils exercent à l'adresse de contact indiquée à l'article 01.",
        ],
      },
    ],
  },
  {
    n: "11",
    titre: "Réclamations et litiges",
    blocs: [
      {
        p: [
          "Toute réclamation doit être adressée à l'adresse de contact indiquée à l'article 01. Nous nous engageons à répondre sous 5 jours ouvrés.",
          `En cas de désaccord persistant, le client peut recourir gratuitement au médiateur de la consommation dont nous relevons : ${A_COMPLETER}. Il peut également saisir la plateforme européenne de règlement en ligne des litiges.`,
          "Les présentes conditions sont soumises au droit français. À défaut d'accord amiable, le litige relève des juridictions compétentes dans les conditions prévues par le code de procédure civile.",
        ],
      },
    ],
  },
];

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-[72px]">
        <section className="pb-[clamp(30px,4vw,52px)] pt-[clamp(48px,6vw,86px)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,5vw,48px)]">
            <p className="eyebrow">Conditions</p>
            <h1 className="mt-3 text-[clamp(34px,5.4vw,64px)] text-wrap balance">
              Conditions générales
              <br />
              de vente
            </h1>
            <p className="mt-6 max-w-[54ch] text-[clamp(16px,1.7vw,18px)] leading-relaxed text-muted-foreground">
              Ce que vous achetez, ce que nous livrons, dans quels délais, et ce qui se passe
              si votre événement est reporté.
            </p>
            <p className="label-mono mt-6 text-muted-foreground">
              Version du 1er septembre 2026
            </p>
          </div>
        </section>

        <section className="pb-[clamp(56px,7vw,96px)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,5vw,48px)]">
            <div className="border-t border-border">
              {SECTIONS.map((s) => (
                <article key={s.n} className="border-b border-border py-[clamp(28px,3.4vw,44px)]">
                  <span className="label-mono text-foreground">{s.n}</span>
                  <h2 className="mt-3 text-[clamp(22px,2.4vw,30px)] text-wrap balance">{s.titre}</h2>

                  {s.blocs.map((b, i) => (
                    <div key={i} className="mt-5">
                      {b.t && (
                        <h3 className="mb-3 text-[16px] font-semibold text-foreground">{b.t}</h3>
                      )}
                      {b.p?.map((par, j) => (
                        <p key={j} className="mb-3 text-[16px] leading-relaxed text-muted-foreground">
                          {par}
                        </p>
                      ))}
                      {b.li && (
                        <ul className="mt-1 border-t border-border">
                          {b.li.map((item) => (
                            <li
                              key={item}
                              className="border-b border-border py-3 text-[15.5px] leading-relaxed text-muted-foreground"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
