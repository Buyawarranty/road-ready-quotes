import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { CartProvider } from "@/contexts/CartContext";
import { redirectWwwToNonWww } from "@/utils/wwwRedirect";
import { preloadCriticalRoutes } from "@/utils/preloadRoutes";

import ScrollToTop from "@/components/ScrollToTop";
import NotFound from "./pages/NotFound";
import { CookieBanner } from "@/components/CookieBanner";
import { PageViewTracker } from "@/components/PageViewTracker";
import { PageViewLogger } from "@/components/PageViewLogger";

// Lazy load remaining pages
const ThankYou = lazy(() => import("./pages/ThankYou"));
const PaymentReceived = lazy(() => import("./pages/PaymentReceived"));
const PaymentFallback = lazy(() => import("./pages/PaymentFallback"));
const StripePayment = lazy(() => import("./pages/StripePayment"));
const Cart = lazy(() => import("./pages/Cart"));
const Widget = lazy(() => import("./pages/Widget"));
const Terms = lazy(() => import("./pages/Terms"));
const Protected = lazy(() => import("./pages/Protected"));
const Claims = lazy(() => import("./pages/Claims"));
const CancelWarranty = lazy(() => import("./pages/CancelWarranty"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const Complaints = lazy(() => import("./pages/Complaints"));
const AdminConversionFire = lazy(() => import("./pages/AdminConversionFire"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const WarrantyPlan = lazy(() => import("./pages/WarrantyPlan"));
const ClaimUpdateForm = lazy(() => import("./pages/ClaimUpdateForm"));
const LiveQuotePage = lazy(() => import("./pages/LiveQuotePage"));
const WarrantyTransfer = lazy(() => import("./pages/WarrantyTransfer"));

// Admin and auth pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const PasswordReset = lazy(() => import("./components/PasswordReset"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const QuickResetTest = lazy(() => import("./pages/QuickResetTest"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const StepTest = lazy(() => import("./pages/StepTest"));
const SetupAdmin = lazy(() => import("./pages/SetupAdmin"));
const UpdateAdminCredentials = lazy(() => import("./pages/UpdateAdminCredentials"));
const RequestAccess = lazy(() => import("./pages/RequestAccess"));
const SalesLogin = lazy(() => import("./pages/SalesLogin"));

// Dealer Portal pages
const DealerHome = lazy(() => import("./pages/dealer-portal/DealerHome"));
const DealerSignup = lazy(() => import("./pages/dealer-portal/DealerSignup"));
const DealerLogin = lazy(() => import("./pages/dealer-portal/DealerLogin"));
const DealerDashboard = lazy(() => import("./pages/dealer-portal/DealerDashboard"));
const DealerCreateQuote = lazy(() => import("./pages/dealer-portal/DealerCreateQuote"));
const DealerQuotesList = lazy(() => import("./pages/dealer-portal/DealerQuotesList"));
const DealerWarrantiesList = lazy(() => import("./pages/dealer-portal/DealerWarrantiesList"));
const DealerJourneyStep1 = lazy(() => import("./pages/dealer-portal/journey/Step1Vehicle"));
const DealerJourneyStep2 = lazy(() => import("./pages/dealer-portal/journey/Step2Customer"));
const DealerJourneyStep3 = lazy(() => import("./pages/dealer-portal/journey/Step3Pricing"));
const DealerJourneyStep4 = lazy(() => import("./pages/dealer-portal/journey/Step4Checkout"));
const DealerJourneyStep5 = lazy(() => import("./pages/dealer-portal/journey/Step5Confirmation"));
import { DealerJourneyProvider } from "@/contexts/DealerJourneyContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    redirectWwwToNonWww();
    if (document.readyState === 'complete') {
      preloadCriticalRoutes();
    } else {
      window.addEventListener('load', preloadCriticalRoutes);
      return () => window.removeEventListener('load', preloadCriticalRoutes);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SubscriptionProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <PageViewTracker />
              <PageViewLogger />
              <CookieBanner />
              <div className="min-h-screen flex flex-col w-full">
                <main className="flex-1 w-full overflow-x-hidden">
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                    <Routes>
                      {/* Root → Dealer marketing homepage */}
                      <Route path="/" element={<DealerHome />} />
                      <Route path="/home" element={<DealerHome />} />
                      <Route path="/home/" element={<DealerHome />} />

                      {/* Warranty booking journey (kept) */}
                      <Route path="/warranty-plan/" element={<WarrantyPlan />} />
                      <Route path="/thank-you/" element={<ThankYou />} />
                      <Route path="/payment-received/" element={<PaymentReceived />} />
                      <Route path="/payment-fallback/" element={<PaymentFallback />} />
                      <Route path="/checkout/payment/" element={<StripePayment />} />
                      <Route path="/cart/" element={<Cart />} />
                      <Route path="/widget/" element={<Widget />} />
                      <Route path="/quote/:token" element={<LiveQuotePage />} />
                      <Route path="/quote/:token/success" element={<LiveQuotePage />} />

                      {/* Auth */}
                      <Route path="/auth/" element={<Auth />} />
                      <Route path="/sales-login/" element={<SalesLogin />} />
                      <Route path="/forgot-password/" element={<ForgotPassword />} />
                      <Route path="/reset-password/" element={<PasswordReset />} />
                      <Route path="/password-reset/" element={<ResetPassword />} />
                      <Route path="/quick-reset/" element={<QuickResetTest />} />
                      <Route path="/setup-admin/" element={<SetupAdmin />} />
                      <Route path="/update-admin/" element={<UpdateAdminCredentials />} />
                      <Route path="/request-access/" element={<RequestAccess />} />

                      {/* Admin & customer dashboards */}
                      <Route path="/admin/" element={<AdminDashboard />} />
                      <Route path="/admin-dashboard/" element={<AdminDashboard />} />
                      <Route path="/customer-dashboard/" element={<CustomerDashboard />} />
                      <Route path="/admin-conversion-fire/" element={<AdminConversionFire />} />

                      {/* Legal & utility */}
                      <Route path="/terms/" element={<Terms />} />
                      <Route path="/cookies/" element={<CookiePolicy />} />
                      <Route path="/privacy/" element={<PrivacyPolicy />} />
                      <Route path="/what-is-covered/" element={<Protected />} />
                      <Route path="/claims/" element={<Claims />} />
                      <Route path="/make-a-claim/" element={<Claims />} />
                      <Route path="/cancel-warranty" element={<CancelWarranty />} />
                      <Route path="/warranty-transfer/" element={<WarrantyTransfer />} />
                      <Route path="/contact-us/" element={<ContactUs />} />
                      <Route path="/complaints/" element={<Complaints />} />
                      <Route path="/claim-update/:token" element={<ClaimUpdateForm />} />
                      <Route path="/steptest" element={<StepTest />} />

                      {/* Dealer Portal */}
                      <Route path="/dealer-portal" element={<DealerHome />} />
                      <Route path="/dealer-portal/" element={<DealerHome />} />
                      <Route path="/dealer-portal/signup" element={<DealerSignup />} />
                      <Route path="/dealer-portal/login" element={<DealerLogin />} />
                      <Route path="/dealer-portal/dashboard" element={<DealerDashboard />} />
                      <Route path="/dealer-portal/quotes/create" element={<DealerCreateQuote />} />
                      <Route path="/dealer-portal/quotes" element={<DealerQuotesList />} />
                      <Route path="/dealer-portal/warranties" element={<DealerWarrantiesList />} />
                      <Route path="/dealer-portal/quote/vehicle" element={<DealerJourneyProvider><DealerJourneyStep1 /></DealerJourneyProvider>} />
                      <Route path="/dealer-portal/quote/customer" element={<DealerJourneyProvider><DealerJourneyStep2 /></DealerJourneyProvider>} />
                      <Route path="/dealer-portal/quote/pricing" element={<DealerJourneyProvider><DealerJourneyStep3 /></DealerJourneyProvider>} />
                      <Route path="/dealer-portal/quote/checkout" element={<DealerJourneyProvider><DealerJourneyStep4 /></DealerJourneyProvider>} />
                      <Route path="/dealer-portal/quote/confirmation" element={<DealerJourneyProvider><DealerJourneyStep5 /></DealerJourneyProvider>} />

                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </main>
              </div>
            </BrowserRouter>
          </CartProvider>
        </SubscriptionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
