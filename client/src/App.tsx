import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider, useApp } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import AdminDashboard from "@/pages/admin-dashboard";
import UserDashboard from "@/pages/user-dashboard";

function PrivateRoute({ component: Component, role }: { component: React.ComponentType, role?: "admin" | "user" }) {
  const { user } = useApp();
  
  if (!user) return <Redirect to="/auth" />;
  if (role && user.role !== role) return <Redirect to="/" />;
  
  return <Component />;
}

function Router() {
  const { user } = useApp();

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/auth" component={AuthPage} />
          
          <Route path="/admin">
            <PrivateRoute component={AdminDashboard} role="admin" />
          </Route>
          
          <Route path="/dashboard">
            <PrivateRoute component={UserDashboard} role="user" />
          </Route>

          <Route path="/">
             {user ? (
               <Redirect to={user.role === "admin" ? "/admin" : "/dashboard"} />
             ) : (
               <Redirect to="/auth" />
             )}
          </Route>

          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Router />
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
//here is the complete code