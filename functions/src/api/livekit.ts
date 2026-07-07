import { onRequest } from "firebase-functions/v2/https";
import { AccessToken } from "livekit-server-sdk";
import { db } from "../config/firebase";
import { resolveDepartmentContext } from "../lib/departmentProfile";
import { assertLiveCallQuota, addLiveCallSecondsAdmin } from "../lib/liveCallQuota";
import { hasActivePremium } from "../lib/premiumAccess";
import { AuthError, requireAuthUid } from "../lib/verifyAuth";

/**
 * generateLiveKitToken - "El Portero"
 * 
 * Generates a LiveKit access token for a user to join a voice/video room
 * with the Hyperlocal Agent. In production, this will gate on Premium status.
 * Premium users: 30 min / 30 d rolling window.
 * Free registered users: one-time 5 min trial (`liveTrialUsedSeconds`).
 * Guests (`isGuest`): Free tier — same trial/limits as registered Free users.
 */
export const generateLiveKitToken = onRequest(
    {
        cors: true,
        timeoutSeconds: 30,
        memory: "256MiB",
        secrets: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
    },
    async (req, res) => {
        try {
            res.set('Access-Control-Allow-Origin', '*');

            // Identity comes from the verified Firebase ID token, never the body,
            // so a client cannot mint a token for another UID or bypass quota.
            let userId: string;
            try {
                userId = await requireAuthUid(req);
            } catch (err) {
                if (err instanceof AuthError) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                throw err;
            }

            const { userName, departmentId: incomingDepartmentId, userCoordinates, language: uiLanguage } = req.body;
            const appLanguage = uiLanguage === 'en' ? 'en' : 'es';

            if (!incomingDepartmentId) {
                res.status(400).json({ error: "Missing departmentId" });
                return;
            }

            const userSnap = await db.collection("users").doc(userId).get();
            const userData = userSnap.data() ?? {};
            const quotaCheck = await assertLiveCallQuota(db, userId);

            if (!quotaCheck.allowed) {
                const errorCode = quotaCheck.reason ?? "LIVE_QUOTA_EXCEEDED";
                res.status(403).json({
                    error: errorCode,
                    message:
                        errorCode === "PREMIUM_REQUIRED"
                            ? "Live voice requires Premium or trial minutes"
                            : "Monthly live call limit reached",
                    resetAt: quotaCheck.resetAt || undefined,
                    remainingSeconds: 0,
                    isTrial: quotaCheck.isTrial,
                });
                return;
            }

            const isTrial = quotaCheck.isTrial && !hasActivePremium(userData);

            const { canonicalId } = await resolveDepartmentContext(db, incomingDepartmentId);
            const departmentId = canonicalId;

            const apiKey = process.env.LIVEKIT_API_KEY?.trim();
            const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
            const livekitUrl = "wss://hidden-app-ldi9dhb5.livekit.cloud";

            if (!apiKey || !apiSecret) {
                console.error("[LiveKit] Missing API credentials");
                res.status(500).json({ error: "Server misconfigured: Missing LiveKit credentials" });
                return;
            }

            // Generate a unique room name per session
            const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const roomName = `live-${departmentId}-${sessionId}`;

            const hasGps =
                userCoordinates &&
                typeof userCoordinates.lat === "number" &&
                typeof userCoordinates.lng === "number";
            console.log(
                `[LiveKit] Generating token for user ${userId} | raw: ${incomingDepartmentId} | canonical: ${departmentId} | Room: ${roomName} | Lang: ${appLanguage} | GPS: ${hasGps ? `${userCoordinates.lat},${userCoordinates.lng}` : "NONE"}`
            );

            // Create access token
            const at = new AccessToken(apiKey, apiSecret, {
                identity: userId,
                name: userName || "Explorer",
                ttl: "2h", // Session max duration
                metadata: JSON.stringify({
                    departmentId,
                    language: appLanguage,
                    userCoordinates: userCoordinates || null,
                }),
            });

            at.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
            });

            const token = await at.toJwt();

            console.log(`[LiveKit] Token generated successfully for room: ${roomName}`);

            res.status(200).json({
                success: true,
                token,
                livekitUrl,
                roomName,
                remainingSeconds: quotaCheck.remainingSeconds,
                isTrial,
                limitSeconds: quotaCheck.limitSeconds,
            });

        } catch (error) {
            console.error("[LiveKit] CRITICAL ERROR:", error);
            res.status(500).json({
                error: `Error generating LiveKit token: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }
);

/**
 * recordLiveCallSeconds - server-side usage accounting for the Live voice agent.
 *
 * The client reports elapsed seconds; the UID is taken from the verified Firebase
 * ID token (never the body) and usage is written with the Admin SDK, so a client
 * cannot reset or under-report its own quota by writing to Firestore directly.
 */
export const recordLiveCallSeconds = onRequest(
    {
        cors: true,
        timeoutSeconds: 20,
        memory: "256MiB",
    },
    async (req, res) => {
        try {
            res.set('Access-Control-Allow-Origin', '*');

            let userId: string;
            try {
                userId = await requireAuthUid(req);
            } catch (err) {
                if (err instanceof AuthError) {
                    res.status(401).json({ error: "Unauthorized" });
                    return;
                }
                throw err;
            }

            const seconds = Number(req.body?.seconds);
            if (!Number.isFinite(seconds) || seconds <= 0) {
                res.status(400).json({ error: "INVALID_SECONDS" });
                return;
            }

            await addLiveCallSecondsAdmin(db, userId, seconds);
            res.status(200).json({ success: true });
        } catch (error) {
            console.error("[recordLiveCallSeconds] ERROR:", error);
            res.status(500).json({ error: "RECORD_FAILED" });
        }
    }
);
