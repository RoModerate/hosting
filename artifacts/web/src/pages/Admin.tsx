import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetAdminStatus,
  getGetAdminStatusQueryKey,
  useUpdateAdminConfig,
} from '@workspace/api-client-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, ShieldAlert, Bot, Settings2, CheckCircle2, XCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

const configSchema = z.object({
  adminPassword: z.string().min(1, 'Admin password is required'),
  discordBotToken: z.string().optional(),
  discordGuildId: z.string().optional(),
  discordStaffRoleId: z.string().optional(),
  discordTicketCategoryName: z.string().optional(),
  openrouterApiKey: z.string().optional(),
  openrouterModel: z.string().optional(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function Admin() {
  const queryClient = useQueryClient();
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const { data: statusData, isError, error, refetch, isFetching } = useGetAdminStatus({
    query: {
      enabled: !!adminPassword,
      queryKey: getGetAdminStatusQueryKey(),
      retry: false,
    },
    request: {
      headers: { 'x-admin-password': adminPassword },
    }
  });

  const updateConfig = useUpdateAdminConfig({
    request: {
      headers: { 'x-admin-password': adminPassword },
    }
  });

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      adminPassword: '',
      discordBotToken: '',
      discordGuildId: '',
      discordStaffRoleId: '',
      discordTicketCategoryName: 'Tickets',
      openrouterApiKey: '',
      openrouterModel: '',
    },
  });

  // Keep form's password synced with the state we use for the query header
  useEffect(() => {
    form.setValue('adminPassword', adminPassword);
  }, [adminPassword, form]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setAdminPassword(passwordInput);
    // The query will automatically run since adminPassword is now set
  };

  const onSubmit = (data: ConfigFormValues) => {
    // Only send fields that are actually provided to avoid overwriting with empty
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    ) as ConfigFormValues;

    // Ensure we always send the password
    payload.adminPassword = adminPassword;

    const loadingToast = toast.loading('Saving configuration & reconnecting bot...');

    updateConfig.mutate(
      { data: payload },
      {
        onSuccess: (newStatus) => {
          toast.success('Configuration saved successfully', { id: loadingToast });
          queryClient.setQueryData(getGetAdminStatusQueryKey(), newStatus);
          form.reset({
            ...form.getValues(),
            discordBotToken: '',
            openrouterApiKey: '',
          }); // Clear secrets
        },
        onError: (err: any) => {
          toast.error(`Save failed: ${err?.error || 'Unknown error'}`, { id: loadingToast });
        },
      }
    );
  };

  // Login view
  if (!adminPassword || (isError && (error as any)?.status === 401)) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-sm border-primary/20 shadow-2xl shadow-primary/5">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="font-mono text-2xl">RESTRICTED ACCESS</CardTitle>
            <CardDescription className="font-mono text-xs mt-2">
              LUMORA CORE CONFIGURATION
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="ADMIN PASSWORD"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="pl-10 font-mono tracking-widest h-12 bg-background"
                  data-testid="input-admin-password"
                />
              </div>
              {isError && (error as any)?.status === 401 && adminPassword && (
                <p className="text-xs text-destructive font-mono text-center">ACCESS DENIED</p>
              )}
              <Button type="submit" className="w-full h-12 font-mono font-bold tracking-wider" disabled={isFetching} data-testid="button-admin-login">
                {isFetching ? 'VERIFYING...' : 'AUTHORIZE'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard view
  if (!statusData) return null;

  return (
    <div className="min-h-[100dvh] w-full p-4 md:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-destructive/10 rounded-xl border border-destructive/20 flex items-center justify-center">
              <Settings2 className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-mono font-bold tracking-tight text-destructive">OPS CONSOLE</h1>
              <p className="text-sm font-mono text-muted-foreground">
                SYSTEM CONFIGURATION & DIAGNOSTICS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`font-mono px-3 py-1 ${statusData.botConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
              <Bot className="w-4 h-4 mr-2" />
              {statusData.botConnected ? (statusData.botTag || 'CONNECTED') : 'DISCONNECTED'}
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="font-mono text-lg text-primary">CORE VARIABLES</CardTitle>
                <CardDescription className="font-mono text-xs">Only populate fields you wish to update.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="discordBotToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-xs text-muted-foreground">DISCORD_BOT_TOKEN</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••••••••••••••••••••••••••" {...field} className="font-mono bg-background" data-testid="input-discord-token" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="discordGuildId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-xs text-muted-foreground">GUILD_ID</FormLabel>
                              <FormControl>
                                <Input placeholder="123456789012345678" {...field} className="font-mono bg-background" data-testid="input-guild-id" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="discordStaffRoleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-xs text-muted-foreground">STAFF_ROLE_ID</FormLabel>
                              <FormControl>
                                <Input placeholder="123456789012345678" {...field} className="font-mono bg-background" data-testid="input-staff-role-id" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="discordTicketCategoryName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-xs text-muted-foreground">TICKET_CATEGORY_NAME</FormLabel>
                            <FormControl>
                              <Input placeholder="Tickets" {...field} className="font-mono bg-background" />
                            </FormControl>
                            <FormDescription className="text-xs">Category where bot will listen for keys</FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <div className="border-t border-border/50 pt-4 mt-4">
                        <h4 className="font-mono text-xs text-muted-foreground mb-4">AI DIAGNOSTICS (OPTIONAL)</h4>
                        <FormField
                          control={form.control}
                          name="openrouterApiKey"
                          render={({ field }) => (
                            <FormItem className="mb-4">
                              <FormLabel className="font-mono text-xs text-muted-foreground">OPENROUTER_API_KEY</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="sk-or-v1-..." {...field} className="font-mono bg-background" data-testid="input-openrouter-key" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="openrouterModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-xs text-muted-foreground">OPENROUTER_MODEL</FormLabel>
                              <FormControl>
                                <Input placeholder="anthropic/claude-3.5-sonnet" {...field} className="font-mono bg-background" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full font-mono mt-8" 
                      disabled={updateConfig.isPending}
                      data-testid="button-save-config"
                    >
                      {updateConfig.isPending ? (
                        <>APPLYING CHANGES...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> DEPLOY CONFIGURATION</>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card className="bg-muted/20 border-border/50">
              <CardHeader>
                <CardTitle className="font-mono text-sm">ENVIRONMENT STATUS</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 font-mono text-xs">
                  {statusData.configKeys.map((item) => (
                    <li key={item.key} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{item.key}</span>
                      {item.isSet ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive opacity-50" />
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
