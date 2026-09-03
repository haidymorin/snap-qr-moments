import JSZip from "jszip";
import { saveAs } from "file-saver";

/* Télécharger toute une galerie, sans faire tomber le téléphone.
 *
 * La version précédente chargeait tous les fichiers en mémoire avant de
 * fabriquer l'archive. Sur un mariage réel — neuf cents photos, quelques
 * vidéos — cela représente plus de deux gigaoctets d'un seul tenant : l'onglet
 * se ferme sans message, et personne ne comprend pourquoi. Ce n'est pas un cas
 * limite, c'est le cas normal du produit.
 *
 * On découpe donc en lots d'environ trois cents mégaoctets, chacun écrit sur
 * le disque avant que le suivant ne commence. Moins élégant qu'une archive
 * unique, mais l'opération arrive au bout — et sur « Mes envois » ou
 * « Photos de moi », il n'y aura de toute façon qu'un seul lot.
 */

/** Trois cents mégaoctets par archive : tenable même sur un téléphone modeste. */
const TAILLE_LOT = 300 * 1024 * 1024;

export interface FichierATelecharger {
  url: string;
  nom: string;
}

export interface Avancement {
  /** Fichiers déjà ajoutés à une archive. */
  faits: number;
  total: number;
  /** Numéro du lot en cours d'écriture, à partir de 1. */
  lot: number;
  lots: number;
}

/**
 * Récupère les fichiers et les enregistre en une ou plusieurs archives.
 * Renvoie le nombre de fichiers qui n'ont pas pu être récupérés.
 */
export async function telechargerEnLots(
  fichiers: FichierATelecharger[],
  baseNom: string,
  onProgress?: (a: Avancement) => void,
): Promise<number> {
  if (fichiers.length === 0) return 0;

  /* Le nombre de lots n'est connu qu'après coup, puisqu'il dépend du poids
     réel des fichiers. On l'estime pour l'affichage, à partir d'une photo
     moyenne de 2,5 Mo, et on le corrige au fur et à mesure. */
  let lotsEstimes = Math.max(1, Math.ceil((fichiers.length * 2.5 * 1024 * 1024) / TAILLE_LOT));

  let zip = new JSZip();
  let poidsLot = 0;
  let fichiersLot = 0;
  let lot = 1;
  let faits = 0;
  let echecs = 0;

  const ecrireLot = async () => {
    if (fichiersLot === 0) return;
    const archive = await zip.generateAsync({ type: "blob" });
    const suffixe = lotsEstimes > 1 ? `-${lot}sur${lotsEstimes}` : "";
    saveAs(archive, `${baseNom}${suffixe}.zip`);
    zip = new JSZip();
    poidsLot = 0;
    fichiersLot = 0;
    lot += 1;
  };

  const noms = new Set<string>();
  const nomUnique = (nom: string) => {
    if (!noms.has(nom)) { noms.add(nom); return nom; }
    const point = nom.lastIndexOf(".");
    const base = point > 0 ? nom.slice(0, point) : nom;
    const ext = point > 0 ? nom.slice(point) : "";
    let n = 2;
    while (noms.has(`${base}-${n}${ext}`)) n += 1;
    const unique = `${base}-${n}${ext}`;
    noms.add(unique);
    return unique;
  };

  for (const fichier of fichiers) {
    try {
      const res = await fetch(fichier.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();

      // Un fichier plus gros que le lot entier part seul : on ne le coupe pas.
      if (poidsLot > 0 && poidsLot + blob.size > TAILLE_LOT) {
        await ecrireLot();
        if (lot > lotsEstimes) lotsEstimes = lot;
      }

      zip.file(nomUnique(fichier.nom), blob);
      poidsLot += blob.size;
      fichiersLot += 1;
    } catch {
      /* Un fichier manquant ne doit pas faire échouer l'archive entière :
         on le compte et on continue. */
      echecs += 1;
    }
    faits += 1;
    onProgress?.({ faits, total: fichiers.length, lot, lots: Math.max(lot, lotsEstimes) });
  }

  await ecrireLot();
  return echecs;
}
