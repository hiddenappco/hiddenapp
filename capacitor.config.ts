import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hidden.experience',
  appName: 'Hidden',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '189468820746-pdrjjpe3he0spuak4053qvu47mhhnhqp.apps.googleusercontent.com',
      clientId: '189468820746-pdrjjpe3he0spuak4053qvu47mhhnhqp.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    },
    // Android 15+ (targetSdk 35+) forces edge-to-edge with no opt-out: the WebView
    // draws behind the status/navigation bars. `insetsHandling: 'css'` makes
    // Capacitor read the real WindowInsets and inject them as `--safe-area-inset-*`
    // CSS variables (index.css exposes them as `--safe-top` / `--safe-bottom`).
    SystemBars: {
      insetsHandling: 'css'
    },
    // Still required on Android <= 14 (or 15 with edge-to-edge opted out) where
    // SystemBars alone doesn't control the WebView/status-bar overlay behavior.
    StatusBar: {
      overlaysWebView: true
    }
  }
};

export default config;
