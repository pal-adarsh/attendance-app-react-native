import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StorageService } from './src/utils/storage';
import { ThemeProvider, useThemeContext } from './src/utils/ThemeContext';

// Components
import CustomTabBar from './src/components/CustomTabBar';
import SplashLoader from './src/components/SplashLoader';

// Screens
import OnboardingScreen from './src/screens/OnboardingScreen';
import DailyAttendanceScreen from './src/screens/DailyAttendanceScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

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
      <Tab.Screen
        name="Today"
        component={DailyAttendanceScreen}
        options={{
          title: 'Today',
        }}
      />
      <Tab.Screen
        name="Timetable"
        component={TimetableScreen}
      />
      <Tab.Screen
        name="Subjects"
        component={SubjectsScreen}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Past Records',
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const { theme, isDark } = useThemeContext();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const profile = await StorageService.loadStudentProfile();
      setIsOnboarded(profile.setupComplete);
    } catch (e) {
      console.error('Failed to check onboarding', e);
    } finally {
      // Simulate slightly longer loading for aesthetic splash fade-out (e.g. 1.2s total)
      setTimeout(() => {
        setIsLoading(false);
      }, 1200);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <SplashLoader />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
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
          </Stack.Navigator>
        </NavigationContainer>
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


