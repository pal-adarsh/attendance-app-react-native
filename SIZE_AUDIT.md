# Attendance App Size Audit

This document provides a detailed breakdown of the application size contributors and assets for the Attendance Calculator Expo React Native application.

---

## 1. Baseline Metrics
* **Baseline APK Size (EAS Build Preview):** **74.84 MB** (78,470,504 bytes)
* **Production JS Bundle Size (Hermes HBC):** **5.06 MB** (5,064,288 bytes)
* **Total Exported Assets Size (dist):** **8.73 MB** (9,151,223 bytes)

---

## 2. Key Size Contributors

### A. Native Code & Libraries (Estimated APK Contribution: ~55 - 60 MB)
By default, the Android release build does **not** have code minification (R8/Proguard) or resource shrinking enabled. This packages the entire compiled bytecode and assets of React Native, Expo SDK, and all native dependencies.
* **Hermes Engine (`libhermes.so`):** Packages the runtime engine for executing JS.
* **React Native Core (`libreactnative.so`):** Core framework native bindings.
* **React Native Reanimated (`libreanimated.so`):** Native animation bindings.
* **React Native Worklets (`libworklets.so`):** Native helper for Reanimated 4.

### B. Font Assets (Estimated APK Contribution: ~2.5 MB)
Metro and the Gradle build package all font assets from `@expo/vector-icons` even though the application only uses **MaterialCommunityIcons** for the tab bar.
* **MaterialCommunityIcons.ttf:** 1.31 MB (Used)
* **FontAwesome6_Solid.ttf:** 424 KB (Unused)
* **Ionicons.ttf:** 390 kB (Unused)
* **MaterialIcons.ttf:** 357 kB (Unused)
* **Fontisto.ttf:** 314 kB (Unused)
* **FontAwesome6_Brands.ttf:** 209 kB (Unused)
* **FontAwesome5_Solid.ttf:** 203 kB (Unused)
* **FontAwesome.ttf:** 166 kB (Unused)
* **FontAwesome5_Brands.ttf:** 134 kB (Unused)
* **AntDesign.ttf:** 130 kB (Unused)
* **Others (Entypo, Feather, Octicons, etc.):** ~500 KB total (Unused)

### C. Image Assets (Estimated APK Contribution: ~1.5 MB)
* **`assets/icon.png` (5.9 MB):** The raw icon image is extremely large (2048x2048, uncompressed PNG) and carries a substantial overhead in the build context and raw file packaging.
* **`assets/adaptive-icon.png` (17.5 KB):** Standard size, but not matching the logo.
* **`assets/splash-icon.png` (17.5 KB):** Standard size, but not matching the logo.

---

## 3. Duplicate and Unused Code
* **Unused Screens:**
  * [HomeScreen.js](file:///e:/Projects%20of%202026/attendance-app/attendance-app-react-native/src/screens/HomeScreen.js) is completely unused (replaced by [DailyAttendanceScreen.js](file:///e:/Projects%20of%202026/attendance-app/attendance-app-react-native/src/screens/DailyAttendanceScreen.js)).
* **Unused Components:**
  * [GradientCard.js](file:///e:/Projects%20of%202026/attendance-app/attendance-app-react-native/src/components/GradientCard.js) is a simple re-export alias of `AnimatedGradientCard.js`. Consolidating imports will allow us to safely delete it.
* **Unused Top-Level Dependencies:**
  * `react-native-worklets` is explicitly declared in `package.json` dependencies, but it is transitively installed via `react-native-reanimated` and not used directly. We can safely remove it from top-level `package.json` to keep dependencies clean.

---

## 4. Size Reduction Opportunities

| Optimization | Target Component | Estimated Savings |
| :--- | :--- | :--- |
| **Enable R8 Minification** | Android native build (`minifyEnabled true`) | **30 - 40 MB** |
| **Enable Resource Shrinking** | Android native build (`shrinkResources true`) | **5 - 10 MB** |
| **Exclude Unused Font Files** | Gradle asset packaging (Ignore unused `.ttf`) | **3.0 MB** |
| **Compress & Resize Icon** | `assets/icon.png` (Resize 2048 -> 1024 + optimize) | **4.7 MB** |
| **Babel Tree Shaking** | `react-native-paper/babel` imports optimization | **100 - 300 KB** |
| **Code Cleanup** | Remove `HomeScreen.js` and consolidate aliases | **10 - 20 KB** |
