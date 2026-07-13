import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LocaleProvider } from "./hooks/useLocale";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Header from "./components/Header";
import FloatingWhatsAppButton from "./components/FloatingWhatsAppButton";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ScrollToTop from "./components/ScrollToTop";
import CookieConsent from "./components/CookieConsent";
import HomePage from "./pages/HomePage";
import FleetPage from "./pages/FleetPage";

// Lazy-loaded pages (admin + low-traffic)
const CarDetailPage = React.lazy(() => import("./pages/CarDetailPage"));
const BookingPage = React.lazy(() => import("./pages/BookingPage"));
const MyAccountPage = React.lazy(() => import("./pages/MyAccountPage"));
const AdminLayout = React.lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = React.lazy(() => import("./admin/pages/AdminDashboard"));
const AdminCars = React.lazy(() => import("./admin/pages/AdminCars"));
const AdminCustomers = React.lazy(() => import("./admin/pages/AdminCustomers"));
const AdminReservations = React.lazy(() => import("./admin/pages/AdminReservations"));
const AdminCalendar = React.lazy(() => import("./admin/pages/AdminCalendar"));
const AdminReports = React.lazy(() => import("./admin/pages/AdminReports"));
const AdminFinance = React.lazy(() => import("./admin/pages/AdminFinance"));
const AdminUsers = React.lazy(() => import("./admin/pages/AdminUsers"));
const AdminFleetManagement = React.lazy(() => import("./admin/pages/AdminFleetManagement"));
const AdminReviews = React.lazy(() => import("./admin/pages/AdminReviews"));
const AdminPricingRules = React.lazy(() => import("./admin/pages/AdminPricingRules"));
const AdminExtras = React.lazy(() => import("./admin/pages/AdminExtras"));
const AdminMonthlyRates = React.lazy(() => import("./admin/pages/AdminMonthlyRates"));
const AdminCarEdit = React.lazy(() => import("./admin/pages/AdminCarEdit"));
const AdminMedia = React.lazy(() => import("./admin/pages/AdminMedia"));
const AdminSettings = React.lazy(() => import("./admin/pages/AdminSettings"));
const AdminBlog = React.lazy(() => import("./admin/pages/AdminBlog"));
const AdminImport = React.lazy(() => import("./admin/pages/AdminImport"));
const ReviewsPage = React.lazy(() => import("./pages/ReviewsPage"));
const MakinaQeraTirana = React.lazy(() => import("./pages/seo/MakinaQeraTirana"));
const MakineAeroport = React.lazy(() => import("./pages/seo/MakineAeroport"));
const MakinaSUV = React.lazy(() => import("./pages/seo/MakinaSUV"));
const MakinaAutomatike = React.lazy(() => import("./pages/seo/MakinaAutomatike"));
const MakinaLuksoze = React.lazy(() => import("./pages/seo/MakinaLuksoze"));
const SitemapPage = React.lazy(() => import("./pages/SitemapPage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));
const OfficesPage = React.lazy(() => import("./pages/OfficesPage"));
const TermsPage = React.lazy(() => import("./pages/TermsPage"));
const PrivacyPage = React.lazy(() => import("./pages/PrivacyPage"));
const NotFoundPage = React.lazy(() => import("./pages/NotFoundPage"));
const ThankYouPage = React.lazy(() => import("./pages/ThankYouPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const BlogPage = React.lazy(() => import("./pages/BlogPage"));
const BlogPostPage = React.lazy(() => import("./pages/BlogPostPage"));

/* Route definition: [SQ, EN, FR, ES, IT, Component]. SQ is the canonical default. */
const PUBLIC_ROUTES: [string, string, string, string, string, React.ComponentType][] = [
  ["/",                          "/en",                       "/fr",                            "/es",                            "/it",                            HomePage],
  ["/flota",                     "/en/fleet",                 "/fr/flotte",                     "/es/flota",                      "/it/flotta",                     FleetPage],
  ["/makina/:slug",              "/en/car/:slug",             "/fr/voiture/:slug",              "/es/coche/:slug",                "/it/auto/:slug",                 CarDetailPage],
  ["/rezervo",                   "/en/book",                  "/fr/reserver",                   "/es/reservar",                   "/it/prenota",                    BookingPage],
  ["/faleminderit",              "/en/thank-you",             "/fr/merci",                      "/es/gracias",                    "/it/grazie",                     ThankYouPage],
  ["/llogaria",                  "/en/my-account",            "/fr/mon-compte",                 "/es/mi-cuenta",                  "/it/account",                    MyAccountPage],
  ["/vleresime",                 "/en/reviews",               "/fr/avis",                       "/es/opiniones",                  "/it/recensioni",                 ReviewsPage],
  ["/makina-me-qira-tirane",     "/en/car-rental-tirana",     "/fr/location-voiture-tirana",    "/es/alquiler-coches-tirana",     "/it/noleggio-auto-tirana",       MakinaQeraTirana],
  ["/makine-me-qira-aeroport",   "/en/airport-car-rental",    "/fr/location-aeroport",          "/es/alquiler-aeropuerto",        "/it/noleggio-aeroporto",         MakineAeroport],
  ["/makina-suv-me-qira",        "/en/suv-car-rental",        "/fr/location-suv",               "/es/alquiler-suv",               "/it/noleggio-suv",               MakinaSUV],
  ["/makina-automatike-me-qira", "/en/automatic-car-rental",  "/fr/location-automatique",       "/es/alquiler-automatico",        "/it/noleggio-automatico",        MakinaAutomatike],
  ["/makina-luksoze-me-qira",    "/en/luxury-car-rental",     "/fr/location-luxe",              "/es/alquiler-lujo",              "/it/noleggio-lusso",             MakinaLuksoze],
  ["/sitemap",                   "/en/sitemap",               "/fr/sitemap",                    "/es/sitemap",                    "/it/sitemap",                    SitemapPage],
  ["/kontakt",                   "/en/contact",               "/fr/contact",                    "/es/contacto",                   "/it/contatti",                   ContactPage],
  ["/zyrat",                     "/en/offices",               "/fr/bureaux",                    "/es/oficinas",                   "/it/uffici",                     OfficesPage],
  ["/termat-e-sherbimit",        "/en/terms",                 "/fr/conditions",                 "/es/terminos",                   "/it/termini",                    TermsPage],
  ["/privatesie",                "/en/privacy",               "/fr/confidentialite",            "/es/privacidad",                 "/it/privacy",                    PrivacyPage],
  ["/blog",                      "/en/blog",                  "/fr/blog",                       "/es/blog",                       "/it/blog",                       BlogPage],
  ["/blog/:slug",                "/en/blog/:slug",            "/fr/blog/:slug",                 "/es/blog/:slug",                 "/it/blog/:slug",                 BlogPostPage],
  ["/reset-password",            "/en/reset-password",        "/fr/reset-password",             "/es/reset-password",             "/it/reset-password",             ResetPasswordPage],
];

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md text-sm font-medium"
      >
        {t("skipToContent")}
      </a>
      <Header />
      <main id="main-content"><ErrorBoundary><Suspense fallback={<LazyFallback />}>{children}</Suspense></ErrorBoundary></main>
      <FloatingWhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <ScrollToTop />
        <AnalyticsTracker />
        <Routes>
          {/* Public Routes — Albanian (default) + EN + FR + ES + IT */}
          {PUBLIC_ROUTES.map(([sq, en, fr, es, it, Component]) => (
            <React.Fragment key={sq}>
              <Route path={sq} element={<PublicLayout><Component /></PublicLayout>} />
              <Route path={en} element={<PublicLayout><Component /></PublicLayout>} />
              <Route path={fr} element={<PublicLayout><Component /></PublicLayout>} />
              <Route path={es} element={<PublicLayout><Component /></PublicLayout>} />
              <Route path={it} element={<PublicLayout><Component /></PublicLayout>} />
            </React.Fragment>
          ))}

          {/* Admin Routes (no language prefix) */}
          <Route path="/admin" element={<Suspense fallback={<LazyFallback />}><AdminLayout /></Suspense>}>
            <Route index element={<AdminDashboard />} />
            <Route path="flota" element={<AdminCars />} />
            <Route path="klientet" element={<AdminCustomers />} />
            <Route path="rezervime" element={<AdminReservations />} />
            <Route path="kalendar" element={<AdminCalendar />} />
            <Route path="financa" element={<AdminFinance />} />
            <Route path="raporte" element={<AdminReports />} />
            <Route path="perdoruesit" element={<AdminUsers />} />
            <Route path="fleet" element={<AdminFleetManagement />} />
            <Route path="vleresimet" element={<AdminReviews />} />
            <Route path="ofertat" element={<AdminPricingRules />} />
            <Route path="extras" element={<AdminExtras />} />
            <Route path="cmime-mujore" element={<AdminMonthlyRates />} />
            <Route path="flota/:id" element={<AdminCarEdit />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="cilesimet" element={<AdminSettings />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="importo" element={<AdminImport />} />
          </Route>

          {/* Fallback — Custom 404 */}
          <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
        </Routes>
        <CookieConsent />
      </LocaleProvider>
    </BrowserRouter>
  );
}
