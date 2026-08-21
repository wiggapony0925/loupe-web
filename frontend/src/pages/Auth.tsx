/**
 * Auth — Firebase SMS OTP, two steps, zero chrome. The invisible reCAPTCHA
 * anchors to a persistent empty div.
 */
import { useState } from 'react';
import { confirmSmsCode, startPhoneSignIn } from '@/lib/firebase';
import { useHaptics } from '@/hooks/useHaptics';

type Step = 'phone' | 'code';

export function Auth() {
  const haptics = useHaptics();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = (): string => {
    const digits = phone.replace(/[^\d+]/g, '');
    return digits.startsWith('+') ? digits : `+1${digits}`;
  };

  const sendCode = async (): Promise<void> => {
    haptics.impactLight();
    setBusy(true);
    setError(null);
    try {
      await startPhoneSignIn(normalizedPhone(), 'recaptcha-anchor');
      setStep('code');
    } catch (err) {
      haptics.warning();
      setError(err instanceof Error ? err.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (): Promise<void> => {
    haptics.impactLight();
    setBusy(true);
    setError(null);
    try {
      await confirmSmsCode(code.trim());
      haptics.success();
      // onIdTokenChanged in App takes it from here.
    } catch (err) {
      haptics.warning();
      setError('That code didn’t match — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__brand">
        <span className="auth__wordmark">trackify</span>
        <span className="auth__tagline">Shared money, in real time.</span>
      </div>

      <div className="auth__form">
        {step === 'phone' ? (
          <>
            <label className="field">
              <span className="field__label">Phone number</span>
              <input
                className="field__input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(555) 000-1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={`button button--primary${busy || phone.replace(/\D/g, '').length < 10 ? ' button--disabled' : ''}`}
              disabled={busy || phone.replace(/\D/g, '').length < 10}
              onClick={() => void sendCode()}
            >
              {busy ? 'Sending…' : 'Text me a code'}
            </button>
          </>
        ) : (
          <>
            <label className="field">
              <span className="field__label">6-digit code</span>
              <input
                className="field__input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={`button button--primary${busy || code.trim().length < 6 ? ' button--disabled' : ''}`}
              disabled={busy || code.trim().length < 6}
              onClick={() => void verify()}
            >
              {busy ? 'Verifying…' : 'Sign in'}
            </button>
            <button type="button" className="auth__back" onClick={() => setStep('phone')}>
              Use a different number
            </button>
          </>
        )}
        {error ? <p className="notice notice--error">{error}</p> : null}
      </div>

      <div id="recaptcha-anchor" />
      <span className="auth__footer">JFM Capital Group LLC</span>
    </div>
  );
}
