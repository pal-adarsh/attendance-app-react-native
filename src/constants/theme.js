import { MD3DarkTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#BB86FC',
    primaryGradient: ['#BB86FC', '#9C6FE8'],
    accent: '#03DAC6',
    accentGradient: ['#03DAC6', '#00B4A3'],
    background: '#0A0A0A',
    backgroundSecondary: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    error: '#CF6679',
    text: '#FFFFFF',
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#B0B0B0',
    notification: '#FF80AB',
    // Custom colors for attendance status
    attendanceRed: '#FF5252',
    attendanceRedGradient: ['#FF5252', '#E53935'],
    attendanceYellow: '#FFC107',
    attendanceYellowGradient: ['#FFC107', '#FFB300'],
    attendanceGreen: '#4CAF50',
    attendanceGreenGradient: ['#4CAF50', '#43A047'],
    // Additional UI colors
    cardBackground: '#1E1E1E',
    cardBorder: 'rgba(187, 134, 252, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  roundness: 16,
  animation: {
    scale: 1.0,
  },
};

// Gradient configurations
export const gradients = {
  primary: ['#BB86FC', '#9C6FE8'],
  accent: ['#03DAC6', '#00B4A3'],
  success: ['#4CAF50', '#43A047'],
  warning: ['#FFC107', '#FFB300'],
  danger: ['#FF5252', '#E53935'],
  background: ['#0A0A0A', '#1A1A1A'],
  card: ['#1E1E1E', '#2C2C2C'],
};

// Shadow presets
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 8,
  },
};

// Animation durations
export const animations = {
  fast: 200,
  normal: 300,
  slow: 500,
};
