import React, { useState, useCallback } from 'react';
import { FirebaseError } from 'firebase/app';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../layout/AuthProvider';

interface GuestAccountUpgradeProps {
    onUpgraded?: () => void;
}

function mapLinkError(error: unknown, t: (key: string) => string): string {
    if (error instanceof FirebaseError) {
        switch (error.code) {
            case 'auth/email-already-in-use':
            case 'auth/credential-already-in-use':
                return t('settings.guestUpgrade.errorCredentialInUse');
            case 'auth/weak-password':
                return t('settings.guestUpgrade.errorWeakPassword');
            case 'auth/invalid-email':
                return t('settings.guestUpgrade.errorInvalidEmail');
            case 'auth/popup-closed-by-user':
                return t('settings.guestUpgrade.errorCancelled');
            default:
                break;
        }
    }
    if (error instanceof Error && error.message === 'NOT_GUEST') {
        return t('settings.guestUpgrade.errorNotGuest');
    }
    return t('settings.guestUpgrade.errorGeneric');
}

export const GuestAccountUpgrade: React.FC<GuestAccountUpgradeProps> = ({ onUpgraded }) => {
    const { t } = useTranslation();
    const { linkGuestWithGoogle, linkGuestWithEmail } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState<'google' | 'email' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGoogle = useCallback(async () => {
        setError(null);
        setLoading('google');
        try {
            await linkGuestWithGoogle();
            onUpgraded?.();
        } catch (err) {
            setError(mapLinkError(err, t));
        } finally {
            setLoading(null);
        }
    }, [linkGuestWithGoogle, onUpgraded, t]);

    const handleEmail = useCallback(async () => {
        setError(null);
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError(t('settings.guestUpgrade.errorInvalidEmail'));
            return;
        }
        if (password.length < 6) {
            setError(t('settings.guestUpgrade.errorWeakPassword'));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('settings.guestUpgrade.errorPasswordMismatch'));
            return;
        }
        setLoading('email');
        try {
            await linkGuestWithEmail(trimmedEmail, password);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            onUpgraded?.();
        } catch (err) {
            setError(mapLinkError(err, t));
        } finally {
            setLoading(null);
        }
    }, [confirmPassword, email, linkGuestWithEmail, onUpgraded, password, t]);

    return (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 flex flex-col gap-4">
            <div className="flex gap-3 items-start">
                <span className="material-symbols-outlined text-primary text-[24px] shrink-0">person_add</span>
                <div>
                    <h3 className="text-base font-bold text-content">{t('settings.guestUpgrade.title')}</h3>
                    <p className="text-xs text-content-muted mt-1 leading-relaxed">
                        {t('settings.guestUpgrade.subtitle')}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={handleGoogle}
                disabled={loading !== null}
                className="w-full flex h-12 items-center justify-center gap-3 rounded-xl border border-overlay/15 bg-surface-dark text-content text-sm font-bold transition-all hover:bg-overlay/5 active:scale-[0.98] disabled:opacity-50"
            >
                <img src="/assets/ui/google_logo.png" alt="" className="h-5 w-5 object-contain" aria-hidden />
                <span>{loading === 'google' ? t('common.loading') : t('settings.guestUpgrade.btnGoogle')}</span>
            </button>

            <div className="relative py-1">
                <div aria-hidden className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-overlay/10" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-transparent px-2 text-[10px] font-bold uppercase tracking-wider text-content-muted">
                        {t('settings.guestUpgrade.orEmail')}
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-content-muted">{t('settings.email')}</span>
                    <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('settings.guestUpgrade.emailPlaceholder')}
                        disabled={loading !== null}
                        className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content h-11 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-content-muted">{t('settings.guestUpgrade.password')}</span>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('settings.guestUpgrade.passwordPlaceholder')}
                        disabled={loading !== null}
                        className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content h-11 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                    />
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-content-muted">{t('settings.guestUpgrade.confirmPassword')}</span>
                    <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('settings.guestUpgrade.confirmPlaceholder')}
                        disabled={loading !== null}
                        className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content h-11 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                    />
                </label>
            </div>

            {error ? (
                <p className="text-xs text-red-400 font-medium leading-relaxed" role="alert">
                    {error}
                </p>
            ) : null}

            <button
                type="button"
                onClick={handleEmail}
                disabled={loading !== null}
                className="w-full bg-primary hover:bg-orange-600 disabled:opacity-50 text-white font-bold h-12 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>{loading === 'email' ? t('common.loading') : t('settings.guestUpgrade.btnEmail')}</span>
            </button>

            <p className="text-[10px] text-content-muted leading-relaxed text-center">
                {t('settings.guestUpgrade.footnote')}
            </p>
        </div>
    );
};
