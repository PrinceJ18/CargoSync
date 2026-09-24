import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { FleetPage } from "./pages/FleetPage";
import { NetworkPage } from "./pages/NetworkPage";
import { OptimizePage } from "./pages/OptimizePage";
import { RoutesPage } from "./pages/RoutesPage";
import { ImpactPage } from "./pages/ImpactPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OperatorsPage } from "./pages/OperatorsPage";
import { AdminOptimizationResultsPage } from "./pages/AdminOptimizationResultsPage";
import { AppShell } from "./layouts/AppShell";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";

export default function CargoSyncPrototype() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Application Experience (Requires Auth and AppShell) */}
          <Route path="/app" element={<ProtectedRoute />}>
            <Route element={
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
            }>
              {/* Default redirect to overview */}
              <Route index element={<Navigate to="/app/overview" replace />} />
              
              <Route path="overview" element={<DashboardPage />} />
              <Route path="operators" element={<OperatorsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="network" element={<NetworkPage />} />
              <Route path="optimize" element={<OptimizePage />} />
              <Route path="optimize-results" element={<AdminOptimizationResultsPage />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="impact" element={<ImpactPage />} />

              {/* Catch-all for unknown /app/* paths */}
              <Route path="*" element={<Navigate to="/app/overview" replace />} />
            </Route>
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
