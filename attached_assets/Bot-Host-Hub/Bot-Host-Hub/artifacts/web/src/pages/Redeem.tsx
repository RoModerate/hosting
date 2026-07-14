import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { useRedeemAccessKey, useGetSession, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Loader2, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const formSchema = z.object({
  key: z.string().min(1, "Access key is required"),
});

export default function Redeem() {
  const [, setLocation] = useLocation();
  const { data: session, isLoading: isLoadingSession } = useGetSession({
    query: {
      retry: false, // Don't retry on 401
      queryKey: getGetSessionQueryKey(),
    }
  });

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (session && session.ticketId) {
      setLocation("/dashboard");
    }
  }, [session, setLocation]);

  const redeem = useRedeemAccessKey();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      key: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    redeem.mutate(
      { data: { key: values.key } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey() });
          toast.success("Access key accepted");
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast.error(error?.error || "Invalid access key");
          form.setError("key", { message: "Access key could not be verified" });
        },
      }
    );
  }

  if (isLoadingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background technical-grid">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background technical-grid p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-card border border-card-border rounded-lg shadow-sm mb-4">
            <img src={logo} alt="Lumora" className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">LUMORA</h1>
          <p className="text-muted-foreground mt-2 font-mono text-sm tracking-wide">SECURE BOT OPERATIONS</p>
        </div>

        <Card className="border-card-border shadow-xl">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-muted-foreground" />
              Redeem Access
            </CardTitle>
            <CardDescription className="text-base">
              Enter the one-time access key provided by your support operative to provision your hosting environment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Access Key</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="LUM-XXXX-XXXX" 
                          {...field} 
                          className="font-mono text-lg h-12 bg-background"
                          autoComplete="off"
                          autoFocus
                          data-testid="input-access-key"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium group"
                  disabled={redeem.isPending}
                  data-testid="button-redeem"
                >
                  {redeem.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <>
                      Initialize Session
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
