import React, { createContext, useState, useEffect, useContext } from 'react';
import { lightTheme, darkTheme } from '../constants/theme';
import { StorageService } from './storage';

const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
  theme: darkTheme,
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    StorageService.loadThemeMode().then(saved => {
      setIsDark(saved !== 'light');
    });
  }, []);

  const toggleTheme = async () => {
    const nextValue = !isDark;
    setIsDark(nextValue);
    await StorageService.saveThemeMode(nextValue ? 'dark' : 'light');
  };

  const activeTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme: activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
export default ThemeContext;
