import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Purchases, CustomerInfo, PurchasesPackage, PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { useAuth } from './AuthProvider';
import { useUserProfile } from '../../hooks/useFirestore';
import { getIdentityFromProfile } from '../../utils/userIdentity';
import { grantPremiumInFirestore } from '../../services/userPremiumSync';

// RevenueCat Settings
const REVENUE_CAT_API_KEY = 'test_GmfPZmjLYSOycvzCYPiEbqEraLE';
const PREMIUM_ENTITLEMENT_ID = 'Hidden App Premium';

interface RevenueCatContextType {
    customerInfo: CustomerInfo | null;
    isPremium: boolean;
    offerings: PurchasesOffering[] | null;
    purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
    restorePurchases: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType>({
    customerInfo: null,
    isPremium: false,
    offerings: null,
    purchasePackage: async () => false,
    restorePurchases: async () => { },
});

export const useRevenueCat = () => useContext(RevenueCatContext);

export const RevenueCatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { data: profile } = useUserProfile(user?.uid);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [offerings, setOfferings] = useState<PurchasesOffering[] | null>(null);

    /** Firestore users/{uid}.isPremium is the source of truth (Rowy toggle / admin grant). */
    const isPremium = useMemo(
        () => getIdentityFromProfile(profile).isPremium,
        [profile]
    );

    const updateCustomerStatus = useCallback((info: CustomerInfo) => {
        setCustomerInfo(info);
        const hasStorePremium = info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
        if (hasStorePremium && user?.uid) {
            grantPremiumInFirestore(user.uid).catch((err) =>
                console.error('Failed to grant isPremium in Firestore:', err)
            );
        }
    }, [user?.uid]);

    const initializeRevenueCat = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) {
            console.log("RevenueCat: Skipping initialization on non-native platform.");
            return;
        }

        try {
            await Purchases.configure({
                apiKey: REVENUE_CAT_API_KEY,
            });

            if (user) {
                await Purchases.logIn({ appUserID: user.uid });
            }

            const { customerInfo: info } = await Purchases.getCustomerInfo();
            updateCustomerStatus(info);

            await Purchases.addCustomerInfoUpdateListener((update) => {
                updateCustomerStatus(update);
            });

            const availableOfferings = await Purchases.getOfferings();
            if (availableOfferings.current) {
                setOfferings(availableOfferings.current.availablePackages);
            }

        } catch (error) {
            console.error("RevenueCat Init Error:", error);
        }
    }, [user, updateCustomerStatus]);

    useEffect(() => {
        initializeRevenueCat();
    }, [initializeRevenueCat]);

    const purchasePackage = async (pkg: PurchasesPackage) => {
        try {
            const { customerInfo: updatedInfo } = await Purchases.purchasePackage({ aPackage: pkg });
            updateCustomerStatus(updatedInfo);
            return true;
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error("Purchase Error:", error);
            }
            return false;
        }
    };

    const restorePurchases = async () => {
        try {
            const { customerInfo: restoredInfo } = await Purchases.restorePurchases();
            updateCustomerStatus(restoredInfo);
        } catch (error) {
            console.error("Restore Error:", error);
        }
    };

    return (
        <RevenueCatContext.Provider value={{ customerInfo, isPremium, offerings, purchasePackage, restorePurchases }}>
            {children}
        </RevenueCatContext.Provider>
    );
};
