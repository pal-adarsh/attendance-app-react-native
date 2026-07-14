import { MD3DarkTheme as DefaultDarkTheme, MD3LightTheme as DefaultLightTheme } from 'react-native-paper';

export const darkTheme = {
  ...DefaultDarkTheme,
  colors: {
    ...DefaultDarkTheme.colors,
    primary: '#BB86FC',
    primaryGradient: ['#BB86FC', '#9C6FE8'],
    accent: '#03DAC6',
    accentGradient: ['#03DAC6', '#00B4A3'],
    background: '#0B0B0C',
    backgroundSecondary: '#121214',
    surface: '#18181B',
    surfaceVariant: '#27272A',
    error: '#CF6679',
    text: '#FFFFFF',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#A1A1AA',
    notification: '#FF80AB',
    // Custom colors for attendance status
    attendanceRed: '#EF4444',
    attendanceRedGradient: ['#EF4444', '#B91C1C'],
    attendanceYellow: '#F59E0B',
    attendanceYellowGradient: ['#F59E0B', '#D97706'],
    attendanceGreen: '#10B981',
    attendanceGreenGradient: ['#10B981', '#047857'],
    // Additional UI colors
    cardBackground: '#18181B',
    cardBorder: 'rgba(187, 134, 252, 0.15)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    // Glassmorphism and highlights
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBackground: 'rgba(24, 24, 27, 0.85)',
    tabIndicatorGlow: 'rgba(187, 134, 252, 0.12)',
  },
  roundness: 16,
  animation: {
    scale: 1.0,
  },
};

export const lightTheme = {
  ...DefaultLightTheme,
  colors: {
    ...DefaultLightTheme.colors,
    primary: '#6D28D9',
    primaryGradient: ['#6D28D9', '#4C1D95'],
    accent: '#0D9488',
    accentGradient: ['#0D9488', '#0F766E'],
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceVariant: '#E2E8F0',
    error: '#DC2626',
    text: '#0F172A',
    onSurface: '#0F172A',
    onSurfaceVariant: '#64748B',
    notification: '#EC4899',
    // Custom colors for attendance status
    attendanceRed: '#EF4444',
    attendanceRedGradient: ['#EF4444', '#DC2626'],
    attendanceYellow: '#F59E0B',
    attendanceYellowGradient: ['#F59E0B', '#D97706'],
    attendanceGreen: '#10B981',
    attendanceGreenGradient: ['#10B981', '#059669'],
    // Additional UI colors
    cardBackground: '#FFFFFF',
    cardBorder: 'rgba(109, 40, 217, 0.1)',
    shadow: 'rgba(15, 23, 42, 0.08)',
    overlay: 'rgba(15, 23, 42, 0.4)',
    // Glassmorphism and highlights
    glassBorder: 'rgba(15, 23, 42, 0.08)',
    glassBackground: 'rgba(255, 255, 255, 0.9)',
    tabIndicatorGlow: 'rgba(109, 40, 217, 0.08)',
  },
  roundness: 16,
  animation: {
    scale: 1.0,
  },
};

// Fallback legacy export (defaults to darkTheme)
export const theme = darkTheme;

// Gradient configurations
export const gradients = {
  primary: ['#BB86FC', '#9C6FE8'],
  accent: ['#03DAC6', '#00B4A3'],
  success: ['#10B981', '#059669'],
  warning: ['#F59E0B', '#D97706'],
  danger: ['#EF4444', '#DC2626'],
  darkBackground: ['#0B0B0C', '#18181B'],
  lightBackground: ['#F8FAFC', '#E2E8F0'],
  darkCard: ['#18181B', '#27272A'],
  lightCard: ['#FFFFFF', '#F1F5F9'],
  darkGlass: ['rgba(24, 24, 27, 0.95)', 'rgba(15, 15, 17, 0.98)'],
  lightGlass: ['rgba(255, 255, 255, 0.98)', 'rgba(241, 245, 249, 0.99)'],
};

// Shadow presets
export const shadows = {
  small: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  large: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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


