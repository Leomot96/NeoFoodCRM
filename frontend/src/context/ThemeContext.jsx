import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode: false, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};