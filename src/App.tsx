import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AdminProvider } from "@/contexts/AdminContext";

// Splash is eagerly loaded (landing page)
import Splash from "./pages/Splash";

// Lazy-load all other routes
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const PostItem = lazy(() => import("./pages/farmer/PostItem"));
const Instafarm = lazy(() => import("./pages/farmer/Instafarm"));
const MyStore = lazy(() => import("./pages/farmer/MyStore"));
const Analytics = lazy(() => import("./pages/farmer/Analytics"));
const Explore = lazy(() => import("./pages/Explore"));
const AllNewProducts = lazy(() => import("./pages/AllNewProducts"));
const AllRecommended = lazy(() => import("./pages/AllRecommended"));
const FindFarmer = lazy(() => import("./pages/FindFarmer"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const FarmerDetail = lazy(() => import("./pages/FarmerDetail"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatConversation = lazy(() => import("./pages/ChatConversation"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Radar = lazy(() => import("./pages/Radar"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Plans = lazy(() => import("./pages/Plans"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminFarmers = lazy(() => import("./pages/admin/AdminFarmers"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <AdminProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/" element={<Splash />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/post-item" element={<PostItem />} />
                  <Route path="/instafarm" element={<Instafarm />} />
                  <Route path="/my-store" element={<MyStore />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/explore/new" element={<AllNewProducts />} />
                  <Route path="/explore/recommended" element={<AllRecommended />} />
                  <Route path="/find-farmer" element={<FindFarmer />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/farmer/:id" element={<FarmerDetail />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/chat/:id" element={<ChatConversation />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/radar" element={<Radar />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="/admin/farmers" element={<AdminFarmers />} />
                  <Route path="/admin/products" element={<AdminProducts />} />
                  <Route path="/admin/content" element={<AdminContent />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AdminProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
