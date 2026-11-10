/**
 * MTA University Library Collector
 * AdMob test IDs are used in development builds.
 * Production IDs are used only in production builds.
 */

const isDevelopment = import.meta.env.DEV;

const TEST_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  native: 'ca-app-pub-3940256099942544/2247696110',
} as const;

const PRODUCTION_IDS = {
  banner: 'ca-app-pub-8004171697196640/2718300620',
  interstitial: 'ca-app-pub-8004171697196640/7914786988',
  rewarded: 'ca-app-pub-8004171697196640/5893247972',
  native: 'ca-app-pub-8004171697196640/4855498479',
} as const;

export const ADMOB_AD_UNIT_IDS = isDevelopment
  ? TEST_IDS
  : PRODUCTION_IDS;

export const ADMOB_APP_ID = isDevelopment
  ? 'ca-app-pub-3940256099942544~3347511713'
  : 'ca-app-pub-8004171697196640~1872122819';
