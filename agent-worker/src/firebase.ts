/**
 * Firebase Admin initialization — shared across all agent-worker modules.
 * Must be imported before any Firestore access.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin only once
if (getApps().length === 0) {
    initializeApp({ projectId: 'gen-lang-client-0040858908' });
}

export const db: Firestore = getFirestore();
