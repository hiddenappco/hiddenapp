import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
}

export const db = admin.firestore();
export const adminAuth = admin.auth();
export const storage = admin.storage();
export { admin };
