"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useTheme } from "@/contexts/theme-context"
import { Palette, Check } from "lucide-react"

const themes = [
  {
    id: "v1" as const,
    name: "Full Color",
    description: "Dark theme with maximum color saturation",
    preview: {
      primary: "#008C9E",
      secondary: "#FFD600",
      background: "#2d3748",
      card: "#374151",
    },
  },
  {
    id: "v2" as const,
    name: "Balanced",
    description: "Light theme with balanced colors",
    preview: {
      primary: "#008C9E",
      secondary: "#FFD600",
      background: "#F5F5F5",
      card: "#FFFFFF",
    },
  },
  {
    id: "v3" as const,
    name: "Support Site",
    description: "Clean modern theme for support",
    preview: {
      primary: "#14b8a6",
      secondary: "#facc15",
      background: "#f8fafc",
      card: "#ffffff",
    },
  },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleThemeChange = (newTheme: "v1" | "v2" | "v3") => {
    console.log(`Changing theme from ${theme} to ${newTheme}`)
    setTheme(newTheme)
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl modal-content">
        <DialogHeader>
          <DialogTitle>Choose Your Theme</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {themes.map((themeOption) => (
            <Card
              key={themeOption.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                theme === themeOption.id ? "ring-2" : ""
              }`}
              style={{
                ringColor: theme === themeOption.id ? "hsl(var(--theme-primary))" : "transparent",
              }}
              onClick={() => handleThemeChange(themeOption.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Theme Preview */}
                  <div
                    className="h-20 rounded-lg overflow-hidden relative"
                    style={{ backgroundColor: themeOption.preview.background }}
                  >
                    <div className="absolute inset-0 flex">
                      <div className="w-1/3 h-full" style={{ backgroundColor: themeOption.preview.primary }} />
                      <div className="w-1/3 h-full" style={{ backgroundColor: themeOption.preview.card }} />
                      <div className="w-1/3 h-full" style={{ backgroundColor: themeOption.preview.secondary }} />
                    </div>
                    {theme === themeOption.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Theme Info */}
                  <div>
                    <h3 className="font-semibold text-sm">{themeOption.name}</h3>
                    <p className="text-xs opacity-75 mt-1">{themeOption.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 text-center text-sm opacity-75">
          Current theme: <span className="font-semibold capitalize">{theme}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
