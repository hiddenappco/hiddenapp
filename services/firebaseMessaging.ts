import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "./firebase";
import { registerFcmToken } from "../hooks/useFirestore";

const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const requestNotificationPermission = async (userId: string) => {
    if (!messaging) return;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });
            if (token) {
                await registerFcmToken(userId, token);
                console.log("FCM Token registered");
            }
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            console.log("Message received: ", payload);
            resolve(payload);
        });
    });
