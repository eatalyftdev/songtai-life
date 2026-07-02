import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Navigation
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
      "nav.distributor": "Distributor Portal",
      "nav.admin": "Admin",
      "nav.logout": "Sign Out",
      // Hero
      "hero.slogan": "Transform Your Life With Songtai Life",
      "hero.sub": "Health. Opportunity. Prosperity. Premium natural products formulated with West African botanical heritage, unlocking sovereign economic independence for families across Cameroon.",
      "hero.cta.join": "Become a Distributor",
      "hero.cta.products": "Explore Products",
      // Stats
      "stats.countries": "Countries Reached",
      "stats.members": "Active Members",
      "stats.products": "Premium Products",
      "stats.years": "Years of Innovation",
      "stats.awards": "Pan-African Awards",
      // Newsletter
      "newsletter.title": "Subscribe to our Premium Wellness Newsletter",
      "newsletter.desc": "Get exclusive alerts on brand releases, leadership summits in Cameroon, and expert botanical advice direct to your inbox.",
      "newsletter.placeholder": "Enter your email address...",
      "newsletter.button": "Subscribe Now",
      "newsletter.success": "Successfully subscribed to our premium wellness newsletter!",
      // Footer
      "footer.rights": "All rights reserved. Designed for sovereign financial expansion.",
      "footer.offices": "Our physical regional offices in Yaoundé and Douala are open Monday through Saturday.",
      // About
      "about.title": "Authentic Botanical Science & Direct Leadership",
      "about.subtitle": "Sourcing organic assets to engineer West Africa's leading premium health and wellness brand.",
      // Products
      "products.title": "Our Premium Catalog",
      "products.subtitle": "Every product is precision-engineered with West African botanical extracts.",
      "products.addToCart": "Add to Cart",
      "products.outOfStock": "Out of Stock",
      "products.promo": "Promotion",
      "products.bestseller": "Bestseller",
      "products.viewAll": "View Full Catalog",
      // Contact
      "contact.title": "Get in Touch",
      "contact.subtitle": "Our team is available Monday through Saturday.",
      "contact.name": "Full Name",
      "contact.email": "Email Address",
      "contact.message": "Your Message",
      "contact.send": "Send Message",
      "contact.sending": "Sending...",
      "contact.success": "Message sent successfully!",
      // Auth
      "auth.email": "Email Address",
      "auth.password": "Password",
      "auth.login": "Sign In",
      "auth.logout": "Sign Out",
      "auth.register": "Create Account",
      "auth.forgotPassword": "Forgot password?",
      "auth.noAccount": "Don't have an account?",
      "auth.hasAccount": "Already have an account?",
      // Distributor
      "dist.dashboard": "Dashboard",
      "dist.wallet": "My Wallet",
      "dist.genealogy": "My Network",
      "dist.orders": "My Orders",
      "dist.kyc": "KYC Status",
      "dist.rank": "My Rank",
      // Admin
      "admin.title": "Admin Operations",
      "admin.overview": "Overview",
      "admin.distributors": "Distributors",
      "admin.products": "Products",
      "admin.orders": "Orders",
      "admin.marketing": "Marketing",
      "admin.communications": "Communications",
      "admin.logs": "System Logs",
      "admin.settings": "Settings",
      // General
      "general.loading": "Loading...",
      "general.save": "Save",
      "general.cancel": "Cancel",
      "general.delete": "Delete",
      "general.edit": "Edit",
      "general.add": "Add",
      "general.search": "Search",
      "general.yes": "Yes",
      "general.no": "No",
      "general.confirm": "Confirm",
      "general.back": "Back",
      "general.next": "Next",
      "general.close": "Close",
      "general.required": "Required",
      // FAQ
      "faq.title": "Frequently Asked Questions",
      "faq.subtitle": "Everything you need to know about Songtai Life.",
      // Blog
      "blog.title": "Wellness Hub",
      "blog.subtitle": "Science-backed wellness insights from West Africa.",
      "blog.readMore": "Read More",
      "blog.enOnly": "English only",
      // Events
      "events.title": "Upcoming Events",
      "events.subtitle": "Leadership summits and community gatherings.",
      "events.register": "Register Now",
      "events.live": "Live Now",
    }
  },
  fr: {
    translation: {
      // Navigation
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
      "nav.distributor": "Portail Distributeur",
      "nav.admin": "Admin",
      "nav.logout": "Déconnexion",
      // Hero
      "hero.slogan": "Transformez Votre Vie Avec Songtai Life",
      "hero.sub": "Santé. Opportunité. Prospérité. Des produits naturels de qualité supérieure formulés avec le patrimoine botanique ouest-africain, ouvrant l'indépendance économique souveraine pour les familles au Cameroun.",
      "hero.cta.join": "Devenir Distributeur",
      "hero.cta.products": "Découvrir les Produits",
      // Stats
      "stats.countries": "Pays Atteints",
      "stats.members": "Membres Actifs",
      "stats.products": "Produits Premium",
      "stats.years": "Années d'Innovation",
      "stats.awards": "Prix Panafricains",
      // Newsletter
      "newsletter.title": "Abonnez-vous à Notre Newsletter Premium",
      "newsletter.desc": "Recevez des alertes exclusives sur les nouveautés, les sommets de leadership au Cameroun et des conseils botaniques d'experts.",
      "newsletter.placeholder": "Entrez votre adresse email...",
      "newsletter.button": "S'abonner Maintenant",
      "newsletter.success": "Inscription réussie à notre newsletter de bien-être premium !",
      // Footer
      "footer.rights": "Tous droits réservés. Conçu pour l'expansion financière souveraine.",
      "footer.offices": "Nos bureaux physiques régionaux à Yaoundé et Douala sont ouverts du lundi au samedi.",
      // About
      "about.title": "Science Botanique Authentique et Leadership Direct",
      "about.subtitle": "Sourcing d'actifs biologiques pour concevoir la première marque de santé et bien-être en Afrique de l'Ouest.",
      // Products
      "products.title": "Notre Catalogue Premium",
      "products.subtitle": "Chaque produit est conçu avec des extraits botaniques ouest-africains.",
      "products.addToCart": "Ajouter au Panier",
      "products.outOfStock": "Rupture de Stock",
      "products.promo": "Promotion",
      "products.bestseller": "Meilleure Vente",
      "products.viewAll": "Voir le Catalogue Complet",
      // Contact
      "contact.title": "Contactez-Nous",
      "contact.subtitle": "Notre équipe est disponible du lundi au samedi.",
      "contact.name": "Nom Complet",
      "contact.email": "Adresse Email",
      "contact.message": "Votre Message",
      "contact.send": "Envoyer le Message",
      "contact.sending": "Envoi en cours...",
      "contact.success": "Message envoyé avec succès !",
      // Auth
      "auth.email": "Adresse Email",
      "auth.password": "Mot de Passe",
      "auth.login": "Se Connecter",
      "auth.logout": "Se Déconnecter",
      "auth.register": "Créer un Compte",
      "auth.forgotPassword": "Mot de passe oublié ?",
      "auth.noAccount": "Vous n'avez pas de compte ?",
      "auth.hasAccount": "Vous avez déjà un compte ?",
      // Distributor
      "dist.dashboard": "Tableau de Bord",
      "dist.wallet": "Mon Portefeuille",
      "dist.genealogy": "Mon Réseau",
      "dist.orders": "Mes Commandes",
      "dist.kyc": "Statut KYC",
      "dist.rank": "Mon Rang",
      // Admin
      "admin.title": "Opérations Admin",
      "admin.overview": "Vue d'ensemble",
      "admin.distributors": "Distributeurs",
      "admin.products": "Produits",
      "admin.orders": "Commandes",
      "admin.marketing": "Marketing",
      "admin.communications": "Communications",
      "admin.logs": "Journaux Système",
      "admin.settings": "Paramètres",
      // General
      "general.loading": "Chargement...",
      "general.save": "Enregistrer",
      "general.cancel": "Annuler",
      "general.delete": "Supprimer",
      "general.edit": "Modifier",
      "general.add": "Ajouter",
      "general.search": "Rechercher",
      "general.yes": "Oui",
      "general.no": "Non",
      "general.confirm": "Confirmer",
      "general.back": "Retour",
      "general.next": "Suivant",
      "general.close": "Fermer",
      "general.required": "Requis",
      // FAQ
      "faq.title": "Foire Aux Questions",
      "faq.subtitle": "Tout ce que vous devez savoir sur Songtai Life.",
      // Blog
      "blog.title": "Espace Bien-être",
      "blog.subtitle": "Conseils de bien-être scientifiquement validés d'Afrique de l'Ouest.",
      "blog.readMore": "Lire la Suite",
      "blog.enOnly": "Anglais seulement",
      // Events
      "events.title": "Événements à Venir",
      "events.subtitle": "Sommets de leadership et rassemblements communautaires.",
      "events.register": "S'inscrire Maintenant",
      "events.live": "En Direct",
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
