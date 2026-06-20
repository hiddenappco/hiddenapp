import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export async function deleteUserExpedition(expeditionId: string): Promise<void> {
    await deleteDoc(doc(db, 'expeditions', expeditionId));
}
