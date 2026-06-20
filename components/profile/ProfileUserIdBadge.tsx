import React, { useCallback, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface ProfileUserIdBadgeProps {
    userId: string | undefined;
}

function displayUserId(uid: string): string {
    if (uid.length <= 22) return uid;
    return `${uid.slice(0, 12)}…${uid.slice(-6)}`;
}

export const ProfileUserIdBadge: React.FC<ProfileUserIdBadgeProps> = ({ userId }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!userId) return;
        try {
            await navigator.clipboard.writeText(userId);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            try {
                const ta = document.createElement('textarea');
                ta.value = userId;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
            } catch {
                /* ignore */
            }
        }
    }, [userId]);

    if (!userId) return null;

    const hint = copied ? t('profile.userIdCopied') : t('profile.userIdCopyHint');

    return (
        <div className="flex justify-center px-4">
            <button
                type="button"
                onClick={handleCopy}
                title={hint}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-overlay/10 bg-surface-dark/60 px-2.5 py-1.5 transition-all active:scale-[0.98] hover:border-primary/25 hover:bg-surface-dark/90"
                aria-label={hint}
            >
                <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-content-muted">
                    {t('profile.userIdLabel')}:
                </span>
                <span className="shrink-0 font-mono text-[11px] text-content/90">
                    {displayUserId(userId)}
                </span>
                <span
                    className={`material-symbols-outlined shrink-0 text-[15px] transition-colors ${
                        copied ? 'text-emerald-400' : 'text-primary'
                    }`}
                    aria-hidden
                >
                    {copied ? 'check_circle' : 'content_copy'}
                </span>
            </button>
        </div>
    );
};
