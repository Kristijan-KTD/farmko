import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import PostItem from "./pages/farmer/PostItem";
import Instafarm from "./pages/farmer/Instafarm";
import MyStore from "./pages/farmer/MyStore";
import Analytics from "./pages/farmer/Analytics";
import Explore from "./pages/Explore";
import FindFarmer from "./pages/FindFarmer";
import ProductDetail from "./pages/ProductDetail";
import FarmerDetail from "./pages/FarmerDetail";
import Chat from "./pages/Chat";
import ChatConversation from "./pages/ChatConversation";
import Notifications from "./pages/Notifications";
import Radar from "./pages/Radar";
import Plans from "./pages/Plans";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="/find-farmer" element={<FindFarmer />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/farmer/:id" element={<FarmerDetail />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:id" element={<ChatConversation />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/radar" element={<Radar />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
