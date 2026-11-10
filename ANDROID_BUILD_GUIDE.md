# MTA University Library Collector — Native Android Build Guide

**Developer:** MTA TECHNOLOGIES  
**Product:** MTA University Library Collector  
**Package Name:** `com.mtatechnologies.universitylibrarycollector`  
**Framework:** Capacitor 8 + React SPA

---

## 1. Architecture

The native shell is in `/android`. Capacitor loads the built web application from `dist/` (default) or a live backend when `CAPACITOR_SERVER_URL` is set.

- **Application icon:** existing MTA TECHNOLOGIES launcher assets under `android/app/src/main/res/mipmap-*`.
- **Splash screen:** deep navy `#070e1c` with gold spinner `#d97706`.
- **Network:** `androidScheme: "https"`, cleartext disabled by default. Cleartext is enabled only if an operator explicitly sets an `http://` development URL.
- **Package/namespace:** `com.mtatechnologies.universitylibrarycollector` in `android/app/build.gradle`.
- **Minimum/target SDK:** `minSdk 24`, `compileSdk 36`, `targetSdk 36` (see `android/variables.gradle`).
- **Permissions:** `INTERNET` only. No location, camera, contacts or storage permissions are requested.

## 2. Build status in this environment

**No APK or AAB was built.** This workspace has no JDK and no Android SDK (`java` is not installed). The Android project and its configuration were reviewed, but compilation and device testing were not performed. Do not treat this repository as containing a verified binary.

## 3. Prerequisites

1. **JDK 21** (Capacitor 8 / Android Gradle Plugin era). JDK 17 may work for older Gradle versions but was not verified here.
2. **Android SDK Platform 36** and **Build Tools 36.x**, plus platform-tools.
3. **Gradle:** use the committed wrapper (`android/gradlew` / `gradlew.bat`) rather than a system Gradle.
4. Environment:
   ```bash
   export JAVA_HOME="/path/to/jdk-21"
   export ANDROID_HOME="/path/to/android-sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
   ```

## 4. Backend URL strategy

Choose one:

### A. Bundled web build (recommended for release)

1. Set the API origin at build time if the API is on another host:
   ```bash
   VITE_API_BASE_URL=https://api.example.org npm run build
   ```
2. Leave `CAPACITOR_SERVER_URL` empty.
3. `npx cap sync android` copies `dist/` into the native project.
4. The app calls the configured API origin. Add that origin to the server's `CORS_ORIGINS`, and include `capacitor://localhost` / `https://localhost` if the WebView uses them.

### B. Live server mode (QA/development only)

```bash
CAPACITOR_SERVER_URL=https://staging.example.org npx cap sync android
```

The WebView loads that URL. HTTPS is required; HTTP is allowed only for deliberate local testing. Do not ship a QA URL in a production release.

## 5. Build steps

```bash
# 1. Install and verify the web app
npm install
npm run lint
npm run build

# 2. Copy web assets and native configuration
npx cap sync android

# 3. Debug APK
cd android
./gradlew assembleDebug
# android/app/build/outputs/apk/debug/app-debug.apk

# 4. Release bundle for Google Play
./gradlew bundleRelease
# android/app/build/outputs/bundle/release/app-release.aab
```

If Gradle reports an SDK/JDK mismatch, install the versions required by the Capacitor/AGP versions in `android/variables.gradle`; do not downgrade the app's package ID or remove the wrapper.

## 6. Signing (never commit keys)

```bash
keytool -genkey -v -keystore mta-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mta-collector
```

Create `android/keystore.properties` (must remain untracked):

```properties
storeFile=mta-release-key.jks
storePassword=YOUR_SECURE_STORE_PASSWORD
keyAlias=mta-collector
keyPassword=YOUR_SECURE_KEY_PASSWORD
```

Configure the signing block in `android/app/build.gradle` or your CI secret store. Back up the keystore and passwords; losing them prevents app updates.

## 7. Optional AdMob and Firebase

- AdMob test IDs are present in `capacitor.config.ts` but `enabled: false`. Advertising must stay disabled until the owner supplies real production IDs and explicitly enables it.
- For Firebase Analytics, add `android/app/google-services.json` from the owner's Firebase project. Keep it out of source control if it contains project identifiers you do not want public. Analytics remains opt-in.
- Never place server secrets or API keys in the APK; anything shipped in the app is public.

## 8. Release checklist

- [ ] `npm run lint`, `npm run test`, `npm run build` pass.
- [ ] `npx cap sync android` completes.
- [ ] API base URL is HTTPS and listed in `CORS_ORIGINS`.
- [ ] Package ID remains `com.mtatechnologies.universitylibrarycollector`.
- [ ] App icon, splash and Arabic RTL layout verified on a device.
- [ ] Sign-in, directory, library, search and PDF upload tested on the device.
- [ ] Ads/analytics remain disabled unless explicitly approved.
- [ ] Signed AAB archived with its keystore and mapping file.
- [ ] Store listing uses the official MTA TECHNOLOGIES identity and does not expose personal founder information.

## Verified GitHub Actions Build

GitHub Actions Android release run `42707047315` successfully produced signed APK and AAB artifacts. The AAB passed `jarsigner` verification. Independent APK signature verification, installation testing on physical devices, production backend validation, and Google Play policy review remain required before release submission.
