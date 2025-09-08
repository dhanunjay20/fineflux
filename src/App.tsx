import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import NotFound from "./pages/NotFound";

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
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
              path="/inventory"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <Inventory />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Placeholder routes - to be implemented */}
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
              path="/borrowers"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold">Borrowers Management</h1>
                      <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold">Analytics & Reports</h1>
                      <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute requiredRoles={['employee']}>
                  <DashboardLayout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold">Attendance</h1>
                      <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requiredRoles={['employee']}>
                  <DashboardLayout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold">My Profile</h1>
                      <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold">Reports</h1>
                      <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredRoles={['owner', 'manager']}>
                  <DashboardLayout>
                    <div className="p-6">
                      <h1 className="text-3xl font-bold">Settings</h1>
                      <p className="text-muted-foreground">Coming soon...</p>
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
