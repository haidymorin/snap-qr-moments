import { Navigate, useSearchParams } from "react-router-dom";

/* Tant que la vente est fermée, /creer ne doit pas s'ouvrir : il finit sur une
   page bancaire. On renvoie vers la réservation de date en conservant la
   formule choisie, pour que le formulaire arrive pré-rempli. */
const RedirigerVersReservation = () => {
  const [parametres] = useSearchParams();
  const formule = parametres.get("formule");
  return <Navigate to={"/reserver" + (formule ? "?formule=" + formule : "")} replace />;
};

export default RedirigerVersReservation;
