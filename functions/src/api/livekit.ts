import { onRequest } from "firebase-functions/v2/https";
import { AccessToken } from "livekit-server-sdk";
import { db } from "../config/firebase";
import { resolveDepartmentContext } from "../lib/departmentProfile";
import { assertLiveCallQuota } from "../lib/liveCallQuota";

/**
 * generateLiveKitToken - "El Portero"
 * 
 * Generates a LiveKit access token for a user to join a voice/video room
 * with the Hyperlocal Agent. In production, this will gate on Premium status.
 * For development, access is open to all authenticated users.
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

            const { userId, userName, departmentId: incomingDepartmentId, userCoordinates, language: uiLanguage } = req.body;
            const appLanguage = uiLanguage === 'en' ? 'en' : 'es';

            if (!userId || !incomingDepartmentId) {
                res.status(400).json({ error: "Missing userId or departmentId" });
                return;
            }

            const quotaCheck = await assertLiveCallQuota(db, userId);
            if (!quotaCheck.allowed) {
                res.status(403).json({
                    error: "LIVE_QUOTA_EXCEEDED",
                    message: "Monthly live call limit reached",
                    resetAt: quotaCheck.resetAt,
                    remainingSeconds: 0,
                });
                return;
            }

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
            });

        } catch (error) {
            console.error("[LiveKit] CRITICAL ERROR:", error);
            res.status(500).json({
                error: `Error generating LiveKit token: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }
);
