import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.phototextscanner',
  appName: 'Photo Text Scanner',
  webDir: 'dist/spa',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      allowEditing: false
    }
  }
};

export default config;
