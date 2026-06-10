import React, { useState } from 'react';
import { useAuth } from './layout/AuthProvider';
import { useTranslation } from '../hooks/useTranslation';

interface SignUpProps {
  onLoginClick: () => void;
  onSignUpSuccess: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onLoginClick, onSignUpSuccess }) => {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('auth.signup.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name);
      onSignUpSuccess();
    } catch (err: any) {
      console.error(err);
      setError(t('auth.signup.signupError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full flex flex-col bg-surface overflow-y-auto no-scrollbar">
      {/* Header Image Section */}
      <div className="relative h-[30vh] min-h-[250px] w-full shrink-0">
        <div
          className="h-full w-full bg-cover bg-center"
          role="img"
          aria-label={t('auth.signup.landscapeAria')}
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC4RddSoXCsn-Zfn0LdPq315-5yxrUvZXqS-R3O2-lnb__pGVO1mSXuOkRtQFT7al5_DWGhZlXNDfE_2zr9Pmc1ALM5aMP4z9y3BaNRqPcqKbuO3jMAKYhyXzcIhDh_h7uiMjuYpceqe1KT74x9IRcTA5TTjzHBimkedkvHNOsHFM1esw2ZkjbHB5oqa3O6QwLdivYQrQwtNZr574SzvZhlAE95qFIigEYAe7RnGFMc7-txVCzGTZ6QsmPGpwY-F2JFW-S1riByPAOS')" }}
        >
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 to-transparent"></div>

        {/* Back Button */}
        <div className="absolute top-0 left-0 p-4 pt-12 z-20">
          <button
            onClick={onLoginClick}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-overlay/20 backdrop-blur-md text-content border border-overlay/20 hover:bg-overlay/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative -mt-10 flex flex-1 flex-col rounded-t-[32px] bg-surface px-6 pt-8 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">

        <div className="flex flex-col gap-2 mb-6">
          <h1 className="font-display text-3xl font-extrabold leading-tight text-secondary">
            {t('auth.signup.title1')} <br /><span className="text-primary">{t('auth.signup.title2')}</span>
          </h1>
          <p className="text-sm font-medium text-text-muted leading-relaxed">
            {t('auth.signup.subtitle')}
          </p>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-secondary text-sm font-bold ml-1">{t('auth.signup.nameLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-content-muted">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <input
                className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 text-secondary placeholder:text-content-muted pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                placeholder={t('auth.signup.namePlaceholder')}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-secondary text-sm font-bold ml-1">{t('auth.signup.emailLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-content-muted">
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <input
                className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 text-secondary placeholder:text-content-muted pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                placeholder={t('auth.signup.emailPlaceholder')}
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-secondary text-sm font-bold ml-1">{t('auth.signup.passwordLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-content-muted">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <input
                className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 text-secondary placeholder:text-content-muted pl-11 pr-12 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                placeholder={t('auth.signup.passwordPlaceholder')}
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-secondary text-sm font-bold ml-1">{t('auth.signup.confirmPasswordLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-content-muted">
                <span className="material-symbols-outlined text-[20px]">lock_reset</span>
              </div>
              <input
                className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 text-secondary placeholder:text-content-muted pl-11 pr-12 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm font-medium"
                placeholder={t('auth.signup.passwordPlaceholder')}
                required
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs text-center font-bold italic">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full h-14 bg-primary hover:bg-orange-600 text-white font-bold text-base rounded-xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? t('auth.signup.creating') : t('auth.signup.submit')}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <p className="text-center text-sm font-medium text-content-subtle mt-2">
            {t('auth.signup.hasAccount')}
            <button
              onClick={onLoginClick}
              className="text-primary font-bold hover:underline ml-1"
            >
              {t('auth.signup.loginLink')}
            </button>
          </p>
        </form>

        <div className="h-8"></div>
      </div>
    </div>
  );
};
