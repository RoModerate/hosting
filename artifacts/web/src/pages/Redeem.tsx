import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRedeemAccessKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { KeyRound, Zap } from 'lucide-react';

const redeemSchema = z.object({
  key: z.string().min(1, 'Access key is required'),
});

type RedeemFormValues = z.infer<typeof redeemSchema>;

export default function Redeem() {
  const [, setLocation] = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<RedeemFormValues>({
    resolver: zodResolver(redeemSchema),
    defaultValues: { key: '' },
  });

  const redeemMutation = useRedeemAccessKey();

  const onSubmit = async (data: RedeemFormValues) => {
    setErrorMsg(null);
    redeemMutation.mutate(
      { data: { key: data.key } },
      {
        onSuccess: () => setLocation('/dashboard'),
        onError: (err: any) => {
          setErrorMsg(err?.data?.error || err?.error || 'Invalid or expired access key.');
        },
      }
    );
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-6">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center border border-primary/30"
              style={{ boxShadow: '0 0 30px hsl(var(--primary)/0.25), inset 0 0 20px hsl(var(--primary)/0.05)' }}
            >
              <Zap className="h-9 w-9 text-primary" />
            </div>
          </div>
          <h1
            className="text-4xl font-mono font-bold tracking-[0.2em] text-foreground"
            style={{ textShadow: '0 0 20px hsl(var(--primary)/0.4)' }}
          >
            LUMORA
          </h1>
          <p className="text-xs font-mono tracking-[0.3em] text-muted-foreground">
            SECURE HOSTING PORTAL
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-6 border border-border/60 bg-card/50 backdrop-blur-sm space-y-5"
          style={{ boxShadow: '0 0 40px hsl(var(--primary)/0.05), 0 4px 24px rgba(0,0,0,0.4)' }}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="XXXX-XXXX-XXXX-XXXX"
                          className="pl-10 h-12 font-mono tracking-widest text-center uppercase bg-background/60 border-border/60 focus:border-primary/60 focus:ring-primary/20 transition-all"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck="false"
                          data-testid="input-access-key"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {errorMsg && (
                <div
                  className="text-xs font-mono text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-center"
                  data-testid="error-message"
                >
                  ⚠ {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 font-mono font-bold tracking-[0.2em] text-sm transition-all"
                disabled={redeemMutation.isPending}
                style={!redeemMutation.isPending ? { boxShadow: '0 0 20px hsl(var(--primary)/0.3)' } : {}}
                data-testid="button-activate-key"
              >
                {redeemMutation.isPending ? (
                  <span className="animate-pulse">VERIFYING...</span>
                ) : (
                  'ACTIVATE'
                )}
              </Button>
            </form>
          </Form>
        </div>

        <p className="text-center text-xs font-mono tracking-widest text-muted-foreground/40">
          STAFF ISSUED KEYS ONLY
        </p>
      </div>
    </div>
  );
}
