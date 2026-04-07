import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Loans from "./pages/Loans";
import Investments from "./pages/Investments";
import RiskAnalysis from "./pages/RiskAnalysis";
import Accounting from "./pages/Accounting";
import Reports from "./pages/Reports";
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
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/expenses" element={<Expenses />} />
            <Route path="/dashboard/income" element={<Expenses />} />
            <Route path="/dashboard/loans" element={<Loans />} />
            <Route path="/dashboard/investments" element={<Investments />} />
            <Route path="/dashboard/risk" element={<RiskAnalysis />} />
            <Route path="/dashboard/accounting" element={<Accounting />} />
            <Route path="/dashboard/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
