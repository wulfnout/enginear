import type { ExpoConfig } from 'expo/config';

// EngiNear's own Expo project (separate from Clean Connect). Set EAS_PROJECT_ID once the project exists on expo.dev.
const PROJECT_ID = process.env.EAS_PROJECT_ID ?? '11b03f02-59c6-4a45-bacb-cc5d4dc0cf2f';

const config: ExpoConfig = {
  name: 'EngiNear',
  slug: 'enginear',
  owner: 'wulfnout',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'enginear',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'sdkVersion' },
  ...(PROJECT_ID ? { updates: { url: `https://u.expo.dev/${PROJECT_ID}` } } : {}),
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1D232B',
  },
  ios: {
    bundleIdentifier: 'com.enginear.app',
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'EngiNear uses your location to show mechanics and jobs near you.',
      NSCameraUsageDescription:
        'EngiNear uses the camera for your profile photo and identity verification.',
      NSPhotoLibraryUsageDescription:
        'EngiNear needs access to your photos to set your profile picture and upload your ID.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.enginear.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1D232B',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'POST_NOTIFICATIONS',
    ],
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '' },
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { image: './assets/splash.png', imageWidth: 220, backgroundColor: '#1D232B' },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'EngiNear uses your location to show mechanics and jobs near you.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'EngiNear needs access to your photos to set your profile picture and upload your ID.',
        cameraPermission:
          'EngiNear uses the camera for your profile photo and identity verification.',
      },
    ],
    [
      'expo-notifications',
      { icon: './assets/notification-icon.png', color: '#F97316' },
    ],
    [
      '@stripe/stripe-react-native',
      { merchantIdentifier: 'merchant.app.enginear', enableGooglePay: true },
    ],
  ],
  experiments: { typedRoutes: false },
  extra: {
    eas: PROJECT_ID ? { projectId: PROJECT_ID } : {},
  },
};

export default config;
