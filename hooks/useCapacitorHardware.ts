import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { runBackHandlers } from '../services/hardwareBackStack';

export const useCapacitorHardware = (user: any, menuOpen: boolean, setMenuOpen: (open: boolean) => void) => {
    const location = useLocation();
    const navigate = useNavigate();

    const stateRef = useRef({
        user,
        pathname: location.pathname,
        menuOpen,
        navigate,
        setMenuOpen,
    });
    stateRef.current = {
        user,
        pathname: location.pathname,
        menuOpen,
        navigate,
        setMenuOpen,
    };

    // Initialize Google Auth for Mobile
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const initGoogle = async () => {
                try {
                    await GoogleAuth.initialize({
                        clientId: '189468820746-pdrjjpe3he0spuak4053qvu47mhhnhqp.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true,
                    });
                } catch (error) {
                    console.error("Google Auth Init Error:", error);
                }
            };
            initGoogle();
        }
    }, []);

    // Hardware back: overlay handlers first, then menu, then route history
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let listenerHandle: { remove: () => void } | undefined;

        CapacitorApp.addListener('backButton', () => {
            if (runBackHandlers()) return;

            const { user: u, pathname, menuOpen: menu, navigate: nav, setMenuOpen: setMenu } = stateRef.current;

            if (!u && (pathname === '/login' || pathname === '/')) {
                CapacitorApp.exitApp();
                return;
            }
            if (u && pathname === '/home') {
                CapacitorApp.minimizeApp();
                return;
            }
            if (menu) {
                setMenu(false);
                return;
            }
            nav(-1);
        }).then((handle) => {
            listenerHandle = handle;
        });

        return () => {
            listenerHandle?.remove();
        };
    }, [navigate]);
};
