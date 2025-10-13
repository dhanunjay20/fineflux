import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Inventory from "./pages/Inventory";
import InventoryHistory from "./pages/InventoryHistory";
import Sales from "./pages/Sales";
import Borrowers from "./pages/Borrowers";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Attendance from "./pages/Attendance";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import OnboardOrganization from "./pages/OnboardOrganization";
import EmployeeSetDuty from "./pages/EmployeeSetDuty";
import Products from "./pages/Products";
import GunInfo from "./pages/GunInfo";
import SalesHistory from "./pages/SalesHistory";
import Documents from "./pages/Documents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboard-organization" element={<OnboardOrganization />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guninfo"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <GunInfo />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Employees />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
             <Route
              path="/documents"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Documents />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
             <Route
              path="/employee-set-duty"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <EmployeeSetDuty />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Inventory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/history"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <InventoryHistory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Sales />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Products />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/borrowers"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Borrowers />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Expenses />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
           
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Attendance />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Profile />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Analytics />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales-history"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <SalesHistory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
