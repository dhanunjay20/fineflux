import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://finflux-64307221061.asia-south1.run.app';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotOpen, setForgotOpen] = useState<"password" | "username" | null>(null);

  // Organizations for modals
  const [orgList, setOrgList] = useState<{ organizationId: string; organizationName: string }[]>([]);
  // Forgot Password
  const [resetOrgId, setResetOrgId] = useState('');
  const [resetEmailOrUsername, setResetEmailOrUsername] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  // Forgot Username
  const [recoveryOrgId, setRecoveryOrgId] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Always fetch orgList when modal opens
  useEffect(() => {
    if (forgotOpen) {
      axios
        .get(`${API_BASE}/api/organizations`)
        .then(res => {
          let arr = Array.isArray(res.data?.content) ? res.data.content : [];
          setOrgList(arr);
        })
        .catch(() => setOrgList([]));
    }
  }, [forgotOpen]);

  // LOGIN SUBMIT
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      toast({ title: 'Error', description: 'Please enter both username and password', variant: 'destructive' });
      return;
    }
    try {
      const ok = await login(u, p, rememberMe); // No orgId in UI
      if (ok) {
        toast({ title: 'Welcome back!', description: 'Login successful' });
        const from = (location.state as any)?.from?.pathname as string | undefined;
        navigate(from || '/dashboard', { replace: true });
      } else {
        toast({ title: 'Login failed', description: 'Invalid username or password', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Login failed', description: 'Unexpected error', variant: 'destructive' });
    }
  };

  // FORGOT PASSWORD
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOrgId || !resetEmailOrUsername.trim()) {
      toast({ title: 'Missing information', description: 'Select organization and enter username/email.', variant: 'destructive' });
      return;
    }
    setResetLoading(true);
    try {
      await axios.post(
        `${API_BASE}/api/organizations/${resetOrgId}/employees/forgot-password`,
        { emailOrUsername: resetEmailOrUsername.trim() }
      );
      toast({
        title: 'Password reset requested',
        description: 'If an account exists, you will receive an email with instructions.',
        variant: 'default',
      });
      handleCloseModal();
    } catch {
      toast({
        title: 'Password reset requested',
        description: 'If an account exists, you will receive an email with instructions.',
        variant: 'default',
      });
      handleCloseModal();
    } finally {
      setResetLoading(false);
    }
  };

  // FORGOT USERNAME
  const handleUsernameRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryOrgId || !recoveryEmail.trim()) {
      toast({ title: 'Missing information', description: 'Select organization and enter email.', variant: 'destructive' });
      return;
    }
    setRecoveryLoading(true);
    try {
      await axios.post(
        `${API_BASE}/api/organizations/${recoveryOrgId}/employees/forgot-username`,
        { email: recoveryEmail.trim() }
      );
      toast({
        title: 'Username sent',
        description: 'If an account exists, your username has been emailed.',
        variant: 'default',
      });
      handleCloseModal();
    } catch {
      toast({
        title: 'Username sent',
        description: 'No matching account or server error.',
        variant: 'default',
      });
      handleCloseModal();
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Modal helpers
  const handleOpenForgotPassword = () => {
    setForgotOpen('password'); setResetOrgId(''); setResetEmailOrUsername('');
  };
  const handleOpenForgotUsername = () => {
    setForgotOpen('username'); setRecoveryOrgId(''); setRecoveryEmail('');
  };
  const handleCloseModal = () => {
    setForgotOpen(null); setResetOrgId(''); setResetEmailOrUsername(''); setRecoveryOrgId(''); setRecoveryEmail('');
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-gradient-primary p-4 rounded-2xl">
              <Building2 className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">FineFlux</h1>
          <p className="text-muted-foreground">Comprehensive Petrol Station Management</p>
        </div>

        {/* Login Form */}
        <Card className="card-gradient">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Welcome back To FineFlux</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="transition-base"
                  required
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pr-10 transition-base"
                    required
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(v => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <div className="flex justify-between text-xs my-1">
                  <button
                    type="button"
                    onClick={handleOpenForgotPassword}
                    className="text-primary underline hover:text-primary/80 transition"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenForgotUsername}
                    className="text-primary underline hover:text-primary/80 transition"
                  >
                    Forgot username?
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-border"
                  disabled={isLoading}
                />
                <Label htmlFor="remember" className="text-sm">Remember me</Label>
              </div>
              <Button
                type="submit"
                className="w-full btn-gradient-primary"
                disabled={isLoading || !username || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Forgot password modal */}
        {forgotOpen === 'password' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-background rounded-md shadow-xl w-full max-w-sm p-6 relative">
              <button className="absolute top-2 right-2 text-muted-foreground" onClick={handleCloseModal}>
                <span className="text-xl font-bold">&times;</span>
              </button>
              <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
              <form className="space-y-3" onSubmit={handlePasswordReset}>
                <Label htmlFor="reset-orgid" className="block">Select Organization</Label>
                <select
                  id="reset-orgid"
                  value={resetOrgId}
                  onChange={e => setResetOrgId(e.target.value)}
                  required
                  className="w-full p-2 rounded border border-border"
                >
                  <option value="">Select Organization</option>
                  {(Array.isArray(orgList) ? orgList : []).map(org => (
                    <option key={org.organizationId} value={org.organizationId}>
                      {org.organizationName} ({org.organizationId})
                    </option>
                  ))}
                </select>
                <Label htmlFor="reset-username" className="block">Enter your email or username</Label>
                <Input
                  id="reset-username"
                  type="text"
                  autoFocus
                  required
                  placeholder="Email address or username"
                  value={resetEmailOrUsername}
                  onChange={e => setResetEmailOrUsername(e.target.value)}
                />
                <Button className="w-full" type="submit" disabled={resetLoading || !resetOrgId || !resetEmailOrUsername}>
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Request Reset
                </Button>
                <Button type="button" variant="secondary" className="w-full" onClick={handleCloseModal}>
                  Cancel
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                If the account exists, a reset link will be sent.
              </p>
            </div>
          </div>
        )}

        {/* Forgot username modal */}
        {forgotOpen === 'username' && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-background rounded-md shadow-xl w-full max-w-sm p-6 relative">
              <button className="absolute top-2 right-2 text-muted-foreground" onClick={handleCloseModal}>
                <span className="text-xl font-bold">&times;</span>
              </button>
              <h2 className="text-xl font-semibold mb-4">Find Username</h2>
              <form className="space-y-3" onSubmit={handleUsernameRecovery}>
                <Label htmlFor="recovery-orgid" className="block">Select Organization</Label>
                <select
                  id="recovery-orgid"
                  value={recoveryOrgId}
                  onChange={e => setRecoveryOrgId(e.target.value)}
                  required
                  className="w-full p-2 rounded border border-border"
                >
                  <option value="">Select Organization</option>
                  {(Array.isArray(orgList) ? orgList : []).map(org => (
                    <option key={org.organizationId} value={org.organizationId}>
                      {org.organizationName} ({org.organizationId})
                    </option>
                  ))}
                </select>
                <Label htmlFor="recovery-email" className="block">Enter your registered email address</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  required
                  autoFocus
                  placeholder="Email address"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                />
                <Button className="w-full" type="submit" disabled={recoveryLoading || !recoveryOrgId || !recoveryEmail}>
                  {recoveryLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Lookup Username
                </Button>
                <Button type="button" variant="secondary" className="w-full" onClick={handleCloseModal}>
                  Cancel
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                If the email matches an account, your username will be emailed.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© {currentYear} FineFlux System</p>
          <p>Professional fuel station management solution</p>
        </div>
      </div>
    </div>
  );
}
