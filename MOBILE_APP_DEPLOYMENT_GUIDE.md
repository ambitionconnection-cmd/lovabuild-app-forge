# Mobile App Deployment Guide: HEARDROP
## Complete Guide to Publishing on Google Play Store & Apple App Store

---

## Table of Contents
1. [Overview](#overview)
2. [What Lovable Handles vs What You Handle](#what-lovable-handles-vs-what-you-handle)
3. [Prerequisites](#prerequisites)
4. [Step 1: Prepare Your Lovable Project](#step-1-prepare-your-lovable-project)
5. [Step 2: Set Up Capacitor (Native Mobile Framework)](#step-2-set-up-capacitor-native-mobile-framework)
6. [Step 3: Build for Android (Google Play Store)](#step-3-build-for-android-google-play-store)
7. [Step 4: Build for iOS (Apple App Store)](#step-4-build-for-ios-apple-app-store)
8. [Step 5: Submit to Google Play Store](#step-5-submit-to-google-play-store)
9. [Step 6: Submit to Apple App Store](#step-6-submit-to-apple-app-store)
10. [Ongoing Maintenance & Updates](#ongoing-maintenance--updates)
11. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
12. [Cost Summary](#cost-summary)

---

## Overview

Your HEARDROP app is currently a web application built with React. To publish it as a native mobile app on Google Play Store and Apple App Store, you need to:

1. **Use Capacitor** - A framework that wraps your web app into native iOS and Android apps
2. **Build native app packages** - Create APK/AAB files for Android and IPA files for iOS
3. **Submit to app stores** - Go through each store's review process

**Timeline Estimate:**
- Android: 1-3 days for setup + 1-7 days for Google review
- iOS: 2-4 days for setup + 1-14 days for Apple review

---

## What Lovable Handles vs What You Handle

### ✅ What Lovable Handles (Automated)
- Web application code and functionality
- Frontend deployment and hosting
- Backend (Lovable Cloud/Supabase) infrastructure
- API endpoints and database

### ⚠️ What YOU Must Handle (Manual Process)
- Installing Capacitor in your project
- Setting up native development environments (Xcode, Android Studio)
- Building native app packages (APK/IPA files)
- Creating developer accounts ($25 Google, $99/year Apple)
- Preparing app store listings (screenshots, descriptions, icons)
- Submitting apps to stores
- Responding to app store review feedback
- Managing app updates and versions

**Important:** Lovable cannot automatically publish to app stores. This requires manual work with native tooling.

---

## Prerequisites

### Required Accounts
1. **Google Play Console Account** - $25 one-time fee
   - Sign up at: https://play.google.com/console
   
2. **Apple Developer Account** - $99/year
   - Sign up at: https://developer.apple.com/programs/

### Required Hardware
1. **For Android Development:**
   - Any computer (Windows, Mac, or Linux)
   - At least 8GB RAM recommended
   
2. **For iOS Development:**
   - **Mac computer required** (MacBook, iMac, Mac Mini, or Mac Studio)
   - macOS 12.0 or later
   - Cannot be done on Windows or Linux

### Required Software
1. **Node.js** - Version 18 or higher
   - Download: https://nodejs.org/

2. **Git** - Version control
   - Download: https://git-scm.com/

3. **Android Studio** (for Android builds)
   - Download: https://developer.android.com/studio
   
4. **Xcode** (for iOS builds, Mac only)
   - Download from Mac App Store
   - Requires macOS

---

## Step 1: Prepare Your Lovable Project

### 1.1 Export to GitHub
1. In your Lovable project, click the **GitHub icon** (top right)
2. Connect your GitHub account if not already connected
3. Click **"Export to GitHub"**
4. Choose a repository name (e.g., `heardrop-mobile`)
5. Select **Public** or **Private** repository
6. Click **"Export"**

### 1.2 Clone to Your Local Machine
```bash
# Open Terminal (Mac/Linux) or Command Prompt (Windows)
git clone https://github.com/YOUR-USERNAME/heardrop-mobile.git
cd heardrop-mobile
```

### 1.3 Install Dependencies
```bash
npm install
```

### 1.4 Test the Web Version Locally
```bash
npm run dev
```
Visit `http://localhost:8080` to ensure everything works.

---

## Step 2: Set Up Capacitor (Native Mobile Framework)

### 2.1 Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 2.2 Initialize Capacitor
```bash
npx cap init
```

When prompted, enter:
- **App name:** `HEARDROP`
- **App ID:** `app.heardrop.mobile` (use reverse domain notation)
- **Web directory:** `dist`

### 2.3 Configure capacitor.config.ts
Edit the `capacitor.config.ts` file in your project root:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.heardrop.mobile',
  appName: 'HEARDROP',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Add any native plugins here
  }
};

export default config;
```

### 2.4 Build the Web App
```bash
npm run build
```

### 2.5 Add Native Platforms
```bash
# Add Android platform
npx cap add android

# Add iOS platform (Mac only)
npx cap add ios
```

### 2.6 Sync Web Code to Native Projects
```bash
npx cap sync
```

---

## Step 3: Build for Android (Google Play Store)

### 3.1 Install Android Studio
1. Download from https://developer.android.com/studio
2. Install Android Studio
3. During installation, ensure you install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device

### 3.2 Open Project in Android Studio
```bash
npx cap open android
```

This opens your project in Android Studio.

### 3.3 Configure App Details
1. In Android Studio, open `android/app/src/main/AndroidManifest.xml`
2. Verify app name and permissions
3. Open `android/app/build.gradle`
4. Update version code and version name:
```gradle
android {
    defaultConfig {
        versionCode 1
        versionName "1.0.0"
    }
}
```

### 3.4 Generate App Icon
1. Right-click `res` folder in Android Studio
2. Select **New > Image Asset**
3. Upload your app icon (1024x1024 PNG recommended)
4. Generate icons for all sizes

### 3.5 Create a Signing Key
```bash
# In your project root
keytool -genkey -v -keystore heardrop-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias heardrop
```

**Important:** Save this file and password securely! You'll need it for all future updates.

### 3.6 Configure Signing in build.gradle
Edit `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../heardrop-release-key.jks')
            storePassword 'YOUR_KEYSTORE_PASSWORD'
            keyAlias 'heardrop'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3.7 Build Release APK/AAB
In Android Studio:
1. Go to **Build > Generate Signed Bundle / APK**
2. Select **Android App Bundle** (AAB) - Google Play's preferred format
3. Choose your signing key
4. Select **release** build variant
5. Click **Finish**

Your AAB file will be in: `android/app/release/app-release.aab`

---

## Step 4: Build for iOS (Apple App Store)

**Requirement:** You MUST have a Mac computer for this section.

### 4.1 Install Xcode
1. Open **Mac App Store**
2. Search for **Xcode**
3. Install (it's large, ~10-15GB)

### 4.2 Install Xcode Command Line Tools
```bash
xcode-select --install
```

### 4.3 Install CocoaPods
```bash
sudo gem install cocoapods
```

### 4.4 Open Project in Xcode
```bash
npx cap open ios
```

This opens your project in Xcode.

### 4.5 Configure App Details
1. In Xcode, select your project in the left sidebar
2. Select the **HEARDROP** target
3. Update:
   - **Display Name:** HEARDROP
   - **Bundle Identifier:** app.heardrop.mobile (must match your App ID)
   - **Version:** 1.0.0
   - **Build:** 1

### 4.6 Add App Icons
1. In Xcode, go to **Assets.xcassets**
2. Click **AppIcon**
3. Drag and drop your app icon images for each size
   - Tip: Use a tool like https://appicon.co/ to generate all sizes

### 4.7 Configure Signing & Capabilities
1. In Xcode, select your project
2. Go to **Signing & Capabilities** tab
3. Check **Automatically manage signing**
4. Select your **Team** (your Apple Developer account)
5. Xcode will automatically generate provisioning profiles

### 4.8 Build Archive
1. In Xcode, select **Any iOS Device** as the target (top bar)
2. Go to **Product > Archive**
3. Wait for build to complete (5-10 minutes)
4. When done, the **Organizer** window opens

### 4.9 Upload to App Store Connect
1. In Organizer, select your archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Click **Upload**
5. Wait for upload to complete

---

## Step 5: Submit to Google Play Store

### 5.1 Create App in Google Play Console
1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name:** HEARDROP
   - **Default language:** English (or your preference)
   - **App or game:** App
   - **Free or paid:** Free (or Paid)
4. Accept declarations and create app

### 5.2 Complete Store Listing
Navigate to **Store presence > Main store listing**:

1. **App name:** HEARDROP
2. **Short description:** (Max 80 characters)
   ```
   Discover streetwear drops, brands, and shops worldwide with HEARDROP.
   ```
3. **Full description:** (Max 4000 characters)
   ```
   HEARDROP is your ultimate streetwear companion. Stay updated on the latest drops from your favorite brands, discover unique shops worldwide, and never miss a release.

   Features:
   • Real-time drop notifications for upcoming streetwear releases
   • Interactive map of streetwear shops globally
   • Curated brand directory with profiles and histories
   • Personalized drop calendar
   • Exclusive deals and discount codes
   • Pro membership for exclusive content

   Whether you're hunting for limited edition sneakers, tracking the next Supreme drop, or exploring streetwear boutiques in your city, HEARDROP has you covered.
   ```

4. **App icon:** Upload 512x512 PNG
5. **Feature graphic:** Upload 1024x500 PNG (create a banner showcasing your app)
6. **Screenshots:**
   - Phone: At least 2 screenshots (1080x1920 or similar)
   - Tablet (optional): At least 2 screenshots
   - Take screenshots from your Android emulator or device

### 5.3 Set Up Content Rating
1. Go to **Policy > App content**
2. Complete the questionnaire
3. Get your content rating (likely PEGI 3/Everyone)

### 5.4 Select App Category
1. Go to **Store presence > Store settings**
2. Select:
   - **Category:** Lifestyle or Shopping
   - **Tags:** Fashion, Shopping, Streetwear

### 5.5 Set Up Pricing & Distribution
1. Go to **Policy > Pricing and distribution**
2. Select **Countries:** Choose where to distribute (select all or specific countries)
3. Confirm pricing (Free)
4. Accept content guidelines

### 5.6 Create Release
1. Go to **Release > Production**
2. Click **Create new release**
3. Upload your **AAB file** from Step 3.7
4. **Release name:** Version 1.0.0
5. **Release notes:**
   ```
   Initial release of HEARDROP
   
   • Discover streetwear drops and brands
   • Interactive shop map
   • Drop notifications
   • Personalized calendar
   ```
6. Click **Save** then **Review release**
7. Click **Start rollout to Production**

### 5.7 Wait for Review
- Google typically reviews within **1-7 days**
- You'll receive email notifications about status
- If rejected, address issues and resubmit

---

## Step 6: Submit to Apple App Store

### 6.1 Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click **My Apps**
3. Click **+** then **New App**
4. Fill in:
   - **Platform:** iOS
   - **Name:** HEARDROP
   - **Primary Language:** English
   - **Bundle ID:** app.heardrop.mobile (must match Xcode)
   - **SKU:** heardrop-mobile-001 (unique identifier for your records)
5. Click **Create**

### 6.2 Complete App Information
1. **Subtitle:** (Max 30 characters)
   ```
   Streetwear Drops & Shops
   ```
   
2. **Privacy Policy URL:**
   - You MUST have a privacy policy
   - Host it on your website or use a service like https://www.privacypolicies.com/
   - Example: `https://heardrop.com/privacy`

3. **Category:**
   - **Primary:** Lifestyle or Shopping
   - **Secondary:** (optional)

### 6.3 Prepare Screenshots
Apple requires screenshots for each device size:

1. **6.7" Display (iPhone 14 Pro Max, etc.):**
   - 1290 x 2796 pixels
   - At least 3 screenshots

2. **6.5" Display (iPhone 11 Pro Max, etc.):**
   - 1284 x 2778 pixels
   - At least 3 screenshots

3. **5.5" Display (iPhone 8 Plus):**
   - 1242 x 2208 pixels
   - At least 3 screenshots

**Tip:** Use Xcode Simulator to take screenshots:
- Run your app in different iPhone simulators
- Take screenshots with `Cmd + S`

### 6.4 Complete Version Information
1. Go to your app version (1.0)
2. Fill in:

   **Screenshots:** Upload for each device size
   
   **Description:** (Max 4000 characters)
   ```
   HEARDROP is your ultimate streetwear companion. Stay updated on the latest drops from your favorite brands, discover unique shops worldwide, and never miss a release.

   Features:
   • Real-time drop notifications for upcoming streetwear releases
   • Interactive map of streetwear shops globally
   • Curated brand directory with profiles and histories
   • Personalized drop calendar
   • Exclusive deals and discount codes
   • Pro membership for exclusive content

   Whether you're hunting for limited edition sneakers, tracking the next Supreme drop, or exploring streetwear boutiques in your city, HEARDROP has you covered.

   Join the community of streetwear enthusiasts and never miss a drop again.
   ```

   **Keywords:** (Max 100 characters, comma-separated)
   ```
   streetwear,fashion,drops,sneakers,supreme,shopping,brands,hype,clothing,style
   ```

   **Support URL:** Your website or support page
   **Marketing URL:** (optional) Your website

### 6.5 Complete App Review Information
1. **Sign-in required:** If your app requires login:
   - Provide demo account credentials for reviewers
   - Example: email: `reviewer@heardrop.com`, password: `Review2024!`

2. **Notes:**
   ```
   HEARDROP is a streetwear discovery platform. 
   Key features to test:
   - Browse drops without account
   - Create account to set reminders
   - Explore interactive shop map
   - View brand profiles
   ```

3. **Contact Information:**
   - Your name, phone, email

### 6.6 Complete General App Information
1. **App Icon:** Upload 1024x1024 PNG (without transparency)
2. **Age Rating:** Complete questionnaire (likely 4+)
3. **Copyright:** 2024 Your Company Name
4. **Routing App Coverage:** None (unless you're a navigation app)

### 6.7 Submit for Review
1. Ensure your build is uploaded (from Step 4.9)
2. Select the build for this version
3. Click **Add for Review**
4. Click **Submit to App Review**

### 6.8 Wait for Review
- Apple typically reviews within **1-14 days** (usually 2-3 days)
- You'll receive email notifications about status
- If rejected, read feedback carefully and address issues

---

## Ongoing Maintenance & Updates

### When You Need to Update Your App

Whenever you make changes in Lovable:

1. **Export updated code to GitHub:**
   ```bash
   git pull origin main
   ```

2. **Rebuild web assets:**
   ```bash
   npm install  # if dependencies changed
   npm run build
   ```

3. **Sync to native projects:**
   ```bash
   npx cap sync
   ```

4. **Update version numbers:**
   - Android: Update `versionCode` and `versionName` in `android/app/build.gradle`
   - iOS: Update **Version** and **Build** in Xcode

5. **Build new release:**
   - Android: Generate new AAB file (Step 3.7)
   - iOS: Create new Archive and upload (Step 4.8-4.9)

6. **Submit to stores:**
   - Google Play: Create new release with new AAB
   - Apple: Create new version in App Store Connect

### Versioning Best Practices

Use semantic versioning: `MAJOR.MINOR.PATCH`
- **MAJOR:** Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR:** New features (e.g., 1.0.0 → 1.1.0)
- **PATCH:** Bug fixes (e.g., 1.0.0 → 1.0.1)

---

## Common Issues & Troubleshooting

### Android Issues

**Issue:** Build fails with "SDK not found"
**Solution:** Open Android Studio, go to SDK Manager, ensure Android SDK is installed

**Issue:** Signing error
**Solution:** Verify keystore path and passwords in `build.gradle` are correct

**Issue:** App crashes on launch
**Solution:** Run `npx cap sync` and rebuild. Check Android Logcat for errors.

### iOS Issues

**Issue:** "No signing certificate found"
**Solution:** In Xcode, go to Signing & Capabilities, select your team, enable automatic signing

**Issue:** Build fails with CocoaPods error
**Solution:**
```bash
cd ios/App
pod install
cd ../..
```

**Issue:** App rejected for missing privacy policy
**Solution:** Add privacy policy URL in App Store Connect

### Both Platforms

**Issue:** White screen on app launch
**Solution:** 
- Ensure `npm run build` completed successfully
- Run `npx cap sync`
- Check that `webDir: 'dist'` in `capacitor.config.ts` matches your build output

**Issue:** API calls not working
**Solution:** 
- Ensure your backend (Lovable Cloud) is accessible from mobile
- Check CORS settings if using external APIs
- Verify all API URLs use HTTPS, not HTTP

---

## Cost Summary

### One-Time Costs
- **Google Play Developer Account:** $25 (one-time)
- **Apple Developer Account:** $99/year (recurring)

### Optional Costs
- **Mac computer** (for iOS development): $999+ if you don't have one
- **Graphics/Icon design:** $0-500 (if hiring designer)
- **Privacy policy generator:** $0-50 (or write your own)

### Ongoing Costs
- **Apple Developer renewal:** $99/year
- **Server/hosting:** Already covered by Lovable Cloud
- **App updates:** Free (but requires your time)

### Total Minimum to Get Started
- **Android only:** $25
- **iOS only:** $99 + Mac computer
- **Both platforms:** $124 + Mac computer

---

## Timeline Summary

### First-Time Setup (Conservative Estimate)
- **Capacitor setup:** 2-4 hours
- **Android build setup:** 4-6 hours
- **iOS build setup:** 4-8 hours (if new to Xcode)
- **Store listings preparation:** 4-8 hours (screenshots, descriptions)
- **Total setup:** 14-26 hours spread over several days

### Review Times
- **Google Play:** 1-7 days (typically 1-3 days)
- **Apple App Store:** 1-14 days (typically 2-5 days)

### After First Release (Updates)
- **Build and submit update:** 1-2 hours
- **Review times:** Same as above

---

## Helpful Resources

### Documentation
- **Capacitor Docs:** https://capacitorjs.com/docs
- **Android Developer Guide:** https://developer.android.com/distribute/best-practices/launch/launch-checklist
- **iOS Developer Guide:** https://developer.apple.com/app-store/submissions/

### Tools
- **App Icon Generator:** https://appicon.co/
- **Screenshot Generator:** https://www.shotbot.io/
- **Privacy Policy Generator:** https://www.privacypolicies.com/

### Communities
- **Capacitor Discord:** https://discord.com/invite/UPYYRhtyzp
- **Stack Overflow:** Tag questions with `capacitor`, `android`, or `ios`

---

## Final Checklist Before Submission

### Android
- [ ] App builds successfully
- [ ] App icon is set
- [ ] Signing key is created and configured
- [ ] AAB file is generated
- [ ] Screenshots taken (at least 2)
- [ ] Store listing completed
- [ ] Content rating obtained
- [ ] Pricing & distribution set

### iOS
- [ ] App builds successfully in Xcode
- [ ] App icon is set (all sizes)
- [ ] Signing certificates configured
- [ ] Archive uploaded to App Store Connect
- [ ] Screenshots taken (all required sizes)
- [ ] App description completed
- [ ] Privacy policy URL added
- [ ] Demo account provided (if needed)
- [ ] Age rating completed

---

## Support

If you encounter issues during this process:

1. **Check Capacitor docs:** https://capacitorjs.com/docs
2. **Search Stack Overflow** for specific error messages
3. **Android issues:** Check Android Studio Logcat
4. **iOS issues:** Check Xcode console output
5. **Store policy questions:** Contact Google/Apple support

---

**Document Version:** 1.0  
**Last Updated:** November 2024  
**App Name:** HEARDROP  
**Created for:** Mobile App Deployment

---

Good luck with your app launch! 🚀