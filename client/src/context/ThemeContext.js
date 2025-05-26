// ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark-theme');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const theme = {
    colors: darkMode ? {
      primary: '#3ea6ff',
      background: '#0f0f0f',
      surface: '#181818',
      surfaceVariant: '#272727',
      text: '#ffffff',
      textSecondary: '#aaaaaa',
      border: '#303030',
      hover: '#373737'
    } : {
      primary: '#065fd4',
      background: '#ffffff',
      surface: '#f9f9f9',
      surfaceVariant: '#f2f2f2',
      text: '#0f0f0f',
      textSecondary: '#606060',
      border: '#e5e5e5',
      hover: '#f2f2f2'
    }
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};