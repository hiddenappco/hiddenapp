import {
    BaseSessionService,
    createSession,
    type CreateSessionRequest,
    type DeleteSessionRequest,
    type GetSessionRequest,
    type ListSessionsRequest,
    type ListSessionsResponse,
    type Session,
} from '@google/adk';
import type { Event } from '@google/adk';
import { randomUUID } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { db } from '../../config/firebase';

const SESSIONS_COLLECTION = 'adk_sessions';
const EVENTS_SUBCOLLECTION = 'events';

/** Default cap of recent events loaded per session (keeps prompts bounded). */
const DEFAULT_RECENT_EVENTS = 40;

function sessionDocId(appName: string, userId: string, sessionId: string): string {
    return `${appName}__${userId}__${sessionId}`;
}

/**
 * Serializes an ADK Event for Firestore. Events contain nested arrays and
 * undefined values that Firestore rejects, so the payload is stored as a
 * single JSON string per event document.
 */
function serializeEvent(event: Event): string {
    return JSON.stringify(event);
}

function deserializeEvent(payload: string): Event {
    return JSON.parse(payload) as Event;
}

/**
 * ADK SessionService backed by Firestore.
 *
 * Layout:
 *   adk_sessions/{appName__userId__sessionId}        -> session metadata + state
 *   adk_sessions/{...}/events/{autoId}               -> one document per event
 *
 * Gives the chat agent native multi-turn memory (including prior tool calls)
 * that survives across Cloud Functions instances.
 */
export class FirestoreSessionService extends BaseSessionService {
    constructor(private readonly firestore: Firestore = db) {
        super();
    }

    async createSession({ appName, userId, state, sessionId }: CreateSessionRequest): Promise<Session> {
        const id = sessionId || randomUUID();
        const now = Date.now();

        const session = createSession({
            id,
            appName,
            userId,
            state: state ?? {},
            events: [],
            lastUpdateTime: now,
        });

        await this.firestore
            .collection(SESSIONS_COLLECTION)
            .doc(sessionDocId(appName, userId, id))
            .set({
                appName,
                userId,
                sessionId: id,
                state: JSON.stringify(session.state),
                lastUpdateTime: now,
            });

        return session;
    }

    async getSession({ appName, userId, sessionId, config }: GetSessionRequest): Promise<Session | undefined> {
        const docRef = this.firestore
            .collection(SESSIONS_COLLECTION)
            .doc(sessionDocId(appName, userId, sessionId));

        const snap = await docRef.get();
        if (!snap.exists) return undefined;

        const data = snap.data() as Record<string, unknown>;

        const numRecent = config?.numRecentEvents ?? DEFAULT_RECENT_EVENTS;
        const eventsSnap = await docRef
            .collection(EVENTS_SUBCOLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(numRecent)
            .get();

        let events = eventsSnap.docs
            .map((doc) => deserializeEvent(doc.data().payload as string))
            .reverse();

        if (config?.afterTimestamp) {
            events = events.filter((e) => e.timestamp >= config.afterTimestamp!);
        }

        let state: Record<string, unknown> = {};
        try {
            state = data.state ? (JSON.parse(data.state as string) as Record<string, unknown>) : {};
        } catch {
            state = {};
        }

        return createSession({
            id: sessionId,
            appName,
            userId,
            state,
            events,
            lastUpdateTime: (data.lastUpdateTime as number) || Date.now(),
        });
    }

    async listSessions({ appName, userId, limit }: ListSessionsRequest): Promise<ListSessionsResponse> {
        const snap = await this.firestore
            .collection(SESSIONS_COLLECTION)
            .where('appName', '==', appName)
            .where('userId', '==', userId)
            .get();

        let sessions = snap.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return createSession({
                    id: data.sessionId as string,
                    appName,
                    userId,
                    state: {},
                    events: [],
                    lastUpdateTime: (data.lastUpdateTime as number) || 0,
                });
            })
            .sort((a, b) => b.lastUpdateTime - a.lastUpdateTime);

        const totalItems = sessions.length;
        if (limit) sessions = sessions.slice(0, limit);

        return {
            sessions,
            page: 1,
            limit: limit ?? totalItems,
            totalItems,
            totalPages: totalItems > 0 ? 1 : 0,
        };
    }

    async deleteSession({ appName, userId, sessionId }: DeleteSessionRequest): Promise<void> {
        const docRef = this.firestore
            .collection(SESSIONS_COLLECTION)
            .doc(sessionDocId(appName, userId, sessionId));

        const eventsSnap = await docRef.collection(EVENTS_SUBCOLLECTION).get();
        const batch = this.firestore.batch();
        eventsSnap.docs.forEach((doc) => batch.delete(doc.ref));
        batch.delete(docRef);
        await batch.commit();
    }

    override async appendEvent({ session, event }: { session: Session; event: Event }): Promise<Event> {
        const appended = await super.appendEvent({ session, event });
        if (event.partial) return appended;

        const docRef = this.firestore
            .collection(SESSIONS_COLLECTION)
            .doc(sessionDocId(session.appName, session.userId, session.id));

        const now = Date.now();
        await Promise.all([
            docRef.collection(EVENTS_SUBCOLLECTION).add({
                timestamp: appended.timestamp ?? now,
                payload: serializeEvent(appended),
            }),
            docRef.set(
                {
                    appName: session.appName,
                    userId: session.userId,
                    sessionId: session.id,
                    state: JSON.stringify(session.state ?? {}),
                    lastUpdateTime: now,
                },
                { merge: true }
            ),
        ]);

        return appended;
    }
}

let sharedService: FirestoreSessionService | null = null;

/** Shared FirestoreSessionService instance for all chat sessions. */
export function getFirestoreSessionService(): FirestoreSessionService {
    if (!sharedService) {
        sharedService = new FirestoreSessionService();
    }
    return sharedService;
}
