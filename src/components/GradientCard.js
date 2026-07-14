import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeContext } from '../utils/ThemeContext';
import { shadows, gradients, animations } from '../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GradientCard = ({
  children,
  gradient,
  style,
  onPress,
  onLongPress,
  ...props
}) => {
  const { isDark, theme } = useThemeContext();
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      borderColor: isDark
        ? `rgba(187, 134, 252, ${borderOpacity.value})`
        : `rgba(109, 40, 217, ${borderOpacity.value})`,
      borderWidth: 1.5,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.97, animations.bouncySpring);
    borderOpacity.value = withSpring(0.4, animations.springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, animations.bouncySpring);
    borderOpacity.value = withSpring(0, animations.springConfig);
  };

  const hasPress = typeof onPress === 'function' || typeof onLongPress === 'function';
  const defaultGradient = isDark ? gradients.darkCard : gradients.lightCard;

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={hasPress ? handlePressIn : undefined}
      onPressOut={hasPress ? handlePressOut : undefined}
      style={[
        styles.card,
        { backgroundColor: theme.colors.cardBackground, shadowColor: isDark ? '#000' : '#0F172A' },
        animatedStyle,
        style
      ]}
      {...props}
    >
      <LinearGradient
        colors={gradient || defaultGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 16,
    ...shadows.medium,
  },
  gradient: {
    flex: 1,
  },
});

export default GradientCard;
