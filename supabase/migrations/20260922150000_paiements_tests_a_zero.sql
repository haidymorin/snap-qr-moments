-- Les paiements enregistrés avant l'ouverture de la vente étaient des essais
-- (mode test Stripe) : ils faussaient le chiffre d'affaires du tableau admin.
-- Seul le paiement réel de 0,59 € est conservé tel quel.
update public.paiements
   set montant_centimes = 0,
       statut = 'test'
 where coalesce(montant_centimes, 0) <> 59;
