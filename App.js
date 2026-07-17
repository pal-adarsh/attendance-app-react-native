import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StorageService, checkSchemaVersion, initializeStorage } from './src/utils/storage';
import { ThemeProvider, useThemeContext } from './src/utils/ThemeContext';
import { isReminderEnabled, scheduleReminders } from './src/utils/notifications';

import CustomTabBar from './src/components/CustomTabBar';
import SplashLoader from './src/components/SplashLoader';
import ErrorBoundary from './src/components/ErrorBoundary';

import OnboardingScreen from './src/screens/OnboardingScreen';
import DailyAttendanceScreen from './src/screens/DailyAttendanceScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import NotesHomeScreen from './src/screens/NotesHomeScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HowToUseScreen from './src/screens/HowToUseScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useThemeContext();
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.surfaceVariant,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen name="Today" component={DailyAttendanceScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="Timetable" component={TimetableScreen} />
      <Tab.Screen name="Subjects" component={SubjectsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Past Records' }} />
      <Tab.Screen name="Notes" component={NotesHomeScreen} options={{ title: 'Notes' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const { theme, isDark } = useThemeContext();

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      await checkSchemaVersion();
      await initializeStorage();
      const reminderOn = await isReminderEnabled();
      if (reminderOn) scheduleReminders();
      const profile = await StorageService.loadStudentProfile();
      setIsOnboarded(profile.setupComplete);
    } catch (e) {
      console.error('Failed to initialize', e);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 1200);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <ErrorBoundary>
            <SplashLoader />
          </ErrorBoundary>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ErrorBoundary>
          <NavigationContainer theme={theme}>
            <StatusBar style={isDark ? "light" : "dark"} backgroundColor={theme.colors.background} />
            <Stack.Navigator
              initialRouteName={isOnboarded ? 'MainTabs' : 'Onboarding'}
              screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: theme.colors.background },
                cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter,
              }}
            >
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen
                name="NoteEditor"
                component={NoteEditorScreen}
                options={{
                  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                }}
              />
              <Stack.Screen
                name="HowToUse"
                component={HowToUseScreen}
                options={{
                  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ErrorBoundary>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
