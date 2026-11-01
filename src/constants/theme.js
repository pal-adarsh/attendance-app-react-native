import { MD3DarkTheme as DefaultDarkTheme, MD3LightTheme as DefaultLightTheme } from 'react-native-paper';

// Dark Theme: Pure Black & Radiant High-Contrast Orange
export const darkTheme = {
  ...DefaultDarkTheme,
  colors: {
    ...DefaultDarkTheme.colors,
    primary: '#FF6B00', // Radiant high-contrast sports orange
    primaryGradient: ['#FF8533', '#FF6B00'],
    accent: '#F59E0B', // Golden amber
    accentGradient: ['#FBBF24', '#D97706'],
    background: '#000000', // True deep black
    backgroundSecondary: '#0D0D0D', // Pitch carbon
    surface: '#141414', // Clean carbon dark surface
    surfaceVariant: '#222222', // Subtle dark border & divider
    error: '#F87171',
    text: '#FFFFFF', // Pure crisp white text
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#9E9EA8', // Neutral muted text
    notification: '#FF6B00',
    // Custom colors for attendance status
    attendanceRed: '#EF4444',
    attendanceRedGradient: ['#EF4444', '#B91C1C'],
    attendanceYellow: '#F59E0B',
    attendanceYellowGradient: ['#F59E0B', '#D97706'],
    attendanceGreen: '#10B981',
    attendanceGreenGradient: ['#10B981', '#047857'],
    attendanceOD: '#F59E0B',
    // Additional UI colors
    cardBackground: '#121212',
    cardBorder: 'rgba(255, 107, 0, 0.22)', // Sleek orange outline
    shadow: 'rgba(0, 0, 0, 0.8)',
    overlay: 'rgba(0, 0, 0, 0.85)',
    // Glassmorphism and highlights
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBackground: 'rgba(18, 18, 18, 0.94)',
    tabIndicatorGlow: 'rgba(255, 107, 0, 0.16)',
  },
  roundness: 16,
  animation: {
    scale: 1.0,
  },
};

// Light Theme: Warm Linen Beige, Sandstone Cream & Sunset Orange
export const lightTheme = {
  ...DefaultLightTheme,
  colors: {
    ...DefaultLightTheme.colors,
    primary: '#EA580C', // Vibrant terracotta sunset orange (high contrast on beige)
    primaryGradient: ['#F97316', '#EA580C'],
    accent: '#D97706', // Warm golden amber
    accentGradient: ['#F59E0B', '#D97706'],
    background: '#FAF7F2', // Soft warm oat milk / linen beige canvas
    backgroundSecondary: '#F3ECE2', // Sandstone cream
    surface: '#FFFFFF', // Crisp warm ivory card
    surfaceVariant: '#EFE6DA', // Soft latte divider & border
    error: '#DC2626',
    text: '#261C14', // Deep rich espresso dark brown
    onSurface: '#261C14',
    onSurfaceVariant: '#7C6C5E', // Warm hazel / taupe
    notification: '#EA580C',
    // Custom colors for attendance status
    attendanceRed: '#EF4444',
    attendanceRedGradient: ['#EF4444', '#DC2626'],
    attendanceYellow: '#F59E0B',
    attendanceYellowGradient: ['#F59E0B', '#D97706'],
    attendanceGreen: '#10B981',
    attendanceGreenGradient: ['#10B981', '#059669'],
    attendanceOD: '#D97706',
    // Additional UI colors
    cardBackground: '#FFFFFF',
    cardBorder: 'rgba(234, 88, 12, 0.14)', // Delicate terracotta tint
    shadow: 'rgba(38, 28, 20, 0.08)',
    overlay: 'rgba(38, 28, 20, 0.45)',
    // Glassmorphism and highlights
    glassBorder: 'rgba(38, 28, 20, 0.08)',
    glassBackground: 'rgba(255, 253, 249, 0.94)',
    tabIndicatorGlow: 'rgba(234, 88, 12, 0.12)',
  },
  roundness: 16,
  animation: {
    scale: 1.0,
  },
};

// Fallback legacy export (defaults to lightTheme)
export const theme = lightTheme;

// Gradient configurations
export const gradients = {
  primary: ['#FF8533', '#FF6B00'],
  accent: ['#FBBF24', '#D97706'],
  success: ['#10B981', '#059669'],
  warning: ['#F59E0B', '#D97706'],
  danger: ['#EF4444', '#DC2626'],
  darkBackground: ['#000000', '#0C0C0C'], // Pure black gradient
  lightBackground: ['#FAF7F2', '#F2EBE0'], // Warm beige canvas gradient
  darkCard: ['#141414', '#1A1A1A'], // Crisp carbon card
  lightCard: ['#FFFFFF', '#FAF6EE'], // Warm ivory-cream card gradient
  darkGlass: ['rgba(18, 18, 18, 0.96)', 'rgba(8, 8, 8, 0.98)'],
  lightGlass: ['rgba(255, 253, 249, 0.98)', 'rgba(247, 241, 232, 0.99)'],
};

// Shadow presets
export const shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Animation configs for reanimated
export const animations = {
  fast: 200,
  normal: 300,
  slow: 500,
  springConfig: {
    damping: 15,
    mass: 1,
    stiffness: 120,
  },
  bouncySpring: {
    damping: 10,
    mass: 0.8,
    stiffness: 150,
  },
};
