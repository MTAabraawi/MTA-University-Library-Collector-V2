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
  },
};

export default config;
