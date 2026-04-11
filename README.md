# Attendance Calculator

A cross-platform mobile application built with React Native and Expo that helps students track and manage their attendance for multiple subjects. Get real-time insights into your attendance percentage, daily records, and planning tools to maintain your target attendance.

## 📱 Features

- **Daily Attendance Tracking** - Mark attendance for the current day across multiple subjects
- **Subject Management** - Add, edit, and delete subjects with customizable tracking settings
- **Attendance Analytics** - View detailed statistics and attendance trends with visual charts
- **Calendar View** - Browse through attendance history with an interactive calendar interface
- **Timetable** - Organize and view your class schedule by day and time
- **Attendance Calculation** - Automatic percentage calculation based on attended vs total lectures
- **Target Monitoring** - Track progress towards your attendance goal (default 75%)
- **Status Indicators** - Color-coded status (green/yellow/red) based on current attendance levels
- **Haptic Feedback** - Touch feedback for better user interaction
- **Dark Theme** - Native dark mode support with Material Design 3
- **Local Storage** - Persistent data storage using AsyncStorage
- **Onboarding** - User-friendly setup screen for first-time users

## 📱 ScreenShot
<p align="center">
  <img src="https://github.com/user-attachments/assets/cefd87b8-da30-4271-9f3d-638ef2f95fe9" width="300"/>
</p>

## 🛠️ Tech Stack

### Frontend
- **React Native 0.81.5** - Cross-platform mobile UI framework
- **Expo ~54.0.33** - Development platform and managed service
- **React Navigation** - Navigation library with bottom tabs and stack navigation
- **React Native Paper** - Material Design 3 UI components
- **React Native Calendars** - Calendar component

### Libraries & Tools
- **expo-linear-gradient** - Gradient backgrounds
- **expo-haptics** - Haptic feedback
- **@react-native-async-storage/async-storage** - Local data persistence
- **react-native-reanimated** - Animation library
- **react-native-safe-area-context** - Safe area handling

### Build Tools
- **Babel** - JavaScript transpiler
- **Gradle** - Android build system
- **EAS** - Expo Application Services for building

## 📋 Project Structure

```
Attendance app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AddEditSubjectModal.js    # Modal for subject management
│   │   ├── GradientCard.js           # Card component with gradient
│   │   ├── OverallSummary.js         # Attendance summary display
│   │   └── SubjectCard.js            # Individual subject card
│   ├── screens/             # Navigation screens
│   │   ├── DailyAttendanceScreen.js  # Daily attendance entry
│   │   ├── AnalyticsScreen.js        # Statistics and charts
│   │   ├── CalendarScreen.js         # Calendar view
│   │   ├── SubjectsScreen.js         # Subject management
│   │   ├── TimetableScreen.js        # Schedule view
│   │   ├── HomeScreen.js             # Subject list (deprecated)
│   │   └── OnboardingScreen.js       # Initial setup screen
│   ├── constants/
│   │   └── theme.js         # Theme colors and styling
│   └── utils/
│       ├── attendance.js    # Attendance calculation logic
│       └── storage.js       # AsyncStorage abstraction
├── android/                 # Android-specific configuration
├── assets/                  # Icons, splashes, and images
├── App.js                   # Application entry point
├── app.json                 # Expo configuration
├── package.json             # Dependencies and scripts
└── babel.config.js          # Babel configuration
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** - Install globally with `npm install -g expo-cli`

For native development:
- **Android Studio** (for Android builds)
- **Xcode** (for iOS builds on macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Attendance app"
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

## 📱 Running the App

### Expo Go (Easiest for Development)
```bash
npm start
```
Scan the QR code with:
- **Expo Go app** on iOS/Android
- **Camera app** on iOS 11+
- **Phone's camera** on Android 8+

### Android
```bash
npm run android
```
Requires Android Studio and emulator/device connected.

### iOS
```bash
npm run ios
```
Requires macOS and Xcode installed.

### Web (Preview Only)
```bash
npm run web
```
Opens the app in your default web browser.

## 📖 Usage

### First Time Setup
1. Launch the app and enter your name on the onboarding screen
2. The app stores your profile locally

### Adding Subjects
1. Navigate to the **Subjects** tab
2. Click the "+" button to add a new subject
3. Enter subject name and optional details
4. Subject is saved locally

### Tracking Attendance
1. Go to the **Today** tab for daily updates
2. For each subject, toggle attendance status
3. View real-time attendance percentage
4. System automatically calculates if you're meeting your 75% target

### Viewing Analytics
1. Navigate to **Analytics** to see detailed statistics
2. View attendance trends and historical data
3. Track progress towards your goals

### Calendar & Timetable
- **Calendar**: View attendance history by date
- **Timetable**: Organize your class schedule

## 🧮 Attendance Calculation

The app uses the following logic:
- **Attendance %** = (Classes Attended × 100) / Total Classes
- **Status Colors**:
  - 🟢 **Green**: ≥ 80% (Target + 5%)
  - 🟡 **Yellow**: 75-79% (At target but close)
  - 🔴 **Red**: < 75% (Below target)

## 🎨 Customization

### Theme
Modify colors and styles in [src/constants/theme.js](src/constants/theme.js):
- Primary colors
- Surface colors
- Text colors
- Gradients

### Target Attendance
Default target is 75%. Modify in:
- [src/utils/attendance.js](src/utils/attendance.js) - Update `getStatus()` function
- [src/screens/DailyAttendanceScreen.js](src/screens/DailyAttendanceScreen.js) - Update display logic

## 🏗️ Building for Production

### Android APK
```bash
eas build --platform android
```

### iOS App
```bash
eas build --platform ios
```

Requires EAS account setup and configuration in `eas.json`.

## 📦 Dependencies Management

To update dependencies:
```bash
npm update
# or for specific package
npm install <package-name>@<version>
```

To install new packages:
```bash
npm install <package-name>
expo install <expo-package-name>
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
npm start -- -c
```

### AsyncStorage Issues
- Ensure `@react-native-async-storage/async-storage` is installed
- Clear app cache in device settings

### Android Build Errors
- Run: `cd android && ./gradlew clean && cd ..`
- Rebuild: `npm run android`

### expo-linear-gradient Module Not Found
```bash
expo install expo-linear-gradient
```

## 📄 App Configuration

Key configurations in [app.json](app.json):
- App name: "Attendance Calculator"
- Package name: "com.adarsh.attendancecalculator"
- Orientation: Portrait
- Theme: Dark mode by default
- Platform-specific settings for Android and iOS

## 🔗 Navigation Structure

```
App
├── Stack Navigator
│   ├── Onboarding Screen (initial)
│   └── Main Tabs
│       ├── Today (Daily Attendance)
│       ├── Calendar
│       ├── Timetable
│       ├── Subjects
│       └── Analytics
```

## 📝 Data Storage

All user data is stored locally using AsyncStorage:
- Subject list and details
- Daily attendance records
- User profile (name)
- Calendar events

Data persists between app sessions and is never sent to external servers.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test thoroughly
3. Commit with clear messages: `git commit -m "Add feature description"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## 📄 License

This project is private. All rights reserved.

## 👤 Author

**Adarsh** - Initial development and maintenance

## 🚀 Future Enhancements

Potential features for future releases:
- [ ] Cloud synchronization
- [ ] Backup and restore functionality
- [ ] Weekly/monthly reports export
- [ ] Push notifications for low attendance
- [ ] Multi-device sync
- [ ] Analytics graphs and charts
- [ ] Custom attendance targets per subject
- [ ] Subject notes and learning resources

## ℹ️ Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments in relevant files
3. Check Expo documentation: https://docs.expo.dev
4. React Native docs: https://reactnative.dev

---

**Last Updated**: April 2026  
**App Version**: 1.0.0  
**Expo Version**: ~54.0.33  
**React Native Version**: 0.81.5
