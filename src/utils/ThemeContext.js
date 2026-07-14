import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';

const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
  theme: darkTheme,
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('user_theme_mode');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (e) {
      console.error('Failed to load theme preference', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const nextValue = !isDark;
      setIsDark(nextValue);
      await AsyncStorage.setItem('user_theme_mode', nextValue ? 'dark' : 'light');
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const activeTheme = isDark ? darkTheme : lightTheme;

  if (loading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme: activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
export default ThemeContext;
