import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from './src/constants/theme';
import { StorageService } from './src/utils/storage';

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
      }}
    >
      <Tab.Screen
        name="Today"
        component={DailyAttendanceScreen}
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-week" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Subjects"
        component={SubjectsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Past Records',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-edit" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-box" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

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
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={theme.colors.background} />
          <Stack.Navigator
            initialRouteName={isOnboarded ? 'MainTabs' : 'Onboarding'}
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: theme.colors.background }
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
