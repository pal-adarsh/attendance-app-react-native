import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
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

const OnboardingScreen = ({ navigation }) => {
  const theme = useTheme();
  const { isDark } = useThemeContext();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Reanimated shared values
  const floatValue = useSharedValue(0);
  
  // Stagger entry values
  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateY = useSharedValue(20);

  const inputOpacity = useSharedValue(0);
  const inputTranslateY = useSharedValue(20);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Floating logo animation
    floatValue.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );

    // Staggered enter transitions
    welcomeOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    welcomeTranslateY.value = withDelay(100, withSpring(0, animations.springConfig));

    inputOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    inputTranslateY.value = withDelay(300, withSpring(0, animations.springConfig));

    buttonOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    buttonTranslateY.value = withDelay(500, withSpring(0, animations.springConfig));
  }, []);

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await StorageService.saveStudentProfile({
        name: name.trim(),
        setupComplete: true
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }]
      });
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  };

  // Animated Styles
  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatValue.value }],
    };
  });

  const animatedWelcomeStyle = useAnimatedStyle(() => {
    return {
      opacity: welcomeOpacity.value,
      transform: [{ translateY: welcomeTranslateY.value }],
    };
  });

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      opacity: inputOpacity.value,
      transform: [{ translateY: inputTranslateY.value }],
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [
        { translateY: buttonTranslateY.value },
        { scale: buttonScale.value }
      ],
    };
  });

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95, animations.bouncySpring);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, animations.bouncySpring);
  };

  const backgroundGradient = isDark ? gradients.darkBackground : gradients.lightBackground;

  return (
    <LinearGradient
      colors={backgroundGradient}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Floating Welcome Icon */}
          <View style={styles.iconContainer}>
            <Animated.View style={[styles.iconGradientWrapper, animatedLogoStyle]}>
              <LinearGradient
                colors={gradients.primary}
                style={styles.iconGradient}
              >
                <Text style={styles.iconEmoji}>📚</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Welcome Text Container */}
          <Animated.View style={animatedWelcomeStyle}>
            <Text variant="displayMedium" style={styles.title}>
              Welcome!
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Let's get you set up to track your attendance
            </Text>
          </Animated.View>

          {/* Input field */}
          <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
            <TextInput
              label="Your Name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError('');
              }}
              mode="outlined"
              style={styles.input}
              error={!!error}
              autoFocus
              onSubmitEditing={handleContinue}
              outlineColor={theme.colors.cardBorder}
              activeOutlineColor={theme.colors.primary}
              textColor={theme.colors.text}
              theme={{
                colors: {
                  background: theme.colors.surfaceVariant,
                },
              }}
            />

            {!!error && (
              <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                {error}
              </Text>
            )}
          </Animated.View>

          {/* Button CTA */}
          <Animated.View style={animatedButtonStyle}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.buttonGradient, shadows.medium]}
            >
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

            <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
              You can add your subjects and create your timetable next
            </Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconGradientWrapper: {
    ...shadows.large,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 50,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 48,
    textAlign: 'center',
    opacity: 0.8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'transparent',
  },
  buttonGradient: {
    borderRadius: 12,
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  hint: {
    textAlign: 'center',
    opacity: 0.7,
  }
});

export default OnboardingScreen;

