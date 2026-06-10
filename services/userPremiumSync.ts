import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/** Grants Premium in Firestore after a verified store purchase/restore. */
export async function grantPremiumInFirestore(uid: string): Promise<void> {
    await setDoc(
        doc(db, 'users', uid),
        { isPremium: true },
        { merge: true }
    );
}
