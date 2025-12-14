"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Theme = "light" | "dark" | "custom"

interface CustomColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textMuted: string
  border: string
  accent: string
  accentForeground: string
  highlight: string
  highlightForeground: string
  navigation: string
  navigationForeground: string
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  customColors: CustomColors
  setCustomColors: (colors: Partial<CustomColors>) => void
  applyCustomTheme: () => void
  resetToDefaults: () => void
}

const defaultCustomColors: CustomColors = {
  primary: "186 100% 31%", // Blue Teal
  secondary: "51 100% 50%", // Bright Yellow
  background: "220 13% 91%", // Heavy Gray
  surface: "0 0% 100%", // White
  text: "0 0% 0%", // Jet Black
  textMuted: "220 9% 46%", // Muted Gray
  border: "220 13% 85%", // Light Gray Border
  accent: "186 100% 31%", // Blue Teal
  accentForeground: "0 0% 100%", // White
  highlight: "51 100% 50%", // Bright Yellow
  highlightForeground: "0 0% 0%", // Black
  navigation: "0 0% 0%", // Jet Black
  navigationForeground: "0 0% 100%", // White
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [customColors, setCustomColors] = useState<CustomColors>(defaultCustomColors)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem("app-theme") as Theme
    const savedCustomColors = localStorage.getItem("app-custom-colors")

    if (savedTheme && ["light", "dark", "custom"].includes(savedTheme)) {
      setTheme(savedTheme)
    }

    if (savedCustomColors) {
      try {
        const parsedColors = JSON.parse(savedCustomColors)
        setCustomColors({ ...defaultCustomColors, ...parsedColors })
      } catch (error) {
        console.error("Error parsing saved custom colors:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Save theme to localStorage and update document class
    localStorage.setItem("app-theme", theme)

    // Remove all theme classes
    document.documentElement.classList.remove("theme-light", "theme-dark", "theme-custom")
    document.body.classList.remove("theme-light", "theme-dark", "theme-custom")

    // Add current theme class to both html and body
    document.documentElement.classList.add(`theme-${theme}`)
    document.body.classList.add(`theme-${theme}`)

    // Apply custom colors if custom theme is selected
    if (theme === "custom") {
      applyCustomTheme()
    }

    console.log(`Theme switched to: ${theme}`) 
  }, [theme, mounted])

  const applyCustomTheme = () => {
    const root = document.documentElement

    // Apply custom CSS variables
    root.style.setProperty("--custom-primary", customColors.primary)
    root.style.setProperty("--custom-secondary", customColors.secondary)
    root.style.setProperty("--custom-background", customColors.background)
    root.style.setProperty("--custom-surface", customColors.surface)
    root.style.setProperty("--custom-text", customColors.text)
    root.style.setProperty("--custom-text-muted", customColors.textMuted)
    root.style.setProperty("--custom-border", customColors.border)
    root.style.setProperty("--custom-accent", customColors.accent)
    root.style.setProperty("--custom-accent-foreground", customColors.accentForeground)
    root.style.setProperty("--custom-highlight", customColors.highlight)
    root.style.setProperty("--custom-highlight-foreground", customColors.highlightForeground)
    root.style.setProperty("--custom-navigation", customColors.navigation)
    root.style.setProperty("--custom-navigation-foreground", customColors.navigationForeground)

    // Save custom colors to localStorage
    localStorage.setItem("app-custom-colors", JSON.stringify(customColors))
  }

  const updateCustomColors = (newColors: Partial<CustomColors>) => {
    const updatedColors = { ...customColors, ...newColors }
    setCustomColors(updatedColors)

    if (theme === "custom") {
      // Apply immediately if custom theme is active
      const root = document.documentElement
      Object.entries(newColors).forEach(([key, value]) => {
        const cssVar = `--custom-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
        root.style.setProperty(cssVar, value)
      })
      localStorage.setItem("app-custom-colors", JSON.stringify(updatedColors))
    }
  }

  const resetToDefaults = () => {
    setCustomColors(defaultCustomColors)
    if (theme === "custom") {
      applyCustomTheme()
    }
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        customColors,
        setCustomColors: updateCustomColors,
        applyCustomTheme,
        resetToDefaults,
      }}
    >
      <div className={`theme-${theme}`}>{children}</div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
