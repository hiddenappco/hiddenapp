import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Language } from '../types/core';
import { useAuth } from './layout/AuthProvider';
import { useChatMessages, sendMessageToAgent, useDepartment, useAssistant } from '../hooks/useFirestore';
import { useRevenueCat } from './layout/RevenueCatProvider';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { resolveEffectiveDepartmentId } from '../utils/departmentIds';
import { useTranslation } from '../hooks/useTranslation';

import { ChatHeader } from './chat/ChatHeader';
import { ChatMessageList } from './chat/ChatMessageList';
import { ChatInput } from './chat/ChatInput';
import { ChatWidgetByType } from './chat/ChatWidgets';
import { normalizeChatWidget } from '../utils/chatWidgets';

interface ChatProps {
  language: Language;
  onBack: () => void;
}

export const Chat: React.FC<ChatProps> = ({ language, onBack }) => {
  const { contextId } = useParams<{ contextId: string }>();
  const departmentId = contextId === 'global' ? null : contextId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useRevenueCat();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionStartTime = useRef(Date.now());

  const { data: department } = useDepartment(departmentId || undefined);
  const canonicalDepartmentId = departmentId
    ? resolveEffectiveDepartmentId(departmentId, department)
    : null;
  const { data: assistant } = useAssistant(canonicalDepartmentId || departmentId || undefined);
  const { messages } = useChatMessages(user?.uid, departmentId || 'global');
  const { t } = useTranslation();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const platform = Capacitor.getPlatform();
        if (platform !== 'web') {
          const permission = await Geolocation.checkPermissions();
          if (permission.location !== 'granted') {
            const request = await Geolocation.requestPermissions();
            if (request.location !== 'granted') return;
          }
        }
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        setUserCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
      } catch (err: any) {
        if (Capacitor.getPlatform() === 'web' || err.message?.includes('web')) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setUserCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {}
          );
        }
      }
    };
    fetchLocation();
  }, []);

  const handleSendMessage = async () => {
    const finalInput = input.trim();
    if (!finalInput || !user || isSending || hasReachedLimit) return;
    setInput('');
    setIsSending(true);
    try {
      await sendMessageToAgent(
        user.uid,
        departmentId || 'global',
        finalInput,
        undefined,
        userCoordinates,
        canonicalDepartmentId || undefined,
        language
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const userMessagesToday = messages.filter(msg => {
    if (msg.role !== 'user') return false;
    const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
    const today = new Date();
    return msgDate.getDate() === today.getDate() &&
      msgDate.getMonth() === today.getMonth() &&
      msgDate.getFullYear() === today.getFullYear();
  }).length;

  const hasReachedLimit = !isPremium && userMessagesToday >= 10;

  const getAgentIcon = () => {
    if (departmentId === 'amazonas') return 'nature_people';
    if (departmentId === 'valle-del-cauca') return 'waterfall_chart';
    return 'smart_toy';
  };

  const renderWidget = (widget: unknown, index: number) => {
    const normalized = normalizeChatWidget(widget);
    if (!normalized) return null;
    return (
      <ChatWidgetByType
        key={`${normalized.type}-${normalized.id}-${index}`}
        type={normalized.type}
        id={normalized.id}
      />
    );
  };

  const deptName = department?.name || 'Colombia';
  const texts = {
    title: assistant?.name || (department?.name
      ? (language === Language.Spanish ? `${t('chat.agentPrefix')} ${department.name}` : `${department.name} ${t('chat.agentSuffix')}`)
      : t('chat.loadingAgent')),
    online: t('chat.online'),
    placeholder: t('chat.placeholder'),
    welcome: t('chat.welcome', { dept: deptName }),
    limitReached: t('chat.limitReached'),
    upgrade: t('chat.goPremium'),
    limitReachedShort: t('chat.limitReachedShort'),
  };

  return (
    <div className="bg-background-dark font-display antialiased overflow-hidden h-screen flex flex-col text-content">
      <ChatHeader
        onBack={onBack}
        title={texts.title}
        onlineText={texts.online}
      />

      <ChatMessageList
        messages={messages}
        sessionStartTime={sessionStartTime.current}
        isSending={isSending}
        getAgentIcon={getAgentIcon}
        scrollRef={scrollRef}
        welcomeText={texts.welcome}
        renderWidget={renderWidget}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        isSending={isSending}
        hasReachedLimit={hasReachedLimit}
        handleSendMessage={handleSendMessage}
        onUpgrade={() => navigate('/premium')}
        texts={texts}
      />
    </div>
  );
};
