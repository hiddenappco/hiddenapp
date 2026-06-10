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
    }
  }
};

export default config;
