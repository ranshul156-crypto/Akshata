import { useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InputField } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'email' | 'verify';

export function LoginRoute() {
  const { session, signInWithOtp, verifyOtp } = useAuth();
  const location = useLocation();

  const fromPath = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? '/';
  }, [location.state]);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to={fromPath} replace />;

  async function onSendCode() {
    setError(null);
    setBusy(true);
    try {
      await signInWithOtp(email.trim());
      setStep('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send code');
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setError(null);
    setBusy(true);
    try {
      await verifyOtp({ email: email.trim(), token: token.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to verify code');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-text">Sign in</h1>
          <p className="text-sm text-text-muted">
            Use email + one-time passcode (OTP). We keep the experience calm and low-friction.
          </p>
        </div>

        <Card className="space-y-4">
          {step === 'email' ? (
            <>
              <InputField
                label="Email"
                inputId="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                className="w-full"
                onClick={() => void onSendCode()}
                disabled={busy || email.trim().length === 0}
              >
                {busy ? 'Sending…' : 'Send code'}
              </Button>
              <p className="text-xs text-text-muted">
                If your Supabase project is configured for magic links, you can also open the email link.
              </p>
            </>
          ) : (
            <>
              <Alert title="Check your email" variant="info">
                Enter the code you received. If you used a magic link, return here after opening it.
              </Alert>
              <InputField
                label="One-time code"
                inputId="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full"
                  onClick={() => void onVerify()}
                  disabled={busy || token.trim().length === 0}
                >
                  {busy ? 'Verifying…' : 'Verify & sign in'}
                </Button>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => {
                    setToken('');
                    setStep('email');
                  }}
                  disabled={busy}
                >
                  Change email
                </Button>
              </div>
            </>
          )}

          {error ? <Alert title={error} variant="danger" /> : null}
        </Card>
      </div>
    </div>
  );
}
