import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PortalDashboard from "./pages/PortalDashboard";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import UserManagement from "./pages/UserManagement";
import DepartmentManagement from "./pages/DepartmentManagement";
import Projects from "./pages/Projects";
import ProjectsDashboard from "./pages/ProjectsDashboard";
import Announcements from "./pages/Announcements";
import PermissionGroupsManagement from "./pages/PermissionGroupsManagement";
import LoadingDemo from "./pages/LoadingDemo";
import LoadingSpinner from "./components/LoadingSpinner";
import { PageTransition } from "./components/PageTransition";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

// Protected Route Component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" text="Verificando autenticação..." />;
  }

  if (!isAuthenticated) {
    // Redirect to login page
    return <Redirect to="/login" />;
  }

  return (
    <PageTransition>
      <Component />
    </PageTransition>
  );
}

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen size="lg" text="Verificando autenticação..." />;
  }

  return (
    <Switch>
      {/* Root redirects to Portal if logged in, else show Login page */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      
      <Route path="/login" component={Login} />
      
      {/* Main Portal Hub */}
      <Route path="/dashboard">
        <ProtectedRoute component={PortalDashboard} />
      </Route>
      
      {/* Help Desk Module */}
      <Route path="/chamados">
        <ProtectedRoute component={Dashboard} />
      </Route>

      {/* User Management (Admin only) */}
      <Route path="/admin/usuarios">
        <ProtectedRoute component={UserManagement} />
      </Route>

      {/* Department Management (Admin only) */}
      <Route path="/admin/setores">
        <ProtectedRoute component={DepartmentManagement} />
      </Route>

      {/* Projects Management */}
      <Route path="/projetos">
        <ProtectedRoute component={Projects} />
      </Route>

      {/* Projects Dashboard */}
      <Route path="/projetos/dashboard">
        <ProtectedRoute component={ProjectsDashboard} />
      </Route>

         {/* Admin - Announcements Management */}
      <Route path="/admin/noticias">
        <ProtectedRoute component={Announcements} />
      </Route>
      
      {/* Admin - Permission Groups Management */}
      <Route path="/grupos-permissoes">
        <ProtectedRoute component={PermissionGroupsManagement} />
      </Route>

      {/* Loading Demo (for development) */}
      <Route path="/loading-demo" component={LoadingDemo} />

      {/* Other Modules Placeholders */}
      <Route path="/modulo/rh">
        <ProtectedRoute component={() => <ModulePlaceholder title="RH" />} />
      </Route>
      <Route path="/modulo/ecommerce">
        <ProtectedRoute component={() => <ModulePlaceholder title="E-commerce" />} />
      </Route>
      <Route path="/modulo/marketing">
        <ProtectedRoute component={() => <ModulePlaceholder title="Marketing" />} />
      </Route>
      <Route path="/modulo/tecnologia">
        <ProtectedRoute component={() => <ModulePlaceholder title="Tecnologia" />} />
      </Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AnimatePresence mode="wait" initial={false}>
            <Router key={location} />
          </AnimatePresence>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
