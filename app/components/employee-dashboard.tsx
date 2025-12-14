"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Users,
  User,
  ChevronRight,
  X,
  ArrowLeft,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskForm } from "@/components/TaskForm"
interface Tache {
  id: number
  title: string
  description: string
  status: string
  priority: string
  category: string
  employee_name: string
  created_at: string
  expiration?: string
  related_taches?: string
  pole: string
  canal: string
  entite: string
  assigned_member_id?: number
  assigned_to_group?: boolean
  assigned_group_id?: number
  responses?: Array<{
    message: string
    supportName: string
    createdAt: string
  }>
  type: string
}

interface SupportGroup {
  id: number
  name: string
  description?: string
  member_count: number
  chief_name?: string
  members: Array<{
    id: number
    name: string
    username: string
    is_chief?: boolean
  }>
}

interface Setting {
  id: number
  value: string
  color?: string
}

interface EmployeeDashboardProps {
  user: {
    id: number
    name: string
    type: string
  }
}

export default function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [taches, setTaches] = useState<Tache[]>([])
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([])
  const [selectedTache, setSelectedTache] = useState<Tache | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<{
    priorities: Setting[]
    statuses: Setting[]
    categories: Setting[]
    poles: Setting[]
    canals: Setting[]
  }>({
    priorities: [],
    statuses: [],
    categories: [],
    poles: [],
    canals: [],
  })

  const { toast } = useToast()

  const getMemberNameById = (memberId: number): string => {
    for (const group of supportGroups) {
      const member = group.members.find((m) => m.id === memberId)
      if (member) {
        return member.name
      }
    }
    return "Unknown Member"
  }

  const getGroupNameByMemberId = (memberId: number): string => {
    for (const group of supportGroups) {
      const member = group.members.find((m) => m.id === memberId)
      if (member) {
        return group.name
      }
    }
    return "Unknown Group"
  }

  const loadTaches = async () => {
    setLoading(true)
    try {
      const [tachesResponse, settingsResponse, groupsResponse] = await Promise.all([
        fetch(`/api/taches?employeeId=${user.id}`),
        fetch("/api/settings"),
        fetch("/api/groups"),
      ])

      const [tachesData, settingsData, groupsData] = await Promise.all([
        tachesResponse.json(),
        settingsResponse.json(),
        groupsResponse.json(),
      ])

      if (tachesResponse.ok) {
        setTaches(Array.isArray(tachesData.taches) ? tachesData.taches : [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load taches",
          variant: "destructive",
        })
        setTaches([])
      }

      if (settingsResponse.ok) {
        setSettings({
          priorities: settingsData.settings.priorities || [],
          statuses: settingsData.settings.statuses || [],
          categories: settingsData.settings.categories || [],
          poles: settingsData.settings.poles || [],
          canals: settingsData.settings.canals || [],
        })
      }

      if (groupsResponse.ok) {
        const groupsWithMembers = (groupsData.groups || []).filter((group: SupportGroup) => group.member_count > 0)
        setSupportGroups(groupsWithMembers)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
      setTaches([])
      setSupportGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTaches()
    const interval = setInterval(loadTaches, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleCreateTacheSubmit = async (tacheData: Tache) => {
    try {
      const response = await fetch("/api/taches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tacheData),
      })

      if (response.ok) {
        setIsCreateDialogOpen(false)
        toast({
          title: "Success",
          description: `Task created and assigned!`,
        })
        loadTaches()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to create task",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating tache:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
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

  const getSettingColor = (category: string, value: string) => {
    const categorySettings = settings[category] || []
    const setting = categorySettings.find((s) => s.value === value)
    return setting?.color || null
  }

  const getColorFromHex = (hex: string) => {
    if (!hex) return {}
    return {
      backgroundColor: hex + "20",
      borderColor: hex,
      color: hex,
    }
  }

  const getStatusBadgeClasses = (status: string) => {
    const color = getSettingColor("statuses", status)
    if (color) {
      return `border`
    }

    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700"
    }
  }

  const getPriorityBadgeClasses = (priority: string) => {
    const color = getSettingColor("priorities", priority)
    if (color) {
      return `border`
    }

    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700"
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700"
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700"
    }
  }

  const filteredTaches = Array.isArray(taches)
    ? taches.filter(
        (tache) =>
          tache.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tache.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : []

  const TaskTable = ({ tasks, onTaskClick, getStatusIcon, emptyMessage, emptyDescription }) => {
    if (tasks.length === 0) {
      return (
        <div className="standard-card">
          <div className="text-center py-8 sm:py-12">
            <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 empty-state" />
            <p className="text-base sm:text-lg">{emptyMessage}</p>
            <p className="text-xs sm:text-sm mt-2 empty-state">{emptyDescription}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="standard-card p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="table-header">
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  ID
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Title
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">
                  Assigned To
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                  Responses
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divider">
              {tasks.map((tache) => (
                <tr
                  key={tache.id}
                  className="table-row cursor-pointer transition-colors duration-150"
                  onClick={() => onTaskClick(tache)}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(tache.status)}`}
                      style={
                        getSettingColor("statuses", tache.status)
                          ? getColorFromHex(getSettingColor("statuses", tache.status))
                          : {}
                      }
                    >
                      {getStatusIcon(tache.status)}
                      <span className="ml-1.5 capitalize">{tache.status}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                    #{tache.id}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold">
                    <div className="max-w-[120px] sm:max-w-xs truncate">{tache.title}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden sm:table-cell">
                    <div className="flex flex-col">
                      {tache.assigned_to_group ? (
                        <>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="font-medium text-blue-600 dark:text-blue-400">Entire Group</span>
                          </div>
                          <span className="text-xs opacity-75">{tache.entite}</span>
                        </>
                      ) : tache.assigned_member_id ? (
                        <>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {getMemberNameById(tache.assigned_member_id)}
                            </span>
                          </div>
                          <span className="text-xs opacity-75">{getGroupNameByMemberId(tache.assigned_member_id)}</span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="font-medium text-gray-500">Unassigned</span>
                          </div>
                          <span className="text-xs opacity-75">{tache.entite}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">
                    {new Date(tache.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClasses(tache.priority)}`}
                      style={
                        getSettingColor("priorities", tache.priority)
                          ? getColorFromHex(getSettingColor("priorities", tache.priority))
                          : {}
                      }
                    >
                      {tache.priority.toUpperCase()}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden lg:table-cell">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1 opacity-50" />
                      <span>{tache.responses?.length || 0}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold truncate">Employee Dashboard</h2>
              <p className="text-sm sm:text-base opacity-75 mt-1">Create and track your support requests</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="primary-button flex-shrink-0">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] max-h-[95vh] modal-content overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      Create New Task
                    </DialogTitle>
                  </DialogHeader>
                  <TaskForm
                    onSubmit={handleCreateTacheSubmit}
                    onCancel={() => setIsCreateDialogOpen(false)}
                    supportGroups={supportGroups}
                    settings={settings}
                    currentUser={user}
                  />
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={loadTaches}
                disabled={loading}
                className="primary-button flex-shrink-0 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="stats-card">
              <div className="stats-card-header">
                <h3 className="font-semibold text-sm sm:text-base">Pending Incidents</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="stats-icon p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {Array.isArray(taches)
                        ? taches.filter((c) => c.status === "pending" && c.type === "incident").length
                        : 0}
                    </p>
                    <p className="text-xs sm:text-sm opacity-75 truncate">Awaiting Response</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-header">
                <h3 className="font-semibold text-sm sm:text-base">Pending Demandes</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="stats-icon p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {Array.isArray(taches)
                        ? taches.filter((c) => c.status === "pending" && c.type === "demande").length
                        : 0}
                    </p>
                    <p className="text-xs sm:text-sm opacity-75 truncate">Awaiting Response</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-header">
                <h3 className="font-semibold text-sm sm:text-base">Resolved Tasks</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="stats-icon p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {Array.isArray(taches) ? taches.filter((c) => c.status === "resolved").length : 0}
                    </p>
                    <p className="text-xs sm:text-sm opacity-75 truncate">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-header">
                <h3 className="font-semibold text-sm sm:text-base">Total Tasks</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="stats-icon p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-2xl sm:text-3xl font-bold">{Array.isArray(taches) ? taches.length : 0}</p>
                    <p className="text-xs sm:text-sm opacity-75 truncate">All Time</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg sm:text-xl font-semibold">My Tasks</h3>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
                <Input
                  placeholder="Search tasks..."
                  className="form-input pl-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="incidents" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="incidents" className="text-sm">
                  Incidents (
                  {Array.isArray(taches)
                    ? taches.filter(
                        (t) =>
                          t.type === "incident" &&
                          (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.description.toLowerCase().includes(searchQuery.toLowerCase())),
                      ).length
                    : 0}
                  )
                </TabsTrigger>
                <TabsTrigger value="demandes" className="text-sm">
                  Demandes (
                  {Array.isArray(taches)
                    ? taches.filter(
                        (t) =>
                          t.type === "demande" &&
                          (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.description.toLowerCase().includes(searchQuery.toLowerCase())),
                      ).length
                    : 0}
                  )
                </TabsTrigger>
              </TabsList>

              <TabsContent value="incidents" className="mt-6">
                {loading ? (
                  <div className="standard-card">
                    <div className="text-center py-8 sm:py-12">
                      <RefreshCw className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 animate-spin loading-spinner" />
                      <p className="text-base sm:text-lg">Loading incidents...</p>
                    </div>
                  </div>
                ) : (
                  <TaskTable
                    tasks={filteredTaches.filter((t) => t.type === "incident")}
                    onTaskClick={setSelectedTache}
                    getStatusIcon={getStatusIcon}
                    emptyMessage="No incidents found"
                    emptyDescription={
                      searchQuery ? "Try adjusting your search criteria" : "Create your first incident to get started"
                    }
                  />
                )}
              </TabsContent>

              <TabsContent value="demandes" className="mt-6">
                {loading ? (
                  <div className="standard-card">
                    <div className="text-center py-8 sm:py-12">
                      <RefreshCw className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 animate-spin loading-spinner" />
                      <p className="text-base sm:text-lg">Loading demandes...</p>
                    </div>
                  </div>
                ) : (
                  <TaskTable
                    tasks={filteredTaches.filter((t) => t.type === "demande")}
                    onTaskClick={setSelectedTache}
                    getStatusIcon={getStatusIcon}
                    emptyMessage="No demandes found"
                    emptyDescription={
                      searchQuery ? "Try adjusting your search criteria" : "Create your first demande to get started"
                    }
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog
        open={!!selectedTache}
        onOpenChange={(open) => {
          if (!open) setSelectedTache(null)
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] modal-content overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTache && (
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <div
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(selectedTache.status)}`}
                    style={
                      getSettingColor("statuses", selectedTache.status)
                        ? getColorFromHex(getSettingColor("statuses", selectedTache.status))
                        : {}
                    }
                  >
                    {getStatusIcon(selectedTache.status)}
                    <span className="ml-1.5 capitalize">{selectedTache.status}</span>
                  </div>
                  <span className="text-base sm:text-lg font-semibold opacity-75">#{selectedTache.id}:</span>
                  <span className="text-lg sm:text-xl font-bold">{selectedTache.title}</span>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTache && (
            <div className="space-y-4 sm:space-y-6 py-4">
              {/* Task Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="standard-card">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide mb-3 border-b divider pb-2">
                    Task Details
                  </h3>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Type:</span>
                      <span className="font-semibold capitalize">{selectedTache.type}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Category:</span>
                      <span className="font-semibold capitalize">{selectedTache.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Group:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedTache.entite}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Assignment:</span>
                      <div className="flex items-center gap-1">
                        {selectedTache.assigned_to_group ? (
                          <>
                            <Users className="h-3 w-3" />
                            <span className="font-semibold text-blue-600 dark:text-blue-400">Entire Group</span>
                          </>
                        ) : selectedTache.assigned_member_id ? (
                          <>
                            <User className="h-3 w-3" />
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {getMemberNameById(selectedTache.assigned_member_id)}
                            </span>
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            <span className="font-semibold text-gray-500">Unassigned</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Priority:</span>
                      <div
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClasses(selectedTache.priority)}`}
                        style={
                          getSettingColor("priorities", selectedTache.priority)
                            ? getColorFromHex(getSettingColor("priorities", selectedTache.priority))
                            : {}
                        }
                      >
                        {selectedTache.priority.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="standard-card">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide mb-3 border-b divider pb-2">
                    Dates & Timeline
                  </h3>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Created:</span>
                      <span className="font-semibold">{new Date(selectedTache.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Expiration:</span>
                      <span className="font-semibold">
                        {selectedTache.expiration ? new Date(selectedTache.expiration).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Related:</span>
                      <span className="font-semibold">{selectedTache.related_taches || "None"}</span>
                    </div>
                  </div>
                </div>

                <div className="standard-card">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide mb-3 border-b divider pb-2">
                    Organization
                  </h3>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Department:</span>
                      <span className="font-semibold capitalize">{selectedTache.pole}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Channel:</span>
                      <span className="font-semibold capitalize">{selectedTache.canal}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="opacity-75 font-medium">Responses:</span>
                      <span className="font-semibold">{selectedTache.responses?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="standard-card">
                <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b divider pb-2">Description</h3>
                <div className="p-3 sm:p-4 rounded-lg border divider">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{selectedTache.description}</p>
                </div>
              </div>

              {/* Responses */}
              {selectedTache.responses && selectedTache.responses.length > 0 && (
                <div className="standard-card">
                  <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b divider pb-2">
                    Support Responses ({selectedTache.responses.length})
                  </h4>
                  <div className="space-y-3 sm:space-y-4 max-h-48 sm:max-h-64 overflow-y-auto custom-scrollbar">
                    {selectedTache.responses.map((response, index) => (
                      <div key={index} className="p-3 sm:p-4 rounded-lg border-l-4 border-l-primary">
                        <p className="text-xs sm:text-sm mb-2">{response.message}</p>
                        <p className="text-xs opacity-75">
                          <span className="font-semibold">{response.supportName}</span> •{" "}
                          {new Date(response.createdAt).toLocaleDateString()} at{" "}
                          {new Date(response.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
          border: none;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.7);
        }
        
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  )
}