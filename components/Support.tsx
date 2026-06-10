import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types/core';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from './layout/AuthProvider';
import {
  useSupportTickets,
  useSupportTicket,
  startSupportTicket,
  sendTicketReply,
  markTicketAsRead
} from '../hooks/useSocial';

interface SupportProps {
  language: Language;
  onBack: () => void;
}

type Tab = 'new' | 'list';

export const Support: React.FC<SupportProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const topicOptions = [
    t('support.topicMap'),
    t('support.topicBooking'),
    t('support.topicReport'),
    t('support.topicOther'),
  ];

  // Firestore Data
  const { data: tickets, loading: loadingTickets } = useSupportTickets(user?.uid);
  // Real-time listener for the SELECTED ticket (single document)
  const { data: activeTicket, loading: loadingMessages } = useSupportTicket(selectedTicketId);
  const messages = activeTicket?.messages || [];

  // Form State
  const [form, setForm] = useState({
    topic: topicOptions[0],
    subject: '',
    message: ''
  });
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedTicketId) {
      scrollToBottom();
      // Mark as read when opening
      markTicketAsRead(selectedTicketId).catch(console.error);
    }
  }, [messages, selectedTicketId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.subject || !form.message) return;

    try {
      setSending(true);
      await startSupportTicket(user.uid, user.displayName || 'Usuario', form);
      alert(t('support.sentSuccess'));
      setForm({ ...form, subject: '', message: '' });
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      alert(t('support.sendError'));
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketId || !user || !replyText.trim()) return;

    try {
      setSending(true);
      await sendTicketReply(selectedTicketId, replyText, true);
      setReplyText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-background-dark font-display antialiased text-content relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto shadow-2xl overflow-hidden transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-background-dark/95 backdrop-blur-md px-4 pb-2 pt-safe justify-between border-b border-overlay/5 transition-colors">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-content flex size-10 shrink-0 items-center justify-center cursor-pointer transition-opacity hover:opacity-70"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h2 className="text-content text-lg font-bold leading-tight tracking-[-0.015em]">
            {t('support.title')}
          </h2>
        </div>
        <img src="/assets/ui/logo.png" alt="Hidden Logo" className="h-8 object-contain" />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {!selectedTicketId ? (
          <>
            {/* Tabs */}
            <div className="px-5 py-4">
              <div className="flex h-12 w-full items-center justify-center rounded-xl bg-overlay/5 p-1 shadow-inner">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`flex h-full flex-1 items-center justify-center rounded-lg text-sm font-bold transition-all ${activeTab === 'new' ? 'bg-surface-dark text-primary shadow-sm' : 'text-content-muted'
                    }`}
                >
                  {t('support.tabNew')}
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex h-full flex-1 items-center justify-center rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-surface-dark text-primary shadow-sm' : 'text-content-muted'
                    }`}
                >
                  {t('support.tabList')}
                </button>
              </div>
            </div>

            <div className="px-5 pb-8">
              {activeTab === 'new' ? (
                <form onSubmit={handleCreateTicket} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold ml-1 text-content-muted">{t('support.topicLabel')}</label>
                    <select
                      value={form.topic}
                      onChange={e => setForm({ ...form, topic: e.target.value })}
                      className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content p-3.5 focus:ring-1 focus:ring-primary outline-none"
                    >
                      {topicOptions.map((topic, i) => <option key={i} value={topic}>{topic}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold ml-1 text-content-muted">{t('support.subject')}</label>
                    <input
                      className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content p-3.5 focus:ring-1 focus:ring-primary outline-none"
                      type="text"
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold ml-1 text-content-muted">{t('support.description')}</label>
                    <textarea
                      className="w-full rounded-xl border border-overlay/10 bg-surface-dark text-content p-3.5 focus:ring-1 focus:ring-primary outline-none resize-none"
                      rows={6}
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <button
                    disabled={sending}
                    className="w-full rounded-xl bg-primary py-4 text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {sending ? t('support.sending') : t('support.submit')}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
                  {loadingTickets ? (
                    <p className="text-center text-content-subtle py-10">{t('common.loading')}</p>
                  ) : tickets.length === 0 ? (
                    <div className="py-20 text-center opacity-40">
                      <span className="material-symbols-outlined text-6xl mb-2">inbox</span>
                      <p>{t('support.empty')}</p>
                    </div>
                  ) : (
                    tickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className="group relative flex flex-col gap-3 rounded-2xl border border-overlay/5 bg-surface-dark p-4 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${ticket.status === 'replied' ? 'bg-green-900/20 text-green-400 border-green-800/30' :
                            ticket.status === 'customer-replied' ? 'bg-orange-900/20 text-orange-400 border-orange-800/30' :
                              'bg-blue-900/20 text-blue-400 border-blue-800/30'
                            }`}>
                            {ticket.status === 'replied' ? t('support.statusReplied') :
                              ticket.status === 'customer-replied' ? t('support.statusWaiting') :
                                t('support.statusOpen')}
                          </span>
                          <span className="text-[10px] text-content-muted">
                            {ticket.updatedAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold leading-tight mb-1">{ticket.subject}</h3>
                          <p className="text-[12px] text-content-subtle line-clamp-2">
                            {ticket.messages && ticket.messages.length > 0
                              ? ticket.messages[ticket.messages.length - 1].text
                              : ''}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Thread Detail View */
          <div className="flex flex-col h-[calc(100vh-140px)] animate-in slide-in-from-right duration-300">
            <div className="p-4 bg-gray-50 dark:bg-overlay/5 flex flex-col gap-1 shrink-0">
              <h3 className="font-bold text-sm">{activeTicket?.subject}</h3>
              <p className="text-xs text-primary">{activeTicket?.topic} • {activeTicket?.id}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
              {loadingMessages ? (
                <p className="text-center text-content-muted py-10">{t('common.loading')}</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-surface-dark text-content rounded-tl-none border border-overlay/10'
                      }`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-content-muted mt-1 px-1">
                      {msg.sender === 'support' ? 'Hidden App' : 'Tú'} • {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Footer */}
            <div className="p-4 bg-white dark:bg-background-dark border-t border-gray-100 dark:border-overlay/5 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={t('support.replyPlaceholder')}
                  className="flex-1 bg-gray-100 dark:bg-overlay/5 rounded-full px-5 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                  onKeyPress={e => e.key === 'Enter' && handleSendReply()}
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="size-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
