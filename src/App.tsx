import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Directions from "./pages/Directions";
import GlobalIndex from "./pages/GlobalIndex";
import Drops from "./pages/Drops";
import MyHeardrop from "./pages/MyHeardrop";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/directions" element={<Directions />} />
        <Route path="/global-index" element={<GlobalIndex />} />
        <Route path="/drops" element={<Drops />} />
        <Route path="/my-heardrop" element={<MyHeardrop />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
