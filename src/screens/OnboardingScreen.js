import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StorageService } from '../utils/storage';
import { useThemeContext } from '../utils/ThemeContext';
import * as Haptics from 'expo-haptics';
import { gradients, shadows, animations } from '../constants/theme';

const FEATURES = [
  { icon: '📋', text: 'Track daily attendance with one tap' },
  { icon: '📊', text: 'View detailed analytics & streaks' },
  { icon: '🗓️', text: 'Set up your weekly timetable' },
  { icon: '🔒', text: 'All data stays on your device' },
];

const OnboardingScreen = ({ navigation }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const floatValue = useSharedValue(0);
  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateY = useSharedValue(20);
  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const buttonScale = useSharedValue(1);
  const featuresOpacity = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1, true
    );

    welcomeOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    welcomeTranslateY.value = withDelay(100, withSpring(0, animations.springConfig));

    inputOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    inputTranslateY.value = withDelay(300, withSpring(0, animations.springConfig));

    buttonOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    buttonTranslateY.value = withDelay(500, withSpring(0, animations.springConfig));

    featuresOpacity.value = withDelay(700, withTiming(1, { duration: 800 }));
  }, []);

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await StorageService.saveStudentProfile({ name: name.trim(), setupComplete: true });
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  const handlePressIn = () => { buttonScale.value = withSpring(0.95, animations.bouncySpring); };
  const handlePressOut = () => { buttonScale.value = withSpring(1, animations.bouncySpring); };

  const animatedLogoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatValue.value }] }));
  const animatedWelcomeStyle = useAnimatedStyle(() => ({ opacity: welcomeOpacity.value, transform: [{ translateY: welcomeTranslateY.value }] }));
  const animatedInputStyle = useAnimatedStyle(() => ({ opacity: inputOpacity.value, transform: [{ translateY: inputTranslateY.value }] }));
  const animatedButtonStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value, transform: [{ translateY: buttonTranslateY.value }, { scale: buttonScale.value }] }));
  const animatedFeaturesStyle = useAnimatedStyle(() => ({ opacity: featuresOpacity.value }));

  const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;

  return (
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          {/* Floating Logo */}
          <View style={styles.iconContainer}>
            <Animated.View style={[styles.iconGradientWrapper, animatedLogoStyle]}>
              <LinearGradient colors={gradients.primary} style={styles.iconGradient}>
                <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Welcome Text */}
          <Animated.View style={animatedWelcomeStyle}>
            <Text variant="displayMedium" style={styles.title}>
              Welcome!
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Let's set up your attendance tracker
            </Text>
          </Animated.View>

          {/* Name Input */}
          <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
            <TextInput
              label="Your Name"
              value={name}
              onChangeText={(text) => { setName(text); setError(''); }}
              mode="outlined"
              style={styles.input}
              error={!!error}
              autoFocus
              onSubmitEditing={handleContinue}
              outlineColor={theme.colors.cardBorder}
              activeOutlineColor={theme.colors.primary}
              textColor={theme.colors.text}
              theme={{ colors: { background: theme.colors.surfaceVariant } }}
            />
            {!!error && <Text style={{ color: theme.colors.error, marginTop: 8 }}>{error}</Text>}
          </Animated.View>

          {/* Continue Button */}
          <Animated.View style={animatedButtonStyle}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.buttonGradient, shadows.medium]}>
              <Button
                mode="contained"
                onPress={handleContinue}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                buttonColor="transparent"
              >
                Get Started
              </Button>
            </LinearGradient>
          </Animated.View>

          {/* Feature list */}
          <Animated.View style={[styles.featuresContainer, animatedFeaturesStyle]}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text variant="bodyMedium" style={[styles.featureText, { color: theme.colors.onSurfaceVariant }]}>
                  {f.text}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Privacy note */}
          <Animated.View style={[styles.privacyNote, animatedFeaturesStyle]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', opacity: 0.6 }}>
              Your data is stored locally on this device only. We never collect or transmit your information.
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  iconGradientWrapper: { ...shadows.large },
  iconGradient: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  appIcon: { width: 64, height: 64, borderRadius: 14 },
  title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { marginBottom: 40, textAlign: 'center', opacity: 0.8 },
  inputContainer: { marginBottom: 20 },
  input: { backgroundColor: 'transparent' },
  buttonGradient: { borderRadius: 12, marginBottom: 12 },
  button: { borderRadius: 12 },
  buttonContent: { paddingVertical: 8 },
  buttonLabel: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  featuresContainer: { marginTop: 8, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 18 },
  featureText: { flex: 1 },
  privacyNote: { marginTop: 24, paddingHorizontal: 8 },
});

export default OnboardingScreen;
