import { Link } from "wouter";
import { ServerCrash } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center bg-card p-8 rounded border shadow-lg max-w-md w-full">
        <ServerCrash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-card-foreground mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          The requested system interface does not exist.
        </p>
        <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          Return to Portal
        </Link>
      </div>
    </div>
  );
}
