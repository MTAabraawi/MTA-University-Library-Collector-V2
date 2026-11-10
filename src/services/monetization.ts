import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import { FirebaseAnalytics } from '@capacitor-community/firebase-analytics';

let admobInitialized = false;
let servicesInitialized = false;
let analyticsConsentApplied = false;

export async function initializeAppServices(): Promise<void> {
  if (servicesInitialized) return;
  servicesInitialized = true;

  // Analytics stays disabled until the app obtains the user's privacy choice.
  let analyticsAllowed = false;
  try {
    analyticsAllowed = localStorage.getItem('mta_analytics_consent') === 'granted';
  } catch {
    // If local storage is unavailable, optional analytics remain disabled.
  }

  analyticsConsentApplied = false;
  try {
    await FirebaseAnalytics.setCollectionEnabled({ enabled: analyticsAllowed });
    analyticsConsentApplied = analyticsAllowed;
  } catch (error) {
    analyticsConsentApplied = false;
    console.warn('[MTA] Firebase Analytics setup skipped:', error);
  }

  // AdMob is available only in native Android/iOS builds.
  if (!Capacitor.isNativePlatform() || admobInitialized) return;

  try {
    let consentInfo = await AdMob.requestConsentInfo();

    if (
      consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdmobConsentStatus.REQUIRED
    ) {
      consentInfo = await AdMob.showConsentForm();
    }

    if (!consentInfo.canRequestAds) {
      console.info('[MTA] AdMob ads are not allowed by the current consent state.');
      return;
    }

    await AdMob.initialize();
    admobInitialized = true;
    console.info('[MTA] AdMob initialized successfully.');
  } catch (error) {
    console.warn('[MTA] AdMob initialization failed; app startup will continue:', error);
  }
}

export async function setAnalyticsConsent(accepted: boolean): Promise<void> {
  // Persist the choice first. If storage fails, do not enable optional analytics.
  try {
    localStorage.setItem('mta_analytics_consent', accepted ? 'granted' : 'denied');
  } catch (error) {
    throw new Error('Could not save the privacy preference.', { cause: error });
  }

  analyticsConsentApplied = false;
  try {
    await FirebaseAnalytics.setCollectionEnabled({ enabled: accepted });
    analyticsConsentApplied = accepted;
  } catch (error) {
    analyticsConsentApplied = false;
    console.warn('[MTA] Could not update Analytics consent:', error);
    throw error;
  }
}

export async function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  // Never record optional events unless the user explicitly granted consent.
  try {
    if (!analyticsConsentApplied || localStorage.getItem('mta_analytics_consent') !== 'granted') return;
  } catch {
    return;
  }

  try {
    await FirebaseAnalytics.logEvent({ name, params });
  } catch (error) {
    console.warn('[MTA] Analytics event was not recorded:', error);
  }
}
