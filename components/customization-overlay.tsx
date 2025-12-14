"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "@/contexts/theme-context"
import { X, Palette, Sun, Moon, Paintbrush, RotateCcw, Check } from "lucide-react"

interface CustomizationOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const presetThemes = [
  {
    id: "light",
    name: "Light Theme",
    description: "Heavy gray background with blue teal accents and bright yellow highlights",
    icon: Sun,
    preview: {
      primary: "#008C9E",
      secondary: "#FFD600",
      background: "#E5E7EB",
      surface: "#FFFFFF",
    },
  },
  {
    id: "dark",
    name: "Dark Theme",
    description: "Dark background with blue teal and bright yellow accents",
    icon: Moon,
    preview: {
      primary: "#008C9E",
      secondary: "#FFD600",
      background: "#1F2937",
      surface: "#374151",
    },
  },
]

const colorOptions = [
  { key: "primary", label: "Primary (Headers, Icons, Buttons)", description: "Blue Teal for main elements" },
  { key: "secondary", label: "Secondary", description: "Supporting elements" },
  { key: "highlight", label: "Highlight (Call-to-Actions)", description: "Bright Yellow for important actions" },
  { key: "background", label: "Background", description: "Main page background" },
  { key: "surface", label: "Surface (Cards)", description: "Card and panel backgrounds" },
  { key: "text", label: "Text (Body Text)", description: "Jet Black for main content" },
  { key: "textMuted", label: "Muted Text", description: "Secondary text color" },
  { key: "border", label: "Borders", description: "Border and divider color" },
  { key: "navigation", label: "Navigation", description: "Navigation bar background" },
  { key: "navigationForeground", label: "Navigation Text", description: "Navigation text color" },
]

export function CustomizationOverlay({ isOpen, onClose }: CustomizationOverlayProps) {
  const { theme, setTheme, customColors, setCustomColors, resetToDefaults } = useTheme()
  const [tempColors, setTempColors] = useState(customColors)

  if (!isOpen) return null

  const handleColorChange = (key: string, value: string) => {
    // Convert hex to HSL
    const hsl = hexToHsl(value)
    const newColors = { ...tempColors, [key]: hsl }
    setTempColors(newColors)
  }

  const applyChanges = () => {
    setCustomColors(tempColors)
    setTheme("custom")
    onClose()
  }

  const handlePresetSelect = (presetTheme: string) => {
    setTheme(presetTheme as "light" | "dark")
    onClose()
  }

  const handleReset = () => {
    resetToDefaults()
    setTempColors(customColors)
  }

  // Helper function to convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const r = Number.parseInt(hex.slice(1, 3), 16) / 255
    const g = Number.parseInt(hex.slice(3, 5), 16) / 255
    const b = Number.parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  // Helper function to convert HSL to hex for color input
  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(" ").map((val, idx) => {
      if (idx === 0) return Number.parseInt(val) / 360
      return Number.parseInt(val.replace("%", "")) / 100
    })

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16)
      return hex.length === 1 ? "0" + hex : hex
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  return (
    <div className="fixed inset-0 z-50 customization-overlay flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className="modal-content">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Customize Theme
              </CardTitle>
              <p className="text-sm opacity-75 mt-1">Personalize your experience with custom colors and themes</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="presets">Preset Themes</TabsTrigger>
                <TabsTrigger value="custom">Custom Colors</TabsTrigger>
              </TabsList>

              <TabsContent value="presets" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presetThemes.map((preset) => (
                    <Card
                      key={preset.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        theme === preset.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => handlePresetSelect(preset.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Theme Preview */}
                          <div
                            className="h-20 rounded-lg overflow-hidden relative"
                            style={{ backgroundColor: preset.preview.background }}
                          >
                            <div className="absolute inset-0 flex">
                              <div className="w-1/3 h-full" style={{ backgroundColor: preset.preview.primary }} />
                              <div className="w-1/3 h-full" style={{ backgroundColor: preset.preview.surface }} />
                              <div className="w-1/3 h-full" style={{ backgroundColor: preset.preview.secondary }} />
                            </div>
                            {theme === preset.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Check className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Theme Info */}
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <preset.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{preset.name}</h3>
                              <p className="text-sm opacity-75 mt-1">{preset.description}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-6 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Paintbrush className="h-5 w-5" />
                      Custom Color Palette
                    </h3>
                    <p className="text-sm opacity-75 mt-1">Fine-tune each color to match your preferences</p>
                  </div>
                  <Button variant="outline" onClick={handleReset} size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {colorOptions.map((option) => (
                    <div key={option.key} className="space-y-2">
                      <Label className="text-sm font-medium">{option.label}</Label>
                      <p className="text-xs opacity-75">{option.description}</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={hslToHex(tempColors[option.key as keyof typeof tempColors])}
                          onChange={(e) => handleColorChange(option.key, e.target.value)}
                          className="w-16 h-10 p-1 border rounded cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={tempColors[option.key as keyof typeof tempColors]}
                          onChange={(e) => setTempColors({ ...tempColors, [option.key]: e.target.value })}
                          placeholder="HSL value"
                          className="flex-1 form-input text-sm font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={applyChanges} className="primary-button">
                    Apply Custom Theme
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
