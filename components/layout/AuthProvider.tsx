import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, signInWithCredential, signInAnonymously, linkWithCredential, linkWithPopup, EmailAuthProvider } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { NEW_USER_IDENTITY_FIELDS, GUEST_USER_PROFILE_FIELDS } from '../../utils/userIdentity';
import { GUEST_HACKATHON_PREMIUM } from '../../utils/guestAccess';
import { deactivateEnvironmentalShield } from '../../services/environmentalShield';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginAsGuest: () => Promise<void>;
    linkGuestWithGoogle: () => Promise<void>;
    linkGuestWithEmail: (email: string, password: string) => Promise<void>;
    updateUserProfile: (name: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    signup: async () => { },
    logout: async () => { },
    loginWithGoogle: async () => { },
    loginAsGuest: async () => { },
    linkGuestWithGoogle: async () => { },
    linkGuestWithEmail: async () => { },
    updateUserProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const syncGuestToFirestore = async (user: User) => {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                await setDoc(userRef, {
                    email: '',
                    name: 'Guest Explorer',
                    displayName: 'Guest Explorer',
                    photoURL: user.photoURL ?? null,
                    createdAt: new Date().toISOString(),
                    ...GUEST_USER_PROFILE_FIELDS,
                    notificationPrefs: {
                        ferias: true,
                        paraisos: true,
                        noticias: true,
                        cupones: true,
                        ofertas: true,
                        seguridad: true,
                        vias: true,
                        itinerarios: true,
                        support: true,
                    },
                });
            }
        } catch (error) {
            console.error('Error syncing guest user to Firestore:', error);
            throw error;
        }
    };

    const syncUserToFirestore = async (user: User) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, 'users', user.uid), {
                    email: user.email,
                    name: user.displayName,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: new Date().toISOString(),
                    ...NEW_USER_IDENTITY_FIELDS,
                    notificationPrefs: {
                        ferias: true,
                        paraisos: true,
                        noticias: true,
                        cupones: true,
                        ofertas: true,
                        seguridad: true,
                        vias: true,
                        itinerarios: true,
                        support: true
                    },
                    pactAccepted: false
                });
            }
        } catch (error) {
            console.error("Error syncing user to Firestore:", error);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            console.error("Login Error:", error.code);
            throw error;
        }
    };

    const signup = async (email: string, password: string, name: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });

            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email,
                name,
                displayName: name,
                createdAt: new Date().toISOString(),
                ...NEW_USER_IDENTITY_FIELDS,
                notificationPrefs: {
                    ferias: true,
                    paraisos: true,
                    noticias: true,
                    cupones: true,
                    ofertas: true,
                    seguridad: true,
                    vias: true,
                    itinerarios: true,
                    support: true
                },
                pactAccepted: false
            });
        } catch (error: any) {
            console.error("Signup Error:", error.code);
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
                const result = await signInWithCredential(auth, credential);
                await syncUserToFirestore(result.user);
            } else {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await signInWithPopup(auth, provider);
                await syncUserToFirestore(result.user);
            }
        } catch (error: any) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    const finalizeGuestUpgrade = async (linkedUser: User) => {
        const userRef = doc(db, 'users', linkedUser.uid);
        const existing = await getDoc(userRef);
        const prev = existing.data();
        const prevName =
            typeof prev?.displayName === 'string' && prev.displayName.trim()
                ? prev.displayName.trim()
                : typeof prev?.name === 'string'
                  ? prev.name.trim()
                  : '';
        const keepCustomName = prevName.length > 0 && prevName !== 'Guest Explorer';
        const authName = linkedUser.displayName?.trim() || '';
        const displayName = keepCustomName ? prevName : authName || prevName || 'Explorer';

        if (!keepCustomName && displayName && linkedUser.displayName !== displayName) {
            await updateProfile(linkedUser, { displayName });
        }

        await setDoc(
            userRef,
            {
                email: linkedUser.email ?? '',
                name: displayName,
                displayName,
                ...(linkedUser.photoURL ? { photoURL: linkedUser.photoURL } : {}),
                isGuest: false,
                // Hackathon: keep Premium after linking; post-hackathon set GUEST_HACKATHON_PREMIUM=false
                ...(GUEST_HACKATHON_PREMIUM ? {} : { isPremium: false }),
            },
            { merge: true }
        );
    };

    const assertAnonymousGuest = () => {
        const current = auth.currentUser;
        if (!current?.isAnonymous) {
            throw new Error('NOT_GUEST');
        }
        return current;
    };

    const linkGuestWithGoogle = async () => {
        const current = assertAnonymousGuest();
        try {
            if (Capacitor.isNativePlatform()) {
                const googleUser = await GoogleAuth.signIn();
                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
                const result = await linkWithCredential(current, credential);
                await finalizeGuestUpgrade(result.user);
            } else {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await linkWithPopup(current, provider);
                await finalizeGuestUpgrade(result.user);
            }
            if (auth.currentUser) {
                setUser({ ...auth.currentUser });
            }
        } catch (error: unknown) {
            console.error('Guest Google link error:', error);
            throw error;
        }
    };

    const linkGuestWithEmail = async (email: string, password: string) => {
        const current = assertAnonymousGuest();
        try {
            const credential = EmailAuthProvider.credential(email.trim(), password);
            const result = await linkWithCredential(current, credential);
            await finalizeGuestUpgrade(result.user);
            if (auth.currentUser) {
                setUser({ ...auth.currentUser });
            }
        } catch (error: unknown) {
            console.error('Guest email link error:', error);
            throw error;
        }
    };

    const loginAsGuest = async () => {
        try {
            const userCredential = await signInAnonymously(auth);
            await syncGuestToFirestore(userCredential.user);
        } catch (error: unknown) {
            console.error('Guest Login Error:', error);
            throw error;
        }
    };

    const logout = async () => {
        if (auth.currentUser?.uid) {
            try {
                await deactivateEnvironmentalShield(auth.currentUser.uid);
            } catch (e) {
                console.warn('[Hidden Guard] Shield deactivate on logout failed:', e);
            }
        }
        await signOut(auth);
    };

    const updateUserProfile = async (name: string, photoURL?: string) => {
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
                displayName: name,
                photoURL: photoURL || auth.currentUser.photoURL
            });

            // Sync with Firestore
            await setDoc(doc(db, 'users', auth.currentUser.uid), {
                name,
                photoURL: photoURL || auth.currentUser.photoURL
            }, { merge: true });

            // Force refresh local state
            setUser({ ...auth.currentUser });
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, loginWithGoogle, loginAsGuest, linkGuestWithGoogle, linkGuestWithEmail, updateUserProfile }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
