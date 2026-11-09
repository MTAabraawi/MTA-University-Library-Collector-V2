/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CapacitorConfig } from '@capacitor/cli';

// Optional live backend for development/QA builds. Production APKs should
// normally bundle the web build and talk to the same origin configured at
// build time through VITE_API_BASE_URL.
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.mtatechnologies.universitylibrarycollector',
  appName: 'MTA University Library Collector',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false, // Enforce HTTPS security
    ...(serverUrl
      ? {
          url: serverUrl,
          // Allow cleartext only when an operator explicitly points the app at
          // a local HTTP origin (for example an emulator host).
          cleartext: serverUrl.startsWith('http://'),
        }
      : {}),
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#070e1c',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#d97706',
    },
    // AdMob and Firebase Analytics placeholders (disabled by default until configured)
    AdMob: {
      appId: 'ca-app-pub-3940256099942544~3347511713', // Google Official Test App ID
      bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111', // Google Test Banner
      interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
      rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
      testingDevices: ['EMULATOR'],
      initializeForTesting: true,
      enabled: false, // Strictly disabled by default
    },
    FirebaseAnalytics: {
      enabled: false,
    },
  },
};

export default config;
