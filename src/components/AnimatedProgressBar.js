import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedProgressBar = ({ progress, colors, height = 8, style }) => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const animatedScale = useSharedValue(0);

  useEffect(() => {
    const clampedProgress = Math.max(0, Math.min(progress, 1));
    if (reducedMotion) {
      animatedScale.value = clampedProgress;
    } else {
      animatedScale.value = withTiming(clampedProgress, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleX: animatedScale.value }],
      transformOrigin: 'left',
    };
  });

  return (
    <View style={[styles.background, { height, backgroundColor: theme.colors.surfaceVariant }, style]}>
      <Animated.View style={[styles.fill, animatedStyle]}>
        <LinearGradient
          colors={colors || theme.colors.primaryGradient || ['#FB923C', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default AnimatedProgressBar;

