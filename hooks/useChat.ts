import { useState, useEffect } from 'react';
import {
    doc,
    getDoc,
    onSnapshot,
    query,
    collection,
    orderBy,
    serverTimestamp,
    addDoc,
    getFirestore
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { getAuthHeaders } from '../services/authHeaders';
import { getAssistantDocId, resolveEffectiveDepartmentId } from '../utils/departmentIds';

export const useAssistant = (id: string | undefined) => {
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const docId = getAssistantDocId(resolveEffectiveDepartmentId(id));
        const docRef = doc(db, 'assistants', docId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setData({ id: docSnap.id, ...docSnap.data() });
            } else {
                setData(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error listening to assistant:", err);
            setData(null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    return { data, loading };
};

/**
 * Hook to listen to chat messages in real-time
 */
export const useChatMessages = (userId: string | undefined, chatId: string | undefined) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !chatId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'users', userId, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setMessages(items);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching chat messages:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, chatId]);

    return { messages, loading };
};

/**
 * Utility to send a message to the AI Agent
 */
export const sendMessageToAgent = async (
    userId: string,
    departmentId: string,
    message: string,
    chatId?: string,
    userCoordinates?: { lat: number, lng: number } | null,
    canonicalDepartmentId?: string,
    language?: 'es' | 'en'
) => {
    const CLOUD_FUNCTION_URL = 'https://chatagent-gyrowwrjfq-uc.a.run.app';
    const agentDepartmentId = canonicalDepartmentId || departmentId;
    const effectiveChatId = chatId || departmentId;
    const db = getFirestore();

    try {
        await addDoc(collection(db, 'users', userId, 'chats', effectiveChatId, 'messages'), {
            role: 'user',
            content: message,
            createdAt: serverTimestamp()
        });

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                userId,
                departmentId: agentDepartmentId,
                message,
                chatId: effectiveChatId,
                coordinates: userCoordinates || null,
                language: language === 'en' ? 'en' : 'es',
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to communicate with AI Agent');
        }

        return await response.json();
    } catch (err) {
        console.error("sendMessageToAgent Error:", err);
        throw err;
    }
};
