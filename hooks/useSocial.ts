import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    Timestamp,
    doc,
    getDoc,
    deleteDoc,
    onSnapshot,
    arrayUnion,
    setDoc,
    updateDoc,
    serverTimestamp,
    limit,
    writeBatch
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { extractRawIsPremium, normalizeIsPremium } from '../utils/userIdentity';

import { Department, Destination, AppEvent, Coupon, NewsArticle } from '../types/content';
import { UserProfile, TicketMessage, SupportTicket } from '../types/social';

// --- FAVORITES SYSTEM ---

const getSavedCollectionName = (type: string) => {
    switch (type) {
        case 'destination': return 'saved_destinations';
        case 'coupon': return 'saved_coupons';
        case 'fair': return 'saved_fairs';
        case 'refugio': return 'saved_refugios';
        default: return 'saved_items';
    }
};

/**
 * Hook to listen to user's favorites of a specific type
 */
export const useUserFavorites = (userId: string | undefined, type: string) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const colName = getSavedCollectionName(type);
        const q = query(
            collection(db, 'users', userId, colName),
            orderBy('savedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setData(items);
            setLoading(false);
        }, (err) => {
            console.error(`Error loading favorites for ${type}:`, err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, type]);

    return { data, loading };
};

/**
 * Utility to toggle favorite status
 */
export const toggleFavorite = async (userId: string, itemId: string, type: string, itemData?: any) => {
    const colName = getSavedCollectionName(type);
    const favRef = doc(db, 'users', userId, colName, itemId);

    const snap = await getDoc(favRef);
    if (snap.exists()) {
        await deleteDoc(favRef);
        return false;
    } else {
        await setDoc(favRef, {
            itemId,
            type,
            savedAt: serverTimestamp(),
            ...itemData
        });
        return true;
    }
};

/**
 * Hook to check if a specific item is favorited
 */
export const useIsFavorite = (userId: string | undefined, itemId: string | undefined, type?: string) => {
    const [isSaved, setIsSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !itemId) {
            setIsSaved(false);
            setLoading(false);
            return;
        }

        if (type) {
            const colName = getSavedCollectionName(type);
            const docRef = doc(db, 'users', userId, colName, itemId);

            const unsubscribe = onSnapshot(docRef, (snap) => {
                setIsSaved(snap.exists());
                setLoading(false);
            }, (error) => {
                console.error(`Error checking favorite for ${type}:`, error);
                setLoading(false);
            });

            return () => unsubscribe();
        }

        const favoriteCollections = ['saved_destinations', 'saved_coupons', 'saved_fairs', 'saved_refugios', 'saved_items'];
        const snapshots: { [key: string]: boolean } = {};

        const unsubs = favoriteCollections.map(col => {
            const docRef = doc(db, 'users', userId, col, itemId);
            return onSnapshot(docRef, (snap) => {
                snapshots[col] = snap.exists();
                const isAnyFavorited = Object.values(snapshots).some(v => v === true);
                setIsSaved(isAnyFavorited);
                setLoading(false);
            }, (error) => {
                console.error(`Error checking favorite in ${col}:`, error);
                snapshots[col] = false;
                const isAnyFavorited = Object.values(snapshots).some(v => v === true);
                setIsSaved(isAnyFavorited);
            });
        });

        return () => unsubs.forEach(unsub => unsub());
    }, [userId, itemId, type]);

    return { isSaved, loading };
};


export const useUserProfile = (userId: string | undefined) => {
    const [data, setData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setData(null);
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const raw = docSnap.data() as Record<string, unknown>;
                setData({
                    uid: docSnap.id,
                    ...raw,
                    userType: raw.userType ?? raw.UserType ?? raw.user_type,
                    isPremium: normalizeIsPremium(extractRawIsPremium(raw), raw.role),
                } as UserProfile);
            } else {
                setData(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error listening to user profile:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { data, loading };
};

export const toggleDestinationActivity = async (userId: string, destinationId: string, activityIndex: number, isCurrentlyCompleted: boolean) => {
    if (!userId || !destinationId) return;

    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const completedActivities = userData.completedActivities || {};
            let destinationActivities = completedActivities[destinationId] || [];

            if (isCurrentlyCompleted) {
                destinationActivities = destinationActivities.filter((idx: number) => idx !== activityIndex);
            } else {
                if (!destinationActivities.includes(activityIndex)) {
                    destinationActivities.push(activityIndex);
                }
            }

            await updateDoc(userRef, {
                [`completedActivities.${destinationId}`]: destinationActivities
            });
        }
    } catch (err) {
        console.error("Error toggling activity:", err);
    }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    const updateData = {
        ...data,
        updatedAt: Timestamp.now()
    };

    if (docSnap.exists()) {
        await updateDoc(userRef, updateData);
    } else {
        await setDoc(userRef, updateData);
    }
};

// --- SUPPORT TICKETS ---



export const useSupportTickets = (userId: string | undefined) => {
    const [data, setData] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'support_tickets'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tickets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SupportTicket));
            setData(tickets);
            setLoading(false);
        }, (err) => {
            console.error("Error listening to support tickets:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { data, loading };
};

export const useSupportTicket = (ticketId: string | null) => {
    const [data, setData] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!ticketId) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const docRef = doc(db, 'support_tickets', ticketId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setData({ id: docSnap.id, ...docSnap.data() } as SupportTicket);
            } else {
                setData(null);
            }
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [ticketId]);

    return { data, loading };
}

export const startSupportTicket = async (userId: string, userName: string, ticketData: { topic: string, subject: string, message: string }) => {
    const ticketRef = doc(collection(db, 'support_tickets'));
    const now = Timestamp.now();

    const initialMessage: TicketMessage = {
        sender: 'user',
        text: ticketData.message,
        timestamp: now
    };

    await setDoc(ticketRef, {
        userId,
        userName,
        topic: ticketData.topic,
        subject: ticketData.subject,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        messages: [initialMessage]
    });

    return ticketRef.id;
};

export const sendTicketReply = async (ticketId: string, text: string, isCustomer: boolean = true) => {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    const now = Timestamp.now();

    const newMessage: TicketMessage = {
        sender: isCustomer ? 'user' : 'support',
        text,
        timestamp: now
    };

    await updateDoc(ticketRef, {
        messages: arrayUnion(newMessage),
        updatedAt: now,
        status: isCustomer ? 'customer-replied' : 'replied'
    });
};

export const markTicketAsRead = async (ticketId: string) => {
    const ticketRef = doc(db, 'support_tickets', ticketId);
    await updateDoc(ticketRef, {
        hasUnreadMessages: false
    });
};

// --- NOTIFICATIONS ---

export const useNotifications = (userId: string | undefined, limitCount: number = 20) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'users', userId, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setData(notifications);
            setLoading(false);
        }, (err) => {
            console.error("Error listening to notifications:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { data, loading };
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
};

export const markAllNotificationsAsRead = async (userId: string, notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    const batch = writeBatch(db);
    notificationIds.forEach(id => {
        const ref = doc(db, 'users', userId, 'notifications', id);
        batch.update(ref, { read: true });
    });
    await batch.commit();
};

export const registerFcmToken = async (userId: string, token: string) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { fcmToken: token });
};

export const updateNotificationPrefs = async (userId: string, prefs: any) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { notificationPrefs: prefs });
};
