import React from 'react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen font-display antialiased w-full">
      <style>{`
        /* Smooth detail opening */
        details > summary {
            list-style: none;
        }
        details > summary::-webkit-details-marker {
            display: none;
        }
        details[open] summary ~ * {
            animation: sweep .3s ease-in-out;
        }
        @keyframes sweep {
            0%    {opacity: 0; transform: translateY(-10px)}
            100%  {opacity: 1; transform: translateY(0)}
        }
      `}</style>

      {/* Main Mobile Container */}
      <div className="relative flex h-full w-full max-w-md flex-col bg-background-dark overflow-hidden shadow-2xl sm:rounded-[32px] sm:h-[850px] sm:border-[8px] sm:border-gray-900 h-screen text-content">

        {/* Top App Bar */}
        <div className="flex items-center bg-background-dark px-4 py-3 justify-between border-b border-overlay/5 sticky top-0 z-20 pt-12 sm:pt-4">
          <button
            onClick={onBack}
            aria-label="Go back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-overlay/10 transition-colors group"
          >
            <span className="material-symbols-outlined text-primary text-2xl group-hover:-translate-x-1 transition-transform">arrow_back_ios_new</span>
          </button>
          <h2 className="text-content text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Privacy Policy</h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-8 relative">

          {/* Hero Section */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-green-400 text-3xl">shield_lock</span>
              <p className="text-content-muted text-xs font-medium uppercase tracking-wider">Legal Document</p>
            </div>
            <h1 className="text-content text-3xl font-extrabold leading-tight tracking-tight mb-3">
              Your Privacy <br />
              <span className="text-primary">is our priority.</span>
            </h1>
            <p className="text-content-subtle text-sm font-medium">Last updated: October 24, 2023</p>
          </div>

          {/* Intro Body */}
          <div className="px-6 py-4">
            <p className="text-content-secondary text-[15px] leading-relaxed font-normal">
              At <span className="font-bold text-content">Hidden</span>, we are committed to protecting your personal data while helping you discover the secret paradises of Colombia. This policy outlines how we handle your information, specifically focusing on our AI travel assistant and offline map technologies.
            </p>
          </div>

          {/* Accordions */}
          <div className="flex flex-col px-4 gap-3">
            {/* Item 1 */}
            <details className="flex flex-col rounded-2xl bg-surface-dark border border-overlay/5 open:border-primary/20 open:bg-surface-dark open:shadow-sm transition-all duration-300 group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-overlay/5 text-white group-open:bg-primary group-open:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">database</span>
                  </div>
                  <p className="text-content text-sm font-bold">1. Data Collection & Usage</p>
                </div>
                <span className="material-symbols-outlined text-content-muted group-open:rotate-180 group-open:text-primary transition-all">expand_more</span>
              </summary>
              <div className="px-4 pb-4 pl-[3.75rem]">
                <p className="text-content-muted text-sm leading-relaxed">
                  We collect basic profile information (name, email) to personalize your experience. We also collect usage data to improve our hidden gem recommendations algorithms.
                </p>
              </div>
            </details>

            {/* Item 2 */}
            <details className="flex flex-col rounded-2xl bg-gray-50 border border-transparent open:border-primary/20 open:bg-white open:shadow-sm transition-all duration-300 group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-deep-blue/5 text-deep-blue group-open:bg-primary group-open:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">smart_toy</span>
                  </div>
                  <p className="text-deep-blue text-sm font-bold">2. AI Conversational Data</p>
                </div>
                <span className="material-symbols-outlined text-content-muted group-open:rotate-180 group-open:text-primary transition-all">expand_more</span>
              </summary>
              <div className="px-4 pb-4 pl-[3.75rem]">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Conversations with our AI Travel Assistant are processed to provide real-time suggestions. These interactions are anonymized and used to train our models on Colombian tourism specifics.
                </p>
              </div>
            </details>

            {/* Item 3 */}
            <details className="flex flex-col rounded-2xl bg-gray-50 border border-transparent open:border-primary/20 open:bg-white open:shadow-sm transition-all duration-300 group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-deep-blue/5 text-deep-blue group-open:bg-primary group-open:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">map</span>
                  </div>
                  <p className="text-deep-blue text-sm font-bold">3. Location & Offline Maps</p>
                </div>
                <span className="material-symbols-outlined text-content-muted group-open:rotate-180 group-open:text-primary transition-all">expand_more</span>
              </summary>
              <div className="px-4 pb-4 pl-[3.75rem]">
                <p className="text-slate-600 text-sm leading-relaxed">
                  To enable discovery in remote areas, we may cache map data on your device. Your precise location is used only to show nearby hidden spots and is never stored permanently on our servers.
                </p>
              </div>
            </details>

            {/* Item 4 */}
            <details className="flex flex-col rounded-2xl bg-gray-50 border border-transparent open:border-primary/20 open:bg-white open:shadow-sm transition-all duration-300 group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-deep-blue/5 text-deep-blue group-open:bg-primary group-open:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">share</span>
                  </div>
                  <p className="text-deep-blue text-sm font-bold">4. Third-Party Sharing</p>
                </div>
                <span className="material-symbols-outlined text-content-muted group-open:rotate-180 group-open:text-primary transition-all">expand_more</span>
              </summary>
              <div className="px-4 pb-4 pl-[3.75rem]">
                <p className="text-slate-600 text-sm leading-relaxed">
                  We do not sell your data. We may share anonymized aggregate statistics with local tourism boards to help improve infrastructure in the regions you visit.
                </p>
              </div>
            </details>

            {/* Item 5 */}
            <details className="flex flex-col rounded-2xl bg-gray-50 border border-transparent open:border-primary/20 open:bg-white open:shadow-sm transition-all duration-300 group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-full bg-deep-blue/5 text-deep-blue group-open:bg-primary group-open:text-white transition-colors">
                    <span className="material-symbols-outlined text-lg">gavel</span>
                  </div>
                  <p className="text-deep-blue text-sm font-bold">5. Your Rights & Deletion</p>
                </div>
                <span className="material-symbols-outlined text-content-muted group-open:rotate-180 group-open:text-primary transition-all">expand_more</span>
              </summary>
              <div className="px-4 pb-4 pl-[3.75rem]">
                <p className="text-slate-600 text-sm leading-relaxed">
                  You have the right to request a copy of your data or full deletion of your account at any time via the Settings menu.
                </p>
              </div>
            </details>
          </div>

          {/* Contact Section */}
          <div className="mt-8 px-6 pb-12">
            <div className="rounded-xl bg-jungle-green p-5 relative overflow-hidden">
              {/* decorative pattern */}
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-20 h-20 bg-overlay/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-overlay/5 rounded-full blur-lg"></div>
              <h3 className="text-content text-base font-bold relative z-10">Have questions?</h3>
              <p className="text-green-100 text-sm mt-1 mb-4 relative z-10">Contact our Data Protection Officer.</p>
              <a
                className="inline-flex items-center justify-center px-4 py-2 bg-white text-jungle-green text-sm font-bold rounded-lg hover:bg-green-50 transition-colors w-full relative z-10"
                href="mailto:privacy@hiddenapp.co"
              >
                <span className="material-symbols-outlined text-lg mr-2">mail</span>
                Email Us
              </a>
            </div>
          </div>

          {/* Bottom safe area spacing */}
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
};