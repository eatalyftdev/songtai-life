import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      "nav.home": "Home",
      "nav.about": "Our Story",
      "nav.products": "Products",
      "nav.opportunity": "Opportunity",
      "nav.events": "Events",
      "nav.blog": "Wellness Hub",
      "nav.gallery": "Gallery",
      "nav.media": "Media Center",
      "nav.faq": "FAQ",
      "nav.contact": "Contact",
      "nav.join": "Become a Distributor",
      "hero.slogan": "Transform Your Life With Songtai Life",
      "hero.sub": "Health. Opportunity. Prosperity. Premium natural products formulated with West African botanical heritage, unlocking sovereign economic independence for families across Cameroon.",
      "hero.cta.join": "Become a Distributor",
      "hero.cta.products": "Explore Products",
      "stats.countries": "Countries Reached",
      "stats.members": "Active Members",
      "stats.products": "Premium Products",
      "stats.years": "Years of Innovation",
      "stats.awards": "Pan-African Awards",
      "newsletter.title": "Subscribe to our Premium Wellness Newsletter",
      "newsletter.desc": "Get exclusive alerts on brand releases, leadership summits in Cameroon, and expert botanical advice direct to your inbox.",
      "newsletter.placeholder": "Enter your email address...",
      "newsletter.button": "Subscribe Now",
      "newsletter.success": "Successfully subscribed to our premium wellness newsletter!",
      "footer.rights": "All rights reserved. Designed for sovereign financial expansion.",
      "footer.offices": "Our physical regional offices in Yaoundé and Douala are open Monday through Saturday.",
      "about.title": "Authentic Botanical Science & Direct Leadership",
      "about.subtitle": "Sourcing organic assets to engineer West Africa's leading premium health and wellness brand."
    }
  },
  fr: {
    translation: {
      "nav.home": "Accueil",
      "nav.about": "Notre Histoire",
      "nav.products": "Produits",
      "nav.opportunity": "Opportunité",
      "nav.events": "Événements",
      "nav.blog": "Espace Bien-être",
      "nav.gallery": "Galerie",
      "nav.media": "Médiathèque",
      "nav.faq": "FAQ",
      "nav.contact": "Contact",
      "nav.join": "Devenir Distributeur",
      "hero.slogan": "Transformez Votre Vie Avec Songtai Life",
      "hero.sub": "Santé. Opportunité. Prospérité. Des produits naturels de qualité supérieure formulés avec le patrimoine botanique ouest-africain, ouvrant l'indépendance économique souveraine pour les familles au Cameroun.",
      "hero.cta.join": "Devenir Distributeur",
      "hero.cta.products": "Découvrir les Produits",
      "stats.countries": "Pays Atteints",
      "stats.members": "Membres Actifs",
      "stats.products": "Produits Premium",
      "stats.years": "Années d'Innovation",
      "stats.awards": "Prix Panafricains",
      "newsletter.title": "Abonnez-vous à Notre Newsletter Premium",
      "newsletter.desc": "Recevez des alertes exclusives sur les nouveautés, les sommets de leadership au Cameroun et des conseils botaniques d'experts.",
      "newsletter.placeholder": "Entrez votre adresse email...",
      "newsletter.button": "S'abonner Maintenant",
      "newsletter.success": "Inscription réussie à notre newsletter de bien-être premium !",
      "footer.rights": "Tous droits réservés. Conçu pour l'expansion financière souveraine.",
      "footer.offices": "Nos bureaux physiques régionaux à Yaoundé et Douala sont ouverts du lundi au samedi.",
      "about.title": "Science Botanique Authentique et Leadership Direct",
      "about.subtitle": "Sourcing d'actifs biologiques pour concevoir la première marque de santé et bien-être en Afrique de l'Ouest."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("songtai_lng") || "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
