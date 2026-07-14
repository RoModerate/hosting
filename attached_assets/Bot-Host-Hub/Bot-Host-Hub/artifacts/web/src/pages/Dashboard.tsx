import { useGetSession, useUploadBot, useRestartBot, getGetSessionQueryKey, HostedBotSummaryStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { 
  Server, Terminal, 
  RotateCw, Clock, Activity, HardDrive,
  UploadCloud, FileArchive, Info, BrainCircuit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status?: HostedBotSummaryStatus }) {
  if (!status) return <Badge variant="outline">No Bot</Badge>;
  
  switch (status) {
    case "running":
      return <Badge variant="success" className="animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.4)]">Running</Badge>;
    case "starting":
    case "installing":
    case "pending":
      return <Badge variant="warning" className="animate-pulse capitalize">{status}</Badge>;
    case "crashed":
    case "error":
      return <Badge variant="destructive" className="capitalize">{status}</Badge>;
    case "stopped":
      return <Badge variant="secondary">Stopped</Badge>;
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const { data: session, isLoading, error } = useGetSession({
    query: {
      retry: false,
      queryKey: getGetSessionQueryKey(),
      refetchInterval: (query) => {
        // Poll faster if we are in a transitional state
        const status = query.state.data?.hostedBot?.status;
        if (status === "starting" || status === "installing" || status === "pending") {
          return 2000;
        }
        return 10000; // Normal polling
      }
    }
  });

  const uploadBot = useUploadBot();
  const restartBot = useRestartBot();

  // Redirect to redeem if no session
  useEffect(() => {
    if (error && (error as any).status === 401) {
      setLocation("/");
    }
  }, [error, setLocation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast.error("Invalid file type. Please upload a .zip file.");
        return;
      }
      handleUpload(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpload = (file: File) => {
    const toastId = toast.loading("Uploading and extracting bot...");
    uploadBot.mutate(
      { data: { file } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
          if (result.status === "error" || result.status === "crashed") {
            toast.error(result.message, { id: toastId });
          } else {
            toast.success("Bot uploaded successfully. Starting...", { id: toastId });
          }
        },
        onError: (err: any) => {
          toast.error(err?.error || "Failed to upload bot", { id: toastId });
        }
      }
    );
  };

  const handleRestart = () => {
    const toastId = toast.loading("Restarting bot...");
    restartBot.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
        if (result.status === "error" || result.status === "crashed") {
          toast.error(result.message, { id: toastId });
        } else {
          toast.success("Bot restart initiated", { id: toastId });
        }
      },
      onError: (err: any) => {
        toast.error(err?.error || "Failed to restart bot", { id: toastId });
      }
    });
  };

  const handleLogout = () => {
    // In a real app we'd have a logout endpoint to clear the cookie
    // For this prototype, we'll just redirect and let the next API call fail or succeed.
    // Given the prompt, there's no explicit logout, but users will want to leave.
    // Wait, the prompt says "No other marketing content... No adding new pages or flows".
    // I will just remove the logout button and keep it simple.
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background technical-grid">
        <Activity className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  const { ticketId, ownerUsername, expiresAt, hostingDurationDays, hostedBot } = session;
  const isFailed = hostedBot?.status === "crashed" || hostedBot?.status === "error";

  return (
    <div className="min-h-screen bg-background technical-grid font-sans">
      <header className="sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-card-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg tracking-tight font-mono">LUMORA<span className="text-muted-foreground font-normal">/ops</span></span>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
            <span className="hidden sm:inline-block border border-border bg-background px-2 py-1 rounded">Ticket #{ticketId}</span>
            <span className="text-foreground">@{ownerUsername}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        
        {/* Session Info & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-card-border shadow-sm">
            <CardHeader className="pb-3 border-b border-card-border bg-card/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-muted-foreground" />
                  Bot Instance
                </CardTitle>
                <StatusBadge status={hostedBot?.status} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {hostedBot ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Archive</div>
                      <div className="font-medium flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-primary" />
                        {hostedBot.fileName}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Start Command</div>
                      <div className="font-mono text-sm bg-background border border-border px-2 py-1 rounded inline-block text-muted-foreground">
                        {hostedBot.startCommand || "Auto-detected"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Restarts</div>
                      <div className="font-mono">{hostedBot.restartCount}</div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Last Started</div>
                      <div className="text-sm">
                        {hostedBot.lastStartedAt ? formatDistanceToNow(new Date(hostedBot.lastStartedAt), { addSuffix: true }) : 'Never'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button 
                      onClick={handleRestart} 
                      disabled={restartBot.isPending || hostedBot.status === "installing" || hostedBot.status === "starting"}
                      className="gap-2"
                      data-testid="button-restart-bot"
                    >
                      <RotateCw className={cn("w-4 h-4", restartBot.isPending && "animate-spin")} />
                      Restart Process
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} data-testid="button-update-code">
                      <UploadCloud className="w-4 h-4" />
                      Update Code
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-10 text-center transition-colors",
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-background"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <HardDrive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-1">Deploy Bot Instance</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                    Upload your bot's .zip archive. We'll automatically extract it, install dependencies, and start the process.
                  </p>
                  <Button variant="secondary" className="pointer-events-none">
                    Select .zip Archive
                  </Button>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
                accept=".zip"
                className="hidden" 
              />
            </CardContent>
          </Card>

          <Card className="border-card-border shadow-sm">
            <CardHeader className="pb-3 border-b border-card-border bg-card/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Session Lease
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Duration Granted</div>
                <div className="font-medium">{hostingDurationDays} Days</div>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Expires</div>
                <div className="font-medium text-destructive">
                  {format(new Date(expiresAt), "MMM d, yyyy HH:mm")}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  ({formatDistanceToNow(new Date(expiresAt), { addSuffix: true })})
                </div>
              </div>
              
              <div className="bg-secondary/50 rounded p-4 border border-secondary text-sm text-secondary-foreground">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>Your access key and session are valid until the lease expires. Keep your code running.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Failure Explanation - High Visual Weight */}
        {isFailed && hostedBot.aiExplanation && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-destructive/30 shadow-lg shadow-destructive/10 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-destructive" />
              <CardHeader className="bg-destructive/5 pb-4 border-b border-destructive/10">
                <CardTitle className="text-destructive flex items-center gap-2 text-xl">
                  <BrainCircuit className="w-6 h-6" />
                  Diagnostics Report
                </CardTitle>
                <CardDescription className="text-foreground/80">
                  Lumora AI has analyzed the crash telemetry.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-2">Analysis</h4>
                    <p className="text-lg leading-relaxed font-medium">
                      {hostedBot.aiExplanation}
                    </p>
                  </div>
                  
                  {hostedBot.errorMessage && (
                    <div>
                      <h4 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-2">Raw Output</h4>
                      <pre className="bg-background border border-border p-4 rounded-md text-sm font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                        {hostedBot.errorMessage}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
