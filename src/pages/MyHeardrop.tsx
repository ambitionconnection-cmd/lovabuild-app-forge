import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MyHeardrop = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">MY HEARDROP</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Your Personalized Dashboard</h2>
          <p className="text-muted-foreground">Your favorites and notifications coming soon...</p>
        </div>
      </main>
    </div>
  );
};

export default MyHeardrop;
