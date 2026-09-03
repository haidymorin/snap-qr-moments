-- Fermer l'écriture dans le seau de stockage Supabase.
--
-- Vérifié en conditions réelles depuis un navigateur, avec la seule clé
-- publique : un fichier texte quelconque a été déposé dans `event-photos`,
-- sans compte, sans événement, sans la moindre vérification. Réponse 200. Le
-- listage du seau répond lui aussi. Seule la suppression est refusée.
--
-- Ce n'est pas une faille théorique : n'importe qui peut se servir de ce seau
-- comme d'un hébergement gratuit, sur la facture de QR Memories, et y déposer
-- ce qu'il veut — y compris ce dont on ne voudrait pas être l'hébergeur.
--
-- La correction est simple parce que ce seau ne sert plus à rien : depuis la
-- migration vers Cloudflare R2, plus aucun dépôt ne passe par là. Il ne
-- conserve que les photos antérieures, qui doivent rester lisibles pour que
-- les galeries existantes ne se vident pas. On ferme donc l'écriture, et
-- seulement l'écriture.

/* Les politiques d'écriture sont retirées par recherche plutôt que par nom :
   elles ont été créées à des moments différents, certaines par Lovable, et
   personne ne tient la liste. On ne touche qu'à ce seau, et qu'aux écritures
   — la lecture publique reste, c'est elle qui affiche les galeries. */
do $$
declare
  pol record;
begin
  for pol in
    select policyname, cmd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
      and (coalesce(qual, '') like '%event-photos%'
        or coalesce(with_check, '') like '%event-photos%')
  loop
    begin
      execute format('drop policy %I on storage.objects', pol.policyname);
      raise notice 'politique d''écriture retirée : % (%)', pol.policyname, pol.cmd;
    exception when insufficient_privilege then
      raise notice 'politique % non retirée, privilèges insuffisants', pol.policyname;
    end;
  end loop;
end $$;