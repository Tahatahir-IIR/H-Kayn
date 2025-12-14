"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  UserPlus,
  Settings,
  Trash2,
  Edit,
  Plus,
  Palette,
  UsersIcon,
  UserCheck,
  UserX,
  RefreshCw,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Save,
  Tag,
  Search,
  Crown,
} from "lucide-react"

interface User {
  id: number
  username: string
  name: string
  type: string
  created_at: string
  groups?: Array<{
    id: number
    name: string
    description: string
  }>
}

interface SupportGroup {
  id: number
  name: string
  description: string
  member_count: number
  chief_id?: number
  chief_name?: string
  members: Array<{
    id: number
    name: string
    username: string
  }>
}

interface Setting {
  id: number
  key: string
  value: string
  displayName: string
  description: string
  color?: string
}

interface AdminDashboardProps {
  user: {
    id: number
    name: string
    type: string
  }
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([])
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([])
  const [supportUsers, setSupportUsers] = useState<User[]>([])
  const [taches, setTaches] = useState<any[]>([])
  const [settings, setSettings] = useState({
    types: [],
    categories: [],
    poles: [],
    canals: [],
    priorities: [],
    statuses: [],
  })
  const [loading, setLoading] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<SupportGroup | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    name: "",
    type: "",
  })
  const [groupFormData, setGroupFormData] = useState({
    name: "",
    description: "",
  })
  const [newSettingValue, setNewSettingValue] = useState("")
  const [newSettingColor, setNewSettingColor] = useState("")
  const [editingSettingId, setEditingSettingId] = useState<number | null>(null)
  const [editingSettingValue, setEditingSettingValue] = useState("")
  const [editingSettingColor, setEditingSettingColor] = useState("")
  const [showAssignmentOverlay, setShowAssignmentOverlay] = useState(false)
  const [selectedGroupForAssignment, setSelectedGroupForAssignment] = useState<SupportGroup | null>(null)
  const [memberSearch, setMemberSearch] = useState("")
  const [availableSearch, setAvailableSearch] = useState("")
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, tachesRes, groupsRes, settingsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/taches"),
        fetch("/api/groups"),
        fetch("/api/settings"),
      ])
      const [usersData, tachesData, groupsData, settingsData] = await Promise.all([
        usersRes.json(),
        tachesRes.json(),
        groupsRes.json(),
        settingsRes.json(),
      ])

      if (usersRes.ok) setUsers(usersData.users || [])
      if (tachesRes.ok) setTaches(tachesData.taches || [])
      if (groupsRes.ok) {
        setSupportGroups(groupsData.groups || [])
        setSupportUsers(usersData.users?.filter((u: User) => u.type === "support") || [])
      }
      if (settingsRes.ok)
        setSettings(
          settingsData.settings || {
            types: [],
            categories: [],
            poles: [],
            canals: [],
            priorities: [],
            statuses: [],
          },
        )
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userFormData),
      })
      if (response.ok) {
        setUserFormData({ username: "", password: "", name: "", type: "" })
        setShowUserForm(false)
        toast({ title: "Success", description: "User created successfully" })
        loadData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const method = editingGroup ? "PUT" : "POST"
      const body = editingGroup
        ? JSON.stringify({ ...groupFormData, id: editingGroup.id })
        : JSON.stringify(groupFormData)
      const response = await fetch("/api/groups", {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      })
      if (response.ok) {
        setGroupFormData({ name: "", description: "" })
        setShowGroupForm(false)
        setEditingGroup(null)
        toast({
          title: "Success",
          description: `Support group ${editingGroup ? "updated" : "created"} successfully`,
        })
        loadData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || `Failed to ${editingGroup ? "update" : "create"} support group`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error with support group:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      const response = await fetch(`/api/users?id=${userId}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Success", description: "User deleted successfully" })
        loadData()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
  }

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm("Are you sure you want to delete this support group? This will remove all user assignments.")) return
    try {
      const response = await fetch(`/api/groups?id=${groupId}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Success", description: "Support group deleted successfully" })
        loadData()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete support group",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting support group:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
  }

  const handleAssignUserToGroup = async (userId: number, groupId: number) => {
    setLoading(true)
    try {
      const response = await fetch("/api/groups/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupId, action: "assign" }),
      })
      if (response.ok) {
        toast({
          title: "Success",
          description: "User assigned to group successfully",
        })
        loadData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to assign user to group",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveUserFromGroup = async (userId: number, groupId: number) => {
    if (!confirm("Are you sure you want to remove this user from the group?")) return
    setLoading(true)
    try {
      const response = await fetch("/api/groups/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupId, action: "remove" }),
      })
      if (response.ok) {
        toast({
          title: "Success",
          description: "User removed from group successfully",
        })
        loadData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to remove user from group",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSetGroupChief = async (userId: number, groupId: number) => {
    if (!confirm("Are you sure you want to set this user as the group chief?")) return
    setLoading(true)
    try {
      const response = await fetch("/api/groups/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupId, action: "set_chief" }),
      })
      if (response.ok) {
        toast({
          title: "Success",
          description: "Group chief set successfully",
        })
        loadData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to set group chief",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddSetting = async (category: string) => {
    if (!newSettingValue.trim()) return
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          value: newSettingValue.trim(),
          color: newSettingColor || null,
        }),
      })
      if (response.ok) {
        setNewSettingValue("")
        setNewSettingColor("")
        toast({ title: "Success", description: `${category} added successfully` })
        loadData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || `Failed to add ${category}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding setting:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
  }

  const handleUpdateSetting = async (id: number, category: string, value: string, color?: string) => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          category,
          value,
          color: color || null,
        }),
      })
      if (response.ok) {
        setEditingSettingId(null)
        setEditingSettingValue("")
        setEditingSettingColor("")
        toast({ title: "Success", description: `${category} updated successfully` })
        loadData()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || `Failed to update ${category}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating setting:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSetting = async (id: number, category: string) => {
    if (!confirm(`Are you sure you want to delete this ${category}?`)) return
    try {
      const response = await fetch(`/api/settings?id=${id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Success", description: `${category} deleted successfully` })
        loadData()
      } else {
        toast({
          title: "Error",
          description: `Failed to delete ${category}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting setting:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
  }

  const hasColorSupport = (category: string) => {
    return category === "priorities" || category === "statuses"
  }

  const getColorFromHex = (hex: string) => {
    if (!hex) return {}
    return {
      backgroundColor: hex + "20", 
      borderColor: hex,
      color: hex,
    }
  }

  const filterUsersBySearch = (users: User[], searchTerm: string) => {
    if (!searchTerm.trim()) return users
    const term = searchTerm.toLowerCase()
    return users.filter((user) => user.name.toLowerCase().includes(term) || user.username.toLowerCase().includes(term))
  }

  const renderSettingsSection = (title: string, category: string, items: any[], icon: React.ElementType) => {
    const Icon = icon
    const supportsColor = hasColorSupport(category)
    return (
      <div className="standard-card">
        <div className="border-b divider pb-4 mb-6">
          <h4 className="text-lg font-bold flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
            {supportsColor && <Palette className="h-4 w-4 opacity-50" />}
          </h4>
          <p className="text-sm opacity-75 mt-1">
            Manage {title.toLowerCase()} options{supportsColor ? " with custom colors" : ""}
          </p>
        </div>
        <div className="space-y-4">
          {/* Add new item */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newSettingValue}
                onChange={(e) => setNewSettingValue(e.target.value)}
                placeholder={`Add new ${category.slice(0, -1)}`}
                className="form-input"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddSetting(category)
                  }
                }}
              />
              <Button
                onClick={() => handleAddSetting(category)}
                disabled={!newSettingValue.trim()}
                className="primary-button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {supportsColor && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Color (optional):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newSettingColor || "#3b82f6"}
                    onChange={(e) => setNewSettingColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={newSettingColor}
                    onChange={(e) => setNewSettingColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="form-input w-24 text-xs font-mono"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                  {newSettingColor && (
                    <Button variant="outline" size="sm" onClick={() => setNewSettingColor("")} className="text-xs">
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* List existing items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg divider">
                {editingSettingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col gap-2 flex-1">
                      <Input
                        value={editingSettingValue}
                        onChange={(e) => setEditingSettingValue(e.target.value)}
                        className="form-input"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateSetting(item.id, category, editingSettingValue, editingSettingColor)
                          }
                          if (e.key === "Escape") {
                            setEditingSettingId(null)
                            setEditingSettingValue("")
                            setEditingSettingColor("")
                          }
                        }}
                        autoFocus
                      />
                      {supportsColor && (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editingSettingColor || "#3b82f6"}
                            onChange={(e) => setEditingSettingColor(e.target.value)}
                            className="w-6 h-6 rounded border cursor-pointer"
                          />
                          <Input
                            value={editingSettingColor}
                            onChange={(e) => setEditingSettingColor(e.target.value)}
                            placeholder="#3b82f6"
                            className="form-input w-20 text-xs font-mono"
                            pattern="^#[0-9A-Fa-f]{6}$"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateSetting(item.id, category, editingSettingValue, editingSettingColor)}
                        className="primary-button"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSettingId(null)
                          setEditingSettingValue("")
                          setEditingSettingColor("")
                        }}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {supportsColor && item.color && (
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: item.color }}
                          title={`Color: ${item.color}`}
                        />
                      )}
                      <span
                        className={`font-medium ${
                          supportsColor && item.color ? "px-2.5 py-1 rounded-full text-xs border" : ""
                        }`}
                        style={supportsColor && item.color ? getColorFromHex(item.color) : {}}
                      >
                        {item.value}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingSettingId(item.id)
                          setEditingSettingValue(item.value)
                          setEditingSettingColor(item.color || "")
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSetting(item.id, category)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-8">
                <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm opacity-75">No {title.toLowerCase()} configured yet</p>
                <p className="text-xs opacity-50 mt-1">Add your first {category.slice(0, -1)} above</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "resolved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <XCircle className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const totalUsers = users.length
  const totalTaches = taches.length
  const pendingTaches = taches.filter((t) => t.status === "pending").length
  const resolvedTaches = taches.filter((t) => t.status === "resolved").length
  const totalGroups = supportGroups.length
  const totalAssignments = supportUsers.reduce((acc, user) => acc + (user.groups?.length || 0), 0)
  const unassignedSupport = supportUsers.filter((user) => !user.groups || user.groups.length === 0).length

  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold truncate">Admin Dashboard</h2>
              <p className="text-sm sm:text-base opacity-75 mt-1">Manage users, groups, and monitor system activity</p>
            </div>
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="primary-button flex-shrink-0 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="standard-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-75">Total Users</p>
                  <p className="text-2xl sm:text-3xl font-bold">{totalUsers}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 opacity-75" />
              </div>
            </div>
            <div className="standard-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-75">Total Taches</p>
                  <p className="text-2xl sm:text-3xl font-bold">{totalTaches}</p>
                </div>
                <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 opacity-75" />
              </div>
            </div>
            <div className="standard-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-75">Pending</p>
                  <p className="text-2xl sm:text-3xl font-bold">{pendingTaches}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 opacity-75" />
              </div>
            </div>
            <div className="standard-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-75">Resolved</p>
                  <p className="text-2xl sm:text-3xl font-bold">{resolvedTaches}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 opacity-75" />
              </div>
            </div>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="taches">Taches</TabsTrigger>
              <TabsTrigger value="groups">Support Groups</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-base sm:text-lg font-semibold">User Management</h3>
                <Button onClick={() => setShowUserForm(true)} className="primary-button flex-shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              {showUserForm && (
                <div className="standard-card">
                  <div className="border-b divider pb-4 mb-6">
                    <h4 className="text-lg font-bold">Create New User</h4>
                  </div>
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="form-label">Username *</label>
                        <Input
                          value={userFormData.username}
                          onChange={(e) => setUserFormData((prev) => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter username"
                          required
                          className="form-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="form-label">Password *</label>
                        <Input
                          type="password"
                          value={userFormData.password}
                          onChange={(e) => setUserFormData((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password"
                          required
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="form-label">Full Name *</label>
                        <Input
                          value={userFormData.name}
                          onChange={(e) => setUserFormData((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter full name"
                          required
                          className="form-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="form-label">User Type *</label>
                        <Select
                          value={userFormData.type}
                          onValueChange={(value) => setUserFormData((prev) => ({ ...prev, type: value }))}
                          required
                        >
                          <SelectTrigger className="form-input">
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t divider">
                      <Button type="submit" disabled={submitting} className="primary-button">
                        {submitting ? "Creating..." : "Create User"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowUserForm(false)}
                        className="order-2 sm:order-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="standard-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b divider">
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Name</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Username</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Type</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Groups</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Created</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b divider">
                          <td className="py-3 px-2 text-xs sm:text-sm">{user.name}</td>
                          <td className="py-3 px-2 text-xs sm:text-sm">{user.username}</td>
                          <td className="py-3 px-2">
                            <Badge variant={user.type === "admin" ? "default" : "secondary"} className="text-xs">
                              {user.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-wrap gap-1">
                              {user.groups && user.groups.length > 0 ? (
                                user.groups.map((group) => (
                                  <Badge key={group.id} variant="outline" className="text-xs">
                                    {group.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs opacity-50">No groups</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-xs sm:text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="standard-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium opacity-75">Total Groups</p>
                      <p className="text-2xl sm:text-3xl font-bold">{totalGroups}</p>
                    </div>
                    <UsersIcon className="h-6 w-6 sm:h-8 sm:w-8 opacity-75" />
                  </div>
                </div>
                <div className="standard-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium opacity-75">Total Assignments</p>
                      <p className="text-2xl sm:text-3xl font-bold">{totalAssignments}</p>
                    </div>
                    <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 opacity-75" />
                  </div>
                </div>
                <div className="standard-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium opacity-75">Unassigned Support</p>
                      <p className="text-2xl sm:text-3xl font-bold">{unassignedSupport}</p>
                    </div>
                    <UserX className="h-6 w-6 sm:h-8 sm:w-8 opacity-75" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-base sm:text-lg font-semibold">Support Groups Management</h3>
                <Button
                  onClick={() => {
                    setEditingGroup(null)
                    setGroupFormData({ name: "", description: "" })
                    setShowGroupForm(true)
                  }}
                  className="primary-button flex-shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Group
                </Button>
              </div>

              {showGroupForm && (
                <div className="standard-card">
                  <div className="border-b divider pb-4 mb-6">
                    <h4 className="text-lg font-bold">
                      {editingGroup ? "Edit Support Group" : "Create New Support Group"}
                    </h4>
                  </div>
                  <form onSubmit={handleGroupSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="form-label">Group Name *</label>
                      <Input
                        value={groupFormData.name}
                        onChange={(e) => setGroupFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter group name"
                        required
                        className="form-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="form-label">Description</label>
                      <Textarea
                        value={groupFormData.description}
                        onChange={(e) => setGroupFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter group description (optional)"
                        rows={3}
                        className="form-input resize-none"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t divider">
                      <Button type="submit" disabled={submitting} className="primary-button">
                        {submitting
                          ? editingGroup
                            ? "Updating..."
                            : "Creating..."
                          : editingGroup
                            ? "Update Group"
                            : "Create Group"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowGroupForm(false)
                          setEditingGroup(null)
                          setGroupFormData({ name: "", description: "" })
                        }}
                        className="order-2 sm:order-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="standard-card">
                <div className="border-b divider pb-4 mb-4">
                  <h4 className="text-lg font-bold">Support Groups</h4>
                  <p className="text-sm opacity-75 mt-1">Manage support team groups and their settings</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supportGroups.map((group) => (
                    <div key={group.id} className="p-4 border rounded-lg divider">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-base">{group.name}</h5>
                            {group.chief_id && <Crown className="h-4 w-4 text-yellow-500" title="Has Group Chief" />}
                          </div>
                          {group.description && <p className="text-sm opacity-75 mt-1">{group.description}</p>}
                          {group.chief_name && (
                            <div className="flex items-center gap-1 mt-2">
                              <Crown className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                                Chief: {group.chief_name}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingGroup(group)
                              setGroupFormData({
                                name: group.name,
                                description: group.description || "",
                              })
                              setShowGroupForm(true)
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Members</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.member_count || 0}
                          </Badge>
                        </div>
                        {group.members && group.members.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {group.members.map((member) => (
                              <span
                                key={member.id}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                  member.id === group.chief_id
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                }`}
                              >
                                {member.id === group.chief_id && <Crown className="h-3 w-3 mr-1" />}
                                {member.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGroupForAssignment(group)
                              setShowAssignmentOverlay(true)
                              setMemberSearch("")
                              setAvailableSearch("")
                            }}
                            className="w-full text-xs"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Manage Members
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {supportGroups.length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm opacity-75">No support groups created yet</p>
                      <p className="text-xs opacity-50 mt-1">Create your first support group to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="taches" className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">All Taches</h3>
              <div className="standard-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b divider">
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">ID</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Title</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Employee</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Type</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Status</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Support Group</th>
                        <th className="text-left py-3 px-2 font-medium text-xs sm:text-sm">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taches.map((tache) => (
                        <tr key={tache.id} className="border-b divider">
                          <td className="py-3 px-2 text-xs sm:text-sm">#{tache.id}</td>
                          <td className="py-3 px-2 text-xs sm:text-sm max-w-xs truncate">{tache.title}</td>
                          <td className="py-3 px-2 text-xs sm:text-sm">{tache.employee_name}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {tache.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div className={`status-${tache.status} text-xs`}>
                              {getStatusIcon(tache.status)}
                              <span className="ml-1 capitalize">{tache.status}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-xs sm:text-sm">{tache.entite}</td>
                          <td className="py-3 px-2 text-xs sm:text-sm">
                            {new Date(tache.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Settings
                  </h3>
                  <p className="text-sm opacity-75 mt-1">Configure dropdown options and system parameters</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {renderSettingsSection("Types", "types", settings.types, Tag)}
                {renderSettingsSection("Categories", "categories", settings.categories, Tag)}
                {renderSettingsSection("Poles", "poles", settings.poles, Tag)}
                {renderSettingsSection("Canals", "canals", settings.canals, Tag)}
                {renderSettingsSection("Priorities", "priorities", settings.priorities, Tag)}
                {renderSettingsSection("Statuses", "statuses", settings.statuses, Tag)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Group Assignment Overlay */}
      {showAssignmentOverlay && selectedGroupForAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b divider">
              <div>
                <h3 className="text-lg font-semibold">Manage Group Members</h3>
                <p className="text-sm opacity-75 mt-1">
                  Assign or remove support users from "{selectedGroupForAssignment.name}"
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAssignmentOverlay(false)
                  setSelectedGroupForAssignment(null)
                  setMemberSearch("")
                  setAvailableSearch("")
                }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Members */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium">
                        Current Members ({selectedGroupForAssignment.members?.length || 0})
                      </h4>
                    </div>
                  </div>
                  {/* Search for current members */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search current members..."
                      className="pl-10 form-input"
                    />
                    {memberSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberSearch("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {selectedGroupForAssignment.members && selectedGroupForAssignment.members.length > 0 ? (
                      filterUsersBySearch(selectedGroupForAssignment.members, memberSearch).map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg divider"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                member.id === selectedGroupForAssignment.chief_id
                                  ? "bg-yellow-100 dark:bg-yellow-900"
                                  : "bg-green-100 dark:bg-green-900"
                              }`}
                            >
                              {member.id === selectedGroupForAssignment.chief_id ? (
                                <Crown className="h-4 w-4 text-yellow-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{member.name}</p>
                                {member.id === selectedGroupForAssignment.chief_id && (
                                  <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-300">
                                    Chief
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs opacity-75">@{member.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {member.id !== selectedGroupForAssignment.chief_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetGroupChief(member.id, selectedGroupForAssignment.id)}
                                disabled={loading}
                                className="text-yellow-600 hover:text-yellow-700"
                                title="Set as Group Chief"
                              >
                                <Crown className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveUserFromGroup(member.id, selectedGroupForAssignment.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700"
                            >
                              <UserX className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm opacity-75">
                          {memberSearch ? "No members found matching your search" : "No members assigned yet"}
                        </p>
                        <p className="text-xs opacity-50 mt-1">
                          {memberSearch
                            ? "Try a different search term"
                            : "Assign support users from the available list"}
                        </p>
                      </div>
                    )}
                    {selectedGroupForAssignment.members &&
                      selectedGroupForAssignment.members.length > 0 &&
                      filterUsersBySearch(selectedGroupForAssignment.members, memberSearch).length === 0 &&
                      memberSearch && (
                        <div className="text-center py-8">
                          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm opacity-75">No members found matching "{memberSearch}"</p>
                          <p className="text-xs opacity-50 mt-1">Try a different search term</p>
                        </div>
                      )}
                  </div>
                </div>
                {/* Available Users */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium">Available Support Users</h4>
                    </div>
                  </div>
                  {/* Search for available users */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={availableSearch}
                      onChange={(e) => setAvailableSearch(e.target.value)}
                      placeholder="Search available users..."
                      className="pl-10 form-input"
                    />
                    {availableSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAvailableSearch("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(() => {
                      const filteredUsers = filterUsersBySearch(supportUsers, availableSearch)
                      return filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => {
                          const isCurrentMember = selectedGroupForAssignment.members?.some(
                            (member) => member.id === user.id,
                          )
                          return (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 border rounded-lg divider"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isCurrentMember ? "bg-green-100 dark:bg-green-900" : "bg-blue-100 dark:bg-blue-900"
                                  }`}
                                >
                                  {isCurrentMember ? (
                                    <UserCheck className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Users className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{user.name}</p>
                                    {isCurrentMember && (
                                      <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                                        Current Member
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs opacity-75">@{user.username}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {user.groups && user.groups.length > 0 ? (
                                      user.groups.map((group) => (
                                        <Badge key={group.id} variant="outline" className="text-xs">
                                          {group.name}
                                        </Badge>
                                      ))
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        No groups
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {!isCurrentMember && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignUserToGroup(user.id, selectedGroupForAssignment.id)}
                                  disabled={loading}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Assign
                                </Button>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8">
                          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm opacity-75">No users found matching "{availableSearch}"</p>
                          <p className="text-xs opacity-50 mt-1">Try a different search term</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t divider">
                <div className="text-sm opacity-75">
                  {selectedGroupForAssignment.members?.length || 0} members assigned to this group
                  {selectedGroupForAssignment.chief_name && (
                    <span className="ml-2 text-yellow-700 dark:text-yellow-400">
                      • Chief: {selectedGroupForAssignment.chief_name}
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setShowAssignmentOverlay(false)
                    setSelectedGroupForAssignment(null)
                    setMemberSearch("")
                    setAvailableSearch("")
                  }}
                  className="primary-button"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
