"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { LogIn, Eye, EyeOff } from "lucide-react"
import SupportDashboard from "./components/support-dashboard"
import EmployeeDashboard from "./components/employee-dashboard"
import AdminDashboard from "./components/admin-dashboard"
import { ProfileDropdown } from "@/components/profile-dropdown"

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setIsLoggedIn(true)
        localStorage.setItem("user", JSON.stringify(data.user))

        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.name}!`,
        })
      } else {
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUser(null)
    setUsername("")
    setPassword("")
    localStorage.removeItem("user")

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    })
  }

  if (isLoggedIn && user) {
    return (
      <div className="dashboard-container">
        {/* Header */}
        <div className="app-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">H-Kayn Support System</h1>
                <div className="hidden sm:block text-sm opacity-75">Professional Support Management Platform</div>
              </div>
              <ProfileDropdown user={user} onLogout={handleLogout} />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="pt-6">
          {user.type === "support" && <SupportDashboard user={user} />}
          {user.type === "employee" && <EmployeeDashboard user={user} />}
          {user.type === "admin" && <AdminDashboard user={user} />}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="login-card">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-primary/10">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">H-Kayn Support</h1>
              <p className="opacity-75">Professional Support Management</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="form-label">Username</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  className="form-input"
                />
              </div>

              <div className="space-y-2">
                <label className="form-label">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="form-input pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 opacity-50" /> : <Eye className="h-4 w-4 opacity-50" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full primary-button" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs opacity-75">Secure access to your support dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
