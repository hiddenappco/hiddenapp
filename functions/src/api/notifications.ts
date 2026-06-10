import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, admin } from "../config/firebase";
import { getWeatherData, getGoogleAirQuality, getOpenMeteoAirQuality, getOpenMeteoCloudCover } from "./weather";

async function sendSmartNotification(
    preferenceKey: string,
    title: string,
    body: string,
    type: 'promo' | 'system' | 'news' | 'support',
    link?: string,
    targetUserId?: string
) {
    if (targetUserId) {
        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) return;

        const userData = userDoc.data() || {};
        const userPrefs = userData.notificationPrefs || userData.notifications || {};
        const isEnabled = userPrefs[preferenceKey] !== false;

        if (isEnabled) {
            await db.collection('users').doc(targetUserId).collection('notifications').add({
                title,
                body,
                type,
                link: link || null,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            if (userData.fcmToken) {
                try {
                    const message = {
                        notification: { title, body },
                        data: { link: link || '/home' },
                        token: userData.fcmToken
                    };
                    await admin.messaging().send(message);
                    console.log(`FCM targeted sent to ${targetUserId}`);
                } catch (error) {
                    console.error(`Error sending targeted FCM to ${targetUserId}:`, error);
                }
            }
        }
        return;
    }

    const usersSnap = await db.collection('users').get();
    const batch = db.batch();
    const fcmTokens: string[] = [];

    await Promise.all(usersSnap.docs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;

        const userPrefs = userData.notificationPrefs || userData.notifications || {};
        const isEnabled = userPrefs[preferenceKey] !== false;

        if (isEnabled) {
            const notifRef = db.collection('users').doc(userId).collection('notifications').doc();
            batch.set(notifRef, {
                title,
                body,
                type,
                link: link || null,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            if (userData.fcmToken) {
                fcmTokens.push(userData.fcmToken);
            }
        }
    }));

    if ((batch as any)._ops.length > 0) {
        await batch.commit();
        console.log(`In-App broadcast batched for ${preferenceKey}`);
    }

    if (fcmTokens.length > 0) {
        try {
            const message = {
                notification: { title, body },
                data: { link: link || '/home' },
                tokens: fcmTokens
            };
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`FCM broadcast sent: ${response.successCount} successes`);
        } catch (error) {
            console.error("Error sending FCM broadcast:", error);
        }
    }
}

const checkAndNotify = async (
    event: any,
    fieldNames: string[],
    prefKey: string,
    titleGenerator: (data: any, validName: string) => string,
    bodyGenerator: (data: any, validName: string) => string,
    type: 'promo' | 'system' | 'news' | 'support',
    linkGenerator: (id: string) => string
) => {
    const newData = event.data?.after.data();

    if (!newData) return;
    if (newData._notificationSent === true) return;

    let validValue = '';
    for (const field of fieldNames) {
        if (newData[field] && typeof newData[field] === 'string') {
            const val = newData[field].trim();
            if (val !== '' && val.toLowerCase() !== 'undefined' && val.toLowerCase() !== 'sin título') {
                validValue = val;
                break;
            }
        }
    }

    if (!validValue) return; 

    await sendSmartNotification(
        prefKey,
        titleGenerator(newData, validValue),
        bodyGenerator(newData, validValue),
        type,
        linkGenerator(event.params.id)
    );

    return event.data?.after.ref.update({ _notificationSent: true });
};

export const onNewDestination = onDocumentUpdated("destinations/{id}", async (event) => {
    const newData = event.data?.after.data();
    if (!newData || newData._notificationSent === true) return;

    let departmentName = 'Colombia';
    if (newData.departmentId) {
        try {
            const deptDoc = await db.collection('departments').doc(newData.departmentId).get();
            if (deptDoc.exists) {
                departmentName = deptDoc.data()?.name || newData.departmentId;
            }
        } catch (error) {
            console.error("Error fetching department name for notification:", error);
        }
    }

    await checkAndNotify(
        event,
        ["title", "tittle", "name"], 
        "paraisos",
        () => "Nuevo Paraíso Escondido 🌿",
        (data, name) => `Descubre ${name} en ${departmentName}.`,
        "news",
        (id) => `/destination/${id}`
    );
});

export const onNewNews = onDocumentUpdated("News/{id}", async (event) => {
    await checkAndNotify(
        event,
        ["title", "tittle"],
        "noticias",
        (data, title) => title,
        (data) => data.summary || "Nueva noticia de interés para ti.",
        "news",
        (id) => `/news/${id}`
    );
});

export const onNewCoupon = onDocumentUpdated("Coupons/{id}", async (event) => {
    const newData = event.data?.after.data();
    if (!newData) return;

    const isOffer = newData.isPremium || newData.discount?.includes('%');
    const prefKey = isOffer ? "ofertas" : "cupones";

    await checkAndNotify(
        event,
        ["title", "tittle", "name"],
        prefKey,
        (data) => isOffer ? "¡Oferta Especial! 🔥" : "Nuevo Cupón Disponible 🎟️",
        (data, title) => `${data.discount} en ${title}`,
        "promo",
        (id) => `/coupons/${id}`
    );
});

export const onNewEvent = onDocumentUpdated("Events/{id}", async (event) => {
    await checkAndNotify(
        event,
        ["name", "title", "tittle"], 
        "ferias",
        () => "Fiesta en Camino 🎉",
        (data, name) => `${name} comenzará pronto en ${data.location || 'Colombia'}.`,
        "system",
        (id) => `/calendar/${id}`
    );
});

export const supportTicketReply = onDocumentUpdated("support_tickets/{ticketId}", async (event) => {
    const newValue = event.data?.after.data();
    const previousValue = event.data?.before.data();

    if (!newValue || !previousValue) return;

    const newReply = newValue.adminReplyInput;
    const oldReply = previousValue.adminReplyInput;

    if (newReply && newReply !== oldReply) {
        const adminMessage = {
            sender: 'support',
            text: newReply,
            timestamp: admin.firestore.Timestamp.now()
        };

        await event.data?.after.ref.update({
            messages: admin.firestore.FieldValue.arrayUnion(adminMessage),
            adminReplyInput: null, 
            status: 'replied',
            hasUnreadMessages: true,
            updatedAt: admin.firestore.Timestamp.now()
        });

        console.log(`Auto-replied to ticket ${event.params.ticketId}`);

        if (newValue.userId) {
            await sendSmartNotification(
                'support',
                "Nueva respuesta de soporte",
                `Se ha respondido a tu solicitud: ${newValue.subject || 'Soporte'}`,
                'support',
                '/support',
                newValue.userId
            );
        }
    }
});

export const scheduledEnvironmentalMonitor = onSchedule({
    schedule: "every 15 minutes",
    secrets: ["GOOGLE_MAPS_API_KEY", "GEMINI_API_KEY", "ACCUWEATHER_API_KEY", "STORMGLASS_API_KEY"]
}, async (event) => {
    console.log("[Master Step] Starting environmental scan...");
    const usersSnap = await db.collection('users').where('activeMonitor.isActive', '==', true).get();

    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const monitor = userData.activeMonitor || {};
        const destinationId = monitor.destinationId || userData.activeDestinationId;

        if (!destinationId) continue;

        const expiresAt = monitor.expiresAt;
        if (expiresAt?.toDate && expiresAt.toDate() < new Date()) {
            await userDoc.ref.update({
                activeMonitor: {
                    isActive: false,
                    destinationId: null,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: null,
                },
                earlyAlert: false,
                activeDestinationId: null,
            });
            continue;
        }

        const destDoc = await db.collection('destinations').doc(destinationId).get();
        if (!destDoc.exists) continue;

        const destData = destDoc.data();
        const coords = destData?.coordinates;

        if (!coords?.lat || !coords?.lng) continue;

        const [weather, googleAqi, openMeteoAqi] = await Promise.all([
            getWeatherData(coords.lat, coords.lng),
            getGoogleAirQuality(coords.lat, coords.lng),
            getOpenMeteoAirQuality(coords.lat, coords.lng),
            getOpenMeteoCloudCover(coords.lat, coords.lng)
        ]);

        if (!weather) continue;

        const aqiValue = openMeteoAqi ?? googleAqi?.indexes?.[0]?.aqi ?? null;
        const uvIndex = weather?.uvIndex ?? null;
        const rainProb = weather?.precipitation?.probability ?? null;

        let alertTitle = "";
        let alertBody = "";

        if (rainProb > 70) {
            alertTitle = "⚠️ Hidden Guard: Alerta de Lluvia";
            alertBody = `Se detecta un ${rainProb}% de prob. de lluvia en ${destData?.title}. ¡Lleva impermeable!`;
        } else if (aqiValue > 100) {
            alertTitle = "⚠️ Calidad del Aire Crítica";
            alertBody = `La calidad del aire en ${destData?.title} es deficiente (${aqiValue}). Evita esfuerzos físicos.`;
        } else if (uvIndex > 8) {
            alertTitle = "☀️ Radiación UV Extrema";
            alertBody = `Índice UV de ${uvIndex} en ${destData?.title}. Usa protección solar alta obligatoria.`;
        }

        if (alertTitle) {
            const alertType = rainProb > 70 ? 'rain' : aqiValue > 100 ? 'aqi' : 'uv';
            const lastAlert = userData.lastEnvironmentalAlert || {};
            const sameType = lastAlert.type === alertType;
            const lastAt = lastAlert.sentAt?.toDate?.() || new Date(0);
            const hoursSince = (Date.now() - lastAt.getTime()) / (1000 * 60 * 60);
            if (sameType && hoursSince < 3) {
                continue;
            }

            await sendSmartNotification(
                'seguridad',
                alertTitle,
                alertBody,
                'system',
                `/environmental-monitor`,
                userId
            );

            await userDoc.ref.update({
                lastEnvironmentalAlert: {
                    type: alertType,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            });

            console.log(`[Master Step] Alert sent to ${userId} for ${destData?.title}`);
        }
    }
});
