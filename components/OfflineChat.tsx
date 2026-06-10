import React, { useState, useEffect, useRef } from 'react';
import { useOffGrid } from '../hooks/useOffGrid';
import { useDepartments } from '../hooks/useContent';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  engine?: 'gemma' | 'fallback';
}

interface OfflineChatProps {
  language: Language;
  onBack: () => void;
}

// Spanish connector words that stay lowercase inside a title
const LOWERCASE_CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e']);

/**
 * Renders inline markdown (**bold** and _italic_) within a single line of text.
 * The offline responder emits lightweight markdown; without this the chat shows
 * literal `**` and `_` characters instead of formatted text.
 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|_([^_]+)_/g;
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-bold text-content">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <em key={key++} className="text-content-subtle not-italic opacity-80">
          {match[2]}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/**
 * Converts a department slug (e.g. "valle-del-cauca") into a readable name
 * ("Valle del Cauca"). Used as a fallback when the department catalog is not
 * available offline and only the pack key is known.
 */
function formatDepartmentName(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export const OfflineChat: React.FC<OfflineChatProps> = ({ onBack }) => {
  const { t, language } = useTranslation();
  const {
    downloadedPacks,
    executeOfflineRag,
    getEngineStatus,
    initializeEngine
  } = useOffGrid();

  const { data: departments = [] } = useDepartments();

  const [activeDeptKey, setActiveDeptKey] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'gemma' | 'fallback'>('fallback');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const mainRef = useRef<HTMLElement>(null);
  const stickToBottomRef = useRef<boolean>(true);
  const loadedDeptRef = useRef<string | null>(null);

  // Initialize Engine on component load
  useEffect(() => {
    const startEngine = async () => {
      try {
        const status = await initializeEngine();
        setEngineMode(status.mode);
      } catch (err) {
        console.error("Failed to initialize engine:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    startEngine();
  }, [initializeEngine]);

  // Set default active department if downloaded packs exist
  useEffect(() => {
    const downloadedKeys = Object.keys(downloadedPacks);
    if (downloadedKeys.length > 0 && !activeDeptKey) {
      setActiveDeptKey(downloadedKeys[0]);
    }
  }, [downloadedPacks, activeDeptKey]);

  // Load chat history from localStorage (once per active department).
  // Guarded by a ref so it never re-runs on unrelated re-renders, which
  // previously reset messages on every keystroke and forced the scroll down.
  useEffect(() => {
    if (!activeDeptKey) {
      loadedDeptRef.current = null;
      setMessages([]);
      return;
    }

    if (loadedDeptRef.current === activeDeptKey) return;
    loadedDeptRef.current = activeDeptKey;

    const savedHistory = localStorage.getItem(`offline_chat_history_${activeDeptKey}`);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        return;
      } catch {
        /* corrupt history — fall through to welcome message */
      }
    }

    const deptObj = departments.find(d => (d.departmentId || d.id) === activeDeptKey);
    const deptName = deptObj?.name || formatDepartmentName(activeDeptKey);
    const initialMsg: Message = {
      id: 'welcome',
      sender: 'bot',
      text: t('vault.welcomeEstablished', { dept: deptName }),
      timestamp: new Date()
    };
    setMessages([initialMsg]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeptKey, departments]);

  // Save messages to localStorage when updated
  const saveChatHistory = (updatedMessages: Message[]) => {
    if (activeDeptKey) {
      localStorage.setItem(`offline_chat_history_${activeDeptKey}`, JSON.stringify(updatedMessages));
    }
  };

  // Track whether the user is parked near the bottom of the thread.
  // We only auto-scroll when they are, so manual scroll-up is respected.
  const handleScroll = () => {
    const el = mainRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  };

  // Keep the latest message in view by scrolling the container directly
  // (avoids scrollIntoView, which can scroll ancestors and cause jank).
  useEffect(() => {
    if (stickToBottomRef.current && mainRef.current) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeDeptKey || isGenerating) return;

    const userQuery = input.trim();
    setInput('');

    // Append User Message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userQuery,
      timestamp: new Date()
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);

    setIsGenerating(true);

    try {
      // Execute the offline RAG search and local model prompt injection
      const response = await executeOfflineRag(activeDeptKey, userQuery, language);
      
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.text,
        timestamp: new Date(),
        engine: response.engineUsed
      };

      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } catch (error) {
      console.error("Offline RAG execution failed:", error);
      const errorMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: t('vault.offlineQueryError'),
        timestamp: new Date()
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear chat history
  const handleClearHistory = () => {
    if (activeDeptKey) {
      const deptObj = departments.find(d => (d.departmentId || d.id) === activeDeptKey);
      const deptName = deptObj?.name || formatDepartmentName(activeDeptKey);
      
      const welcomeText = t('vault.welcomeCleared', { dept: deptName });
      
      const initialMsg: Message = {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: welcomeText,
        timestamp: new Date()
      };
      setMessages([initialMsg]);
      localStorage.removeItem(`offline_chat_history_${activeDeptKey}`);
    }
  };

  // Get active department list from downloaded packs
  const downloadedDepts = Object.keys(downloadedPacks).map(key => {
    const deptObj = departments.find(d => (d.departmentId || d.id) === key);
    return {
      key,
      name: deptObj?.name || formatDepartmentName(key)
    };
  });

  const renderEngineStatus = () => {
    if (isInitializing) {
      return (
        <>
          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-ping" />
          <span className="text-[10px] text-content-subtle">{t('vault.startingEngine')}</span>
        </>
      );
    }
    if (engineMode === 'gemma') {
      return (
        <>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
            {t('vault.gemmaBrainOffline')}
          </span>
        </>
      );
    }
    return (
      <>
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-0.5">
          <span className="material-symbols-outlined text-[10px]">bolt</span>
          {t('vault.localSearchMode')}
        </span>
      </>
    );
  };

  return (
    <div className="relative bg-background-dark font-display antialiased overflow-hidden h-screen w-full max-w-full flex flex-col text-content">
      <header className="shrink-0 flex items-center justify-between px-4 pb-3 pt-safe bg-background-dark/95 backdrop-blur-md border-b border-overlay/10 z-10">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-overlay/10 transition-colors text-content shrink-0"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>

        <div className="flex flex-col items-center min-w-0 px-2">
          <h1 className="text-content text-base font-bold leading-tight truncate max-w-[220px]">
            {t('vault.offlineChatTitle')}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">{renderEngineStatus()}</div>
        </div>

        {downloadedDepts.length > 0 ? (
          <button
            onClick={handleClearHistory}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-overlay/10 text-content/70 hover:text-red-400 transition-colors shrink-0"
            title={t('vault.clearHistory')}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
        ) : (
          <div className="w-10 shrink-0" />
        )}
      </header>

      <div className="shrink-0 px-4 py-3 border-b border-overlay/5 bg-background-dark">
        <label className="text-[10px] font-bold text-content-subtle uppercase tracking-widest">
          {t('vault.activeDatabase')}
        </label>

        {downloadedDepts.length === 0 ? (
          <div className="mt-2 p-3 bg-red-950/20 border border-red-900/30 rounded-2xl flex items-center gap-2 text-xs text-red-400">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>{t('vault.noDeptsDownloaded')}</span>
          </div>
        ) : (
          <div className="relative mt-2">
            <select
              value={activeDeptKey}
              onChange={(e) => setActiveDeptKey(e.target.value)}
              className="w-full h-11 pl-4 pr-10 bg-surface-dark border border-overlay/10 rounded-2xl text-sm font-semibold text-content appearance-none focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
            >
              {downloadedDepts.map(dept => (
                <option key={dept.key} value={dept.key} className="bg-surface-dark text-content">
                  {dept.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none">
              unfold_more
            </span>
          </div>
        )}
      </div>

      <main
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 bg-background-dark"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div
                className={`w-full max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-sm border-emerald-500/30'
                    : 'bg-surface-dark text-content rounded-tl-sm border-overlay/10'
                }`}
              >
                <div className="break-words">
                  {msg.text.split('\n').map((line, idx) => {
                    const trimmed = line.trim();

                    if (!trimmed) {
                      return <div key={idx} className="h-2" />;
                    }

                    if (trimmed === '---') {
                      return <hr key={idx} className="border-overlay/10 my-2.5" />;
                    }

                    if (trimmed.startsWith('>')) {
                      return (
                        <p
                          key={idx}
                          className="text-content-subtle pl-3 border-l-2 border-overlay/20 my-2 text-[11px] leading-relaxed"
                        >
                          {renderInline(trimmed.replace(/^>\s?/, ''))}
                        </p>
                      );
                    }

                    if (/^(📋|🛡️|📍|💡|🏠)/.test(trimmed)) {
                      return (
                        <p key={idx} className="font-bold text-content mt-3 mb-1.5 leading-snug">
                          {renderInline(trimmed)}
                        </p>
                      );
                    }

                    if (trimmed.startsWith('•')) {
                      return (
                        <p key={idx} className="pl-1.5 mb-1 leading-relaxed">
                          {renderInline(trimmed)}
                        </p>
                      );
                    }

                    return (
                      <p key={idx} className="mb-1.5 last:mb-0 leading-relaxed">
                        {renderInline(line)}
                      </p>
                    );
                  })}
                </div>

                {!isUser && msg.engine && (
                  <div className="flex items-center justify-end gap-1 mt-2.5 text-[9px] font-bold uppercase tracking-wider text-content-subtle border-t border-overlay/5 pt-1.5">
                    <span className="material-symbols-outlined text-[10px]">
                      {msg.engine === 'gemma' ? 'memory' : 'bolt'}
                    </span>
                    <span>{msg.engine === 'gemma' ? 'gemma 4 engine' : 'telemetry search'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex w-full justify-start">
            <div className="max-w-[85%] bg-surface-dark border border-overlay/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-content-subtle flex items-center gap-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">
                {t('vault.searchingLocal')}
              </span>
            </div>
          </div>
        )}

        <div className="h-24" />
      </main>

      <div className="absolute bottom-0 left-0 w-full bg-background-dark/95 backdrop-blur-md border-t border-overlay/10 pb-safe-input pt-4 z-20">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!activeDeptKey || isGenerating}
            placeholder={
              !activeDeptKey ? t('vault.downloadToChat') : t('vault.inputPlaceholder')
            }
            className="flex-1 min-w-0 bg-surface-dark border border-transparent focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 text-content rounded-full pl-5 pr-5 py-3.5 text-base placeholder:text-content-subtle shadow-inner transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || !activeDeptKey || isGenerating}
            className="shrink-0 p-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all shadow-lg shadow-emerald-950/20"
          >
            <span className="material-symbols-outlined filled-icon">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
