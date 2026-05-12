import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import SensorDetail from "@/pages/sensor-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="border-b bg-card shadow-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto flex h-14 items-center px-4">
          <div className="flex items-center gap-2 font-bold text-primary text-lg tracking-tight select-none">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
            Monitor Pimientos
          </div>
        </div>
      </header>
      <main className="flex-1 container max-w-6xl mx-auto p-4 md:p-6">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/sensor/:id" component={SensorDetail} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
