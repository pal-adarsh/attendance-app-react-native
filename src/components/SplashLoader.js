import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../constants/theme';

const SplashLoader = () => {
  const theme = useTheme();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 1200 }), withTiming(0.9, { duration: 1200 })),
      -1, true
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 1200 }), withTiming(0.3, { duration: 1200 })),
      -1, true
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const backgroundGradient = theme.dark ? gradients.darkBackground : gradients.lightBackground;

  return (
    <LinearGradient colors={backgroundGradient} style={styles.container}>
      <View style={styles.logoWrapper}>
        <Animated.View style={[styles.glowRing, { backgroundColor: theme.dark ? 'rgba(187, 134, 252, 0.2)' : 'rgba(109, 40, 217, 0.12)' }, glowStyle]} />
        <Animated.View style={[styles.logoCircle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }, logoStyle]}>
          <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
        </Animated.View>
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>Attendance Tracker</Text>
      <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrapper: { justifyContent: 'center', alignItems: 'center', width: 140, height: 140, marginBottom: 24 },
  glowRing: { position: 'absolute', width: 130, height: 130, borderRadius: 65 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, overflow: 'hidden',
    elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5,
  },
  appIcon: { width: 56, height: 56, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: 'bold', letterSpacing: 0.8, marginBottom: 32 },
  loader: { marginTop: 8 },
});

export default SplashLoader;
