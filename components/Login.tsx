import React, { useState } from 'react';
import { Language } from '../types/core';
import { useAuth } from './layout/AuthProvider';
import { useTranslation } from '../hooks/useTranslation';
import { isGuestLoginEnabled } from '../utils/guestAccess';

interface LoginProps {
  language: Language;
  onLoginSuccess: () => void;
  onTermsClick: () => void;
  onPrivacyClick: () => void;
  onSignUpClick: () => void;
  onRecoveryClick: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onTermsClick,
  onPrivacyClick,
  onSignUpClick,
  onRecoveryClick
}) => {
  const { t } = useTranslation();
  const { login, loginWithGoogle, loginAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      // onLoginSuccess not needed as AuthProvider triggers App redirect
    } catch (err: any) {
      setError(t('common.errorLogin'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(t('common.errorGoogleLogin'));
      console.error(err);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsGuest();
    } catch (err: unknown) {
      setError(t('login.errorGuest'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col bg-surface overflow-y-auto">
      {/* Reduced height from 45vh to 35vh to pull content up */}
      <div className="relative h-[35vh] min-h-[300px] w-full shrink-0">
        <div
          className="h-full w-full bg-cover bg-center"
          role="img"
          aria-label="Immersive landscape of Colombian Cocora Valley"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC4RddSoXCsn-Zfn0LdPq315-5yxrUvZXqS-R3O2-lnb__pGVO1mSXuOkRtQFT7al5_DWGhZlXNDfE_2zr9Pmc1ALM5aMP4z9y3BaNRqPcqKbuO3jMAKYhyXzcIhDh_h7uiMjuYpceqe1KT74x9IRcTA5TTjzHBimkedkvHNOsHFM1esw2ZkjbHB5oqa3O6QwLdivYQrQwtNZr574SzvZhlAE95qFIigEYAe7RnGFMc7-txVCzGTZ6QsmPGpwY-F2JFW-S1riByPAOS')" }}
        >
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-deep-blue/40 to-transparent"></div>
      </div>

      {/* Increased negative margin from -mt-8 to -mt-12 */}
      <div className="relative -mt-12 flex flex-1 flex-col rounded-t-3xl bg-surface px-8 pt-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-10">
        <div className="absolute -top-10 left-1/2 flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-2xl bg-surface shadow-xl shadow-deep-blue/10 p-4">
          <img src="/assets/ui/logo.png" alt="Hidden Logo" className="w-full h-full object-contain drop-shadow-md" />
        </div>

        <div className="mt-14 flex flex-col items-center text-center h-full">
          <div className="mb-3 flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 border border-green-100">
            <span className="material-symbols-outlined text-[16px] text-green-600">wifi</span>
            <span className="text-xs font-bold tracking-wide text-green-700">{t('login.connected')}</span>
          </div>

          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-deep-blue">
            {t('login.title1')} <br /><span className="text-sunset-orange">{t('login.title2')}</span>
          </h1>

          <p className="mt-2 max-w-[280px] text-sm font-medium leading-relaxed text-text-muted">
            {t('login.subtitle')}
          </p>

          {isGuestLoginEnabled && (
            <div className="mt-5 w-full max-w-sm">
              <button
                onClick={handleGuestLogin}
                disabled={loading}
                type="button"
                className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-jungle-green bg-jungle-green/5 px-4 text-sm font-bold tracking-wide text-jungle-green transition-all hover:bg-jungle-green/10 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">explore</span>
                <span>{t('login.btnGuest')}</span>
              </button>
              <p className="mt-2 text-center text-[11px] font-medium text-content-muted">
                {t('login.guestHint')}
              </p>
              <div className="relative py-4">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface px-2 text-xs font-medium text-content-muted">{t('login.orSignIn')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Login Form Section */}
          <div className={`w-full max-w-sm space-y-4 ${isGuestLoginEnabled ? '' : 'mt-5'}`}>

            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <input
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 text-deep-blue placeholder:text-content-muted pl-10 pr-4 focus:ring-2 focus:ring-sunset-orange/20 focus:border-sunset-orange transition-all outline-none text-sm font-medium"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-content-muted">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <input
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 text-deep-blue placeholder:text-content-muted pl-10 pr-4 focus:ring-2 focus:ring-sunset-orange/20 focus:border-sunset-orange transition-all outline-none text-sm font-medium"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                onClick={onRecoveryClick}
                className="text-xs font-semibold text-sunset-orange hover:text-deep-blue transition-colors"
                type="button"
              >
                {t('login.forgotPass')}
              </button>
            </div>

            {/* Error Message */}
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            {/* Main Login Button */}
            <button
              onClick={handleEmailLogin}
              disabled={loading}
              className="group flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sunset-orange px-4 text-sm font-bold tracking-wide text-white transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-sunset-orange/30 mt-1 disabled:opacity-50"
            >
              {loading ? (
                <span>{t('common.loading')}</span>
              ) : (
                <>
                  <span>{t('login.loginBtn')}</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>

            {/* Separator */}
            <div className="relative py-2">
              <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface px-2 text-xs font-medium text-content-muted">o</span>
              </div>
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogleLogin}
              className="group flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold tracking-wide text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98]"
            >
              <img src="/assets/ui/google_logo.png" alt="Google" className="h-6 w-6 object-contain" />
              <span>{t('login.btnGoogle')}</span>
            </button>

            {/* Apple Button (Inactive) */}
            <div className="relative group">
              <button
                disabled
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-black px-4 text-sm font-bold tracking-wide text-content opacity-90 cursor-not-allowed shadow-lg"
              >
                <img src="/assets/ui/applelogowhite.png" alt="Apple" className="h-5 w-5 object-contain" />
                <span>{t('login.btnApple')}</span>
              </button>
              <span className="absolute -top-2 -right-2 bg-sunset-orange text-[10px] font-bold text-white px-2 py-0.5 rounded-full shadow-md">
                {t('login.soon')}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-8 flex flex-col gap-4 pb-safe">
            <p className="text-xs text-center text-content-muted leading-relaxed px-4">
              {t('login.agree')} <a className="font-semibold text-jungle-green hover:underline cursor-pointer" onClick={(e) => { e.preventDefault(); onTermsClick(); }}>{t('login.terms')}</a> {t('common.and')} <a className="font-semibold text-jungle-green hover:underline cursor-pointer" onClick={(e) => { e.preventDefault(); onPrivacyClick(); }}>{t('login.privacy')}</a>.
            </p>
            <p className="text-sm font-medium text-deep-blue text-center">
              {t('login.noAccount')} <button className="font-bold text-sunset-orange hover:underline cursor-pointer ml-1" onClick={onSignUpClick}>{t('login.signup')}</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
