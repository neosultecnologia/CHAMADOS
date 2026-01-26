import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { TicketsProvider } from "./contexts/TicketsContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard"; // This is the Help Desk module
import PortalDashboard from "./pages/PortalDashboard"; // This is the new Portal Hub
import ModulePlaceholder from "./pages/ModulePlaceholder";

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Root redirects to Portal if logged in, else Login */}
      <Route path="/" component={isAuthenticated ? PortalDashboard : Login} />
      
      <Route path="/login" component={Login} />
      
      {/* Main Portal Hub */}
      <Route path="/dashboard" component={PortalDashboard} />
      
      {/* Help Desk Module */}
      <Route path="/chamados" component={Dashboard} />

      {/* Other Modules Placeholders */}
      <Route path="/modulo/rh">
        {() => <ModulePlaceholder title="RH" />}
      </Route>
      <Route path="/modulo/ecommerce">
        {() => <ModulePlaceholder title="E-commerce" />}
      </Route>
      <Route path="/modulo/marketing">
        {() => <ModulePlaceholder title="Marketing" />}
      </Route>
      <Route path="/modulo/tecnologia">
        {() => <ModulePlaceholder title="Tecnologia" />}
      </Route>
      
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TicketsProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </TicketsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
