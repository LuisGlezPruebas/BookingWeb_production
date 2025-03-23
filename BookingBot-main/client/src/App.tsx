import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import { NotificationProvider } from "@/contexts/notification-context";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AdminLogin from "@/components/admin-login";
import AdminPage from "@/pages/admin";
import UserPage from "@/pages/user";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/user" component={UserPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router />
          <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
