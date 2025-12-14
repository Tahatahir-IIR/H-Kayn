"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Search,
  RefreshCw,
  Users,
  Timer,
  X,
  Archive,
  Edit,
  Check,
  Send,
  MessageCircle,
  Mail,
  Building,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskForm } from "@/components/TaskForm" 
import { Badge } from "@/components/ui/badge"
import { EmailSenderDialog } from "@/components/email-sender-dialog"   
import { EmailGroupManager } from "@/components/email-group-manager" 

interface Tache {
  id: number
  title: string
  description: string
  status: string
  priority: string
  category: string
  employee_name: string
  employee_id: number
  created_at: string
  expiration?: string
  related_taches?: string
  pole: string
  canal: string
  entite: string
  assigned_to_group?: boolean
  assigned_group_id?: number
  assigned_member_id?: number
  total_session_time?: number
  responses?: Array<{
    message: string
    supportName: string
    createdAt: string
  }>
  comments?: Array<{
    id: number
    user_id: number
    user_name: string
    user_type: string
    message: string
    created_at: string
  }>
  type: string
}

interface SupportGroup {
  id: number
  name: string
  description: string
  chief_name?: string
  members: Array<{
    id: number
    name: string
    username: string
    type: string
    is_chief: boolean
  }>
  chief: {
    id: number
    name: string
    username: string
    type: string
    is_chief: boolean
  } | null
}

interface ActiveSession {
  user_id: number
  user_name: string
  user_type: string
  session_duration: number
}

interface Setting {
  id: number
  value: string
  color?: string
}

interface SupportDashboardProps {
  user: {
    id: number
    name: string
    type: string
  }
}

export default function SupportDashboard({ user }: SupportDashboardProps) {
  const [taches, setTaches] = useState<Tache[]>([])
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([])
  const [selectedTache, setSelectedTache] = useState<Tache | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false) 
  const [isEmailGroupManagerOpen, setIsEmailGroupManagerOpen] = useState(false) 
  const [searchQuery, setSearchQuery] = useState("")
  const [resolvedSearchQuery, setResolvedSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
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

  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentMessage, setCommentMessage] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  const [currentUserSessionTime, setCurrentUserSessionTime] = useState(0)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [totalTaskTime, setTotalTaskTime] = useState(0)

  const { toast } = useToast()
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionPollIntervalRef = useRef<NodeJS.Timeout | null>(null) 
  const sessionStartRef = useRef<number>(0)
  const lastUpdateRef = useRef<number>(0)
  const isSessionActiveRef = useRef(false) // Indicates if *any* session is currently being tracked by this component

  // Helper function to get member name by ID
  const getMemberNameById = (memberId: number): string => {
    for (const group of supportGroups) {
      const member = group.members.find((m) => m.id === memberId)
      if (member) {
        return member.name
      }
    }
    return "Unknown Member"
  }

  // Helper function to get group name by ID
  const getGroupNameById = (groupId: number): string => {
    const group = supportGroups.find((g) => g.id === groupId)
    return group ? group.name : "Unknown Group"
  }

  // Helper function to get group by ID
  const getGroupById = (groupId: number): SupportGroup | null => {
    return supportGroups.find((group) => group.id === groupId) || null
  }

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, 0)}`
  }

  // Load support groups
  const loadSupportGroups = async () => {
    try {
      const response = await fetch("/api/groups")
      if (response.ok) {
        const data = await response.json()
        setSupportGroups(Array.isArray(data.groups) ? data.groups : [])
      }
    } catch (error) {
      console.error("Error loading support groups:", error)
    }
  }

  // Load taches from API
  const loadTaches = async () => {
    setLoading(true)
    try {
      const [tachesResponse, settingsResponse] = await Promise.all([
        fetch(`/api/taches?supportUserId=${user.id}`),
        fetch("/api/settings"),
      ])

      const [tachesData, settingsData] = await Promise.all([tachesResponse.json(), settingsResponse.json()])

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
    } catch (error) {
      console.error("Error loading taches:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
      setTaches([])
    } finally {
      setLoading(false)
    }
  }

  // Load task with session information
  const loadTaskWithSessions = async (tacheId: number) => {
    try {
      const response = await fetch(`/api/taches/${tacheId}/sessions`)
      if (response.ok) {
        const data = await response.json()
        setActiveSessions(Array.isArray(data.activeSessions) ? data.activeSessions : [])
        setTotalTaskTime(data.totalTaskTime || 0)
      }
    } catch (error) {
      console.error("Error loading task sessions:", error)
    }
  }

  // Session management functions
  const startSession = async (tacheId: number) => {
    // If a session is already active for this task, or if we're already trying to start one, do nothing.
    if (isSessionActiveRef.current && selectedTache?.id === tacheId) {
      return
    }

    // Clear any existing intervals to prevent duplicates
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current)
      sessionIntervalRef.current = null
    }
    if (sessionPollIntervalRef.current) {
      clearInterval(sessionPollIntervalRef.current)
      sessionPollIntervalRef.current = null
    }

    isSessionActiveRef.current = true 
    sessionStartRef.current = Date.now()
    setCurrentUserSessionTime(0) // Reset current session time for display
    lastUpdateRef.current = 0

    try {
      const response = await fetch(`/api/taches/${tacheId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          user_name: user.name,
          user_type: user.type,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setActiveSessions(Array.isArray(data.activeSessions) ? data.activeSessions : [])
        setTotalTaskTime(data.totalTaskTime || 0)
      }
    } catch (error) {
      console.error("Error starting session:", error)
      isSessionActiveRef.current = false // If API call fails, mark as inactive
      return // Exit if initial session creation fails
    }

    // Start local timer
    sessionIntervalRef.current = setInterval(() => {
      if (!isSessionActiveRef.current) {
        clearInterval(sessionIntervalRef.current!)
        sessionIntervalRef.current = null
        return
      }

      const currentTime = Math.floor((Date.now() - sessionStartRef.current) / 1000)
      setCurrentUserSessionTime(currentTime)

      if (currentTime > 0 && currentTime % 5 === 0 && currentTime !== lastUpdateRef.current) {
        lastUpdateRef.current = currentTime
        updateSessionInDatabase(tacheId, 5)
      }
    }, 1000)

    // Start polling for other active sessions
    sessionPollIntervalRef.current = setInterval(async () => {
      if (!isSessionActiveRef.current) {
        clearInterval(sessionPollIntervalRef.current!)
        sessionPollIntervalRef.current = null
        return
      }
      try {
        const response = await fetch(`/api/taches/${tacheId}/sessions`)
        if (response.ok) {
          const data = await response.json()
          setActiveSessions(Array.isArray(data.activeSessions) ? data.activeSessions : [])
          setTotalTaskTime(data.totalTaskTime || 0)
        }
      } catch (error) {
        console.error("Error polling sessions:", error)
      }
    }, 3000)
  }

  const stopSession = async (tacheId: number) => {
    // Only attempt to stop if a session was actually active for this task
    if (!isSessionActiveRef.current || selectedTache?.id !== tacheId) {
      return
    }

    // Clear all intervals
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current)
      sessionIntervalRef.current = null
    }
    if (sessionPollIntervalRef.current) {
      clearInterval(sessionPollIntervalRef.current)
      sessionPollIntervalRef.current = null
    }

    isSessionActiveRef.current = false 

    const finalTime = Math.floor((Date.now() - sessionStartRef.current) / 1000)
    if (finalTime > lastUpdateRef.current) {
      const remainingTime = finalTime - lastUpdateRef.current
      await updateSessionInDatabase(tacheId, remainingTime, true)
    }

    setCurrentUserSessionTime(0)
    setActiveSessions([])
  }

  const updateSessionInDatabase = async (tacheId: number, timeIncrement: number, isClosing = false) => {
    try {
      if (isClosing) {
        // Use DELETE for closing, with session_time in body
        const response = await fetch(`/api/taches/${tacheId}/sessions?userId=${user.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_time: timeIncrement,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setTotalTaskTime(data.totalTaskTime || 0)
        }
      } else {
        // Use POST for regular updates
        const response = await fetch(`/api/taches/${tacheId}/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            user_name: user.name,
            user_type: user.type,
            session_time: timeIncrement,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setTotalTaskTime(data.totalTaskTime || 0)
        }
      }
    } catch (error) {
      console.error("Error updating session:", error)
    }
  }

  useEffect(() => {
    loadSupportGroups()
    loadTaches()
    const interval = setInterval(loadTaches, 15000)
    return () => clearInterval(interval)
  }, [])

  // This useEffect handles stopping the session when selectedTache changes 
  useEffect(() => {
    return () => {
      // `selectedTache` here refers to the value *before* the change that triggered the cleanup.
      if (selectedTache) {
        stopSession(selectedTache.id)
      }
    }
  }, [selectedTache])

  // Handle session cleanup on browser tab close/refresh
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (selectedTache && isSessionActiveRef.current) {
        const finalTime = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        const timeToSend = finalTime - lastUpdateRef.current;

        // Use sendBeacon for more reliable data transmission on unload
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify({ session_time: timeToSend })], { type: 'application/json' });
          navigator.sendBeacon(`/api/taches/${selectedTache.id}/sessions?userId=${user.id}`, blob);
        } else {
          // Fallback for older browsers, less reliable but better than nothing
          fetch(`/api/taches/${selectedTache.id}/sessions?userId=${user.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_time: timeToSend }),
            keepalive: true, 
          }).catch(e => console.error("Failed to send beacon/fetch on unload:", e));
        }
      }
      // Don't prevent default, let the page unload
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedTache, user.id]); 


  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!commentMessage.trim() || !selectedTache) {
      toast({
        title: "Error",
        description: "Please enter a comment message.",
        variant: "destructive",
      })
      return
    }

    setSubmittingComment(true)
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tache_id: selectedTache.id,
          user_id: user.id,
          user_name: user.name,
          user_type: user.type,
          message: commentMessage.trim(),
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Add the new comment to the selected task
        const newComment = {
          id: result.comment_id,
          user_id: user.id,
          user_name: user.name,
          user_type: user.type,
          message: commentMessage.trim(),
          created_at: new Date().toISOString(),
        }

        setSelectedTache((prev) =>
          prev
            ? {
                ...prev,
                comments: [...(prev.comments || []), newComment],
              }
            : null,
        )

        setCommentMessage("")
        setShowCommentForm(false)

        // Show success message with email status
        toast({
          title: "Comment Added",
          description: result.email_sent
            ? "Comment added and internal email notification sent to employee."
            : "Comment added but internal email notification failed to send.",
          variant: result.email_sent ? "default" : "destructive",
        })

        // Reload tasks to get updated data
        loadTaches()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to add comment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle status change from header
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTache) return

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tache_id: selectedTache.id,
          support_id: user.id,
          support_name: user.name,
          message: `Status updated to ${newStatus}`,
          new_status: newStatus,
        }),
      })

      if (response.ok) {
        toast({
          title: "Status Updated",
          description: `Task status changed to ${newStatus}`,
        })

        setSelectedTache({ ...selectedTache, status: newStatus })
        loadTaches()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to update status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
  }

  // Handle terminer button - mark as resolved
  const handleTerminer = async () => {
    if (!selectedTache) return

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tache_id: selectedTache.id,
          support_id: user.id,
          support_name: user.name,
          message: "Task marked as resolved",
          new_status: "resolved",
        }),
      })

      if (response.ok) {
        toast({
          title: "Task Completed",
          description: "Task has been marked as resolved",
        })

        setSelectedTache({ ...selectedTache, status: "resolved" })
        loadTaches()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to mark task as resolved",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error marking task as resolved:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    }
  }

  // Handle editer button - open edit dialog
  const handleEditer = () => {
    setIsEditDialogOpen(true)
  }

  const handleEditTacheSubmit = async (updatedTacheData: Tache) => {
    if (!selectedTache?.id) return;

    try {
      const response = await fetch(`/api/taches/${selectedTache.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTacheData),
      });

      if (response.ok) {
        setIsEditDialogOpen(false);
        toast({
          title: "Success",
          description: "Task updated successfully!",
        });
        loadTaches(); // Reload all taches to reflect changes
        setSelectedTache(prev => prev ? { ...prev, ...updatedTacheData } : null); // Update selected tache in state
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update task",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating tache:", error);
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    }
  };

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

  const openTacheDetails = async (tache: Tache) => {
    setSelectedTache(tache)
    setIsDialogOpen(true)
    // Reset session-related states immediately when opening a new task
    setCurrentUserSessionTime(0)
    setActiveSessions([])
    setTotalTaskTime(0) 

    await loadTaskWithSessions(tache.id)
    await startSession(tache.id)
  }

  const closeTacheDetails = async () => {
    if (selectedTache) {
      await stopSession(selectedTache.id)
    }
    setIsDialogOpen(false)
    setSelectedTache(null)
    setShowCommentForm(false)
    setCommentMessage("")
  }

  // Filter tasks based on active tab
  const activeTaches = Array.isArray(taches)
    ? taches.filter((t) => t.status !== "resolved" && t.status !== "rejected")
    : []
  const resolvedTaches = Array.isArray(taches)
    ? taches.filter((t) => t.status === "resolved" || t.status === "rejected")
    : []

  // Apply search filters
  const filteredActiveTaches = activeTaches.filter(
    (tache) =>
      tache.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tache.employee_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredResolvedTaches = resolvedTaches.filter(
    (tache) =>
      tache.title.toLowerCase().includes(resolvedSearchQuery.toLowerCase()) ||
      tache.employee_name.toLowerCase().includes(resolvedSearchQuery.toLowerCase()) ||
      tache.description.toLowerCase().includes(resolvedSearchQuery.toLowerCase()),
  )

  // Task Table Component
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
                  Employee
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                  Assigned To
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider">
                  Priority
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
                    <div className="max-w-[100px] truncate">{tache.employee_name}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm hidden md:table-cell">
                    <div className="max-w-[100px] truncate font-medium text-blue-600 dark:text-blue-400">
                      {tache.assigned_member_id
                        ? getMemberNameById(tache.assigned_member_id)
                        : tache.assigned_group_id
                          ? getGroupNameById(tache.assigned_group_id)
                          : tache.entite}
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
              <h2 className="text-2xl sm:text-3xl font-bold truncate">Support Dashboard</h2>
              <p className="text-sm sm:text-base opacity-75 mt-1">
                Manage and respond to employee taches assigned to your groups
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Active Session Indicator */}
              {isSessionActiveRef.current && (
                <div className="session-active p-3 rounded-lg flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 animate-pulse flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">My Session</p>
                      <p className="text-sm font-mono font-bold">{formatTime(currentUserSessionTime)}</p>
                    </div>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setIsEmailGroupManagerOpen(true)}
                className="primary-button flex-shrink-0 bg-transparent"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Email Groups</span>
              </Button>
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
                <h3 className="font-semibold text-sm sm:text-base">Active Incidents</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="stats-icon p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {activeTaches.filter((c) => c.type === "incident").length}
                    </p>
                    <p className="text-xs sm:text-sm opacity-75 truncate">Awaiting Response</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-card-header">
                <h3 className="font-semibold text-sm sm:text-base">Active Demandes</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="stats-icon p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {activeTaches.filter((c) => c.type === "demande").length}
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
                    <p className="text-2xl sm:text-3xl font-bold">{resolvedTaches.length}</p>
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
                    <p className="text-xs sm:text-sm opacity-75 truncate">Assigned to Your Groups</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" className="text-sm">
                Active Tasks ({activeTaches.length})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="text-sm flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Resolved Tasks ({resolvedTaches.length})
              </TabsTrigger>
            </TabsList>

            {/* Active Tasks Tab */}
            <TabsContent value="active" className="mt-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg sm:text-xl font-semibold">Active Support Tasks</h3>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
                    <Input
                      placeholder="Search active tasks..."
                      className="form-input pl-10 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Tabs defaultValue="incidents" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="incidents" className="text-sm">
                      Incidents ({filteredActiveTaches.filter((t) => t.type === "incident").length})
                    </TabsTrigger>
                    <TabsTrigger value="demandes" className="text-sm">
                      Demandes ({filteredActiveTaches.filter((t) => t.type === "demande").length})
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
                        tasks={filteredActiveTaches.filter((t) => t.type === "incident")}
                        onTaskClick={openTacheDetails}
                        getStatusIcon={getStatusIcon}
                        emptyMessage="No active incidents assigned to your groups"
                        emptyDescription={
                          searchQuery
                            ? "Try adjusting your search criteria"
                            : "No active incidents available for your assigned groups"
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
                        tasks={filteredActiveTaches.filter((t) => t.type === "demande")}
                        onTaskClick={openTacheDetails}
                        getStatusIcon={getStatusIcon}
                        emptyMessage="No active demandes assigned to your groups"
                        emptyDescription={
                          searchQuery
                            ? "Try adjusting your search criteria"
                            : "No active demandes available for your assigned groups"
                        }
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            {/* Resolved Tasks Tab */}
            <TabsContent value="resolved" className="mt-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Resolved Support Tasks
                  </h3>
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
                    <Input
                      placeholder="Search resolved tasks..."
                      className="form-input pl-10 w-full"
                      value={resolvedSearchQuery}
                      onChange={(e) => setResolvedSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Tabs defaultValue="incidents" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="incidents" className="text-sm">
                      Resolved Incidents ({filteredResolvedTaches.filter((t) => t.type === "incident").length})
                    </TabsTrigger>
                    <TabsTrigger value="demandes" className="text-sm">
                      Resolved Demandes ({filteredResolvedTaches.filter((t) => t.type === "demande").length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="incidents" className="mt-6">
                    {loading ? (
                      <div className="standard-card">
                        <div className="text-center py-8 sm:py-12">
                          <RefreshCw className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 animate-spin loading-spinner" />
                          <p className="text-base sm:text-lg">Loading resolved incidents...</p>
                        </div>
                      </div>
                    ) : (
                      <TaskTable
                        tasks={filteredResolvedTaches.filter((t) => t.type === "incident")}
                        onTaskClick={openTacheDetails}
                        getStatusIcon={getStatusIcon}
                        emptyMessage="No resolved incidents found"
                        emptyDescription={
                          resolvedSearchQuery
                            ? "Try adjusting your search criteria"
                            : "No resolved incidents available for your assigned groups"
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
                        tasks={filteredResolvedTaches.filter((t) => t.type === "demande")}
                        onTaskClick={openTacheDetails}
                        getStatusIcon={getStatusIcon}
                        emptyMessage="No resolved demandes found"
                        emptyDescription={
                          resolvedSearchQuery
                            ? "Try adjusting your search criteria"
                            : "No resolved demandes available for your assigned groups"
                        }
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeTacheDetails()
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[95vh] modal-content [&>button]:hidden overflow-hidden">
          <div className="flex flex-col h-full max-h-[95vh]">
            <DialogHeader className="border-b divider pb-4 flex-shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0 flex-1">
                  {selectedTache ? (
                    <>
                      {/* Status Badge - Capsule shaped dropdown */}
                      <Select value={selectedTache.status} onValueChange={handleStatusChange}>
                        <SelectTrigger
                          className={`h-8 px-3 rounded-full flex-shrink-0 w-30 max-w-[120px] transition-colors duration-200 ${getStatusBadgeClasses(selectedTache.status)}`}
                          style={
                            getSettingColor("statuses", selectedTache.status)
                              ? getColorFromHex(getSettingColor("statuses", selectedTache.status))
                              : {}
                          }
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(selectedTache.status)}
                            <span className="capitalize font-medium">{selectedTache.status}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {settings.statuses.map((status) => (
                            <SelectItem key={status.id} value={status.value}>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(status.value)}
                                <span className="capitalize">{status.value}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-base sm:text-lg font-semibold opacity-75 flex-shrink-0">
                        #{selectedTache.id}:
                      </span>
                      <span className="text-lg sm:text-xl font-bold min-w-0 truncate">{selectedTache.title}</span>
                      <span className="text-base sm:text-lg opacity-50 hidden sm:inline flex-shrink-0">//</span>
                      <span className="text-base sm:text-lg font-medium opacity-75 truncate">
                        {selectedTache.employee_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg sm:text-xl font-bold">Task Details</span>
                  )}
                </div>

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeTacheDetails}
                  className="h-8 w-8 rounded-full flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </DialogHeader>

            {selectedTache && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                <div className="space-y-4 sm:space-y-6">
                  {/* Three Column Info Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Task Information - Left Column */}
                    <div className="standard-card">
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide mb-3 border-b divider pb-2">
                        Task Information
                      </h3>
                      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Project:</span>
                          <span className="font-semibold">{new Date(selectedTache.created_at).getFullYear()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Created:</span>
                          <span className="font-semibold text-right">
                            {new Date(selectedTache.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Category:</span>
                          <span className="font-semibold capitalize text-right">{selectedTache.category}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Creator:</span>
                          <span className="font-semibold text-right truncate max-w-[120px]">
                            {selectedTache.employee_name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Assigned Group:</span>
                          <span className="font-semibold text-right text-blue-600 dark:text-blue-400">
                            {selectedTache.assigned_group_id
                              ? getGroupNameById(selectedTache.assigned_group_id)
                              : selectedTache.entite}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Expiration:</span>
                          <span className="font-semibold text-right">
                            {selectedTache.expiration ? new Date(selectedTache.expiration).toLocaleDateString() : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Related:</span>
                          <span className="font-semibold text-right">{selectedTache.related_taches || "None"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Department:</span>
                          <span className="font-semibold capitalize text-right">{selectedTache.pole}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Channel:</span>
                          <span className="font-semibold capitalize text-right">{selectedTache.canal}</span>
                        </div>
                      </div>
                    </div>

                    {/* Affecté Section - Middle Column */}
                    <div className="standard-card">
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide mb-3 border-b divider pb-2">
                        Affecté
                      </h3>
                      <div className="flex flex-col items-center space-y-3">
                        {/* Profile Image Placeholder */}
                        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>

                        {/* Assignment Information */}
                        <div className="text-center">
                          {selectedTache.assigned_member_id ? (
                            // Individual member assignment
                            <div>
                              <p className="font-semibold text-sm">
                                {getMemberNameById(selectedTache.assigned_member_id)}
                              </p>
                            </div>
                          ) : selectedTache.assigned_group_id ? (
                            // Group assignment - show chief and member count
                            (() => {
                              const group = getGroupById(selectedTache.assigned_group_id)
                              const memberCount = group ? group.members.length : 0
                              const chiefName = group?.chief?.name || group?.chief_name || "No Chief"
                              const othersCount = Math.max(0, memberCount - 1)

                              return (
                                <div>
                                  <p className="font-semibold text-sm">
                                    {chiefName} and {othersCount} other{othersCount !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              )
                            })()
                          ) : (
                            // Fallback to entite
                            <div>
                              <p className="font-semibold text-sm">{selectedTache.entite}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Session Information - Right Column */}
                    <div className="standard-card">
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide mb-3 border-b divider pb-2">
                        Session Information
                      </h3>
                      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        <div className="flex justify-between items-center">
                          <span className="opacity-75 font-medium">Total Time:</span>
                          <span className="font-mono font-bold">{formatTime(totalTaskTime)}</span>
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

                        {/* Currently Viewing - Always show */}
                        <div className="mt-4">
                          <h5 className="text-xs font-medium mb-2 flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            Currently Viewing ({activeSessions.length})
                          </h5>
                          {activeSessions.length > 0 ? (
                            <div className="space-y-2">
                              {activeSessions.map((session) => (
                                <div
                                  key={session.user_id}
                                  className="flex items-center space-x-2 p-2 rounded-lg border divider"
                                >
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center border divider flex-shrink-0">
                                    <User className="h-3 w-3" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{session.user_name}</p>
                                    <p className="text-xs opacity-75 capitalize">{session.user_type}</p>
                                  </div>
                                  <div className="text-xs font-mono font-bold px-1 py-0.5 rounded border divider flex-shrink-0">
                                    {formatTime(session.session_duration || 0)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <p className="text-xs opacity-50">No one is currently viewing this task</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={handleTerminer}
                      disabled={selectedTache.status === "resolved"}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4" />
                      Terminer
                    </Button>
                    <Button onClick={handleEditer} variant="outline" className="flex items-center gap-2 bg-transparent">
                      <Edit className="h-4 w-4" />
                      Éditer
                    </Button>
                    <Button onClick={() => setIsEmailDialogOpen(true)} variant="outline" className="flex items-center gap-2 bg-transparent">
                      <Mail className="h-4 w-4" />
                      Envoyer Demande
                    </Button>
                  </div>

                  {/* Description Section */}
                  <div className="standard-card">
                    <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b divider pb-2">
                      Task Description
                    </h3>
                    <div className="p-3 sm:p-4 rounded-lg border divider">
                      <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedTache.description}
                      </p>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {selectedTache.comments && selectedTache.comments.length > 0 && (
                    <div className="standard-card">
                      <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b divider pb-2 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Comments ({selectedTache.comments.length})
                      </h4>
                      <div className="space-y-3 sm:space-y-4 max-h-48 sm:max-h-64 overflow-y-auto custom-scrollbar">
                        {selectedTache.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3 p-3 sm:p-4 rounded-lg border divider">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-sm">
                                {comment.user_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-sm">{comment.user_name}</span>
                                <span className="text-xs opacity-75 capitalize">({comment.user_type})</span>
                                <span className="text-xs opacity-50">•</span>
                                <span className="text-xs opacity-75">
                                  {new Date(comment.created_at).toLocaleDateString()} at{" "}
                                  {new Date(comment.created_at).toLocaleTimeString()}
                                </span>
                                <div className="flex items-center gap-1 ml-auto">
                                  <Building className="h-3 w-3 text-blue-600" title="Internal company email" />
                                  <Mail className="h-3 w-3 text-green-600" title="Email sent to employee" />
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                {comment.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Responses */}
                  {selectedTache.responses && selectedTache.responses.length > 0 && (
                    <div className="standard-card">
                      <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b divider pb-2">
                        Previous Responses ({selectedTache.responses.length})
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

                  {/* Commentary System - Only show for active tasks */}
                  {selectedTache.status !== "resolved" && selectedTache.status !== "rejected" && (
                    <div className="standard-card">
                      {!showCommentForm ? (
                        <div className="text-center py-6">
                          <Button
                            onClick={() => setShowCommentForm(true)}
                            className="flex items-center gap-2 primary-button"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Add Comment
                          </Button>
                          <p className="text-xs opacity-75 mt-2">
                            Comments are sent via internal company email to the employee
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 border-b divider pb-2 flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Add Internal Comment
                          </h4>

                          <div>
                            <label className="form-label">Comment Message</label>
                            <Textarea
                              value={commentMessage}
                              onChange={(e) => setCommentMessage(e.target.value)}
                              placeholder="Type your internal comment here... (This will be sent to the employee via company email)"
                              rows={4}
                              className="form-input resize-none"
                            />
                            <p className="text-xs opacity-75 mt-1 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              This comment will be sent from your company email to the employee's company email
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t divider">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowCommentForm(false)
                                setCommentMessage("")
                              }}
                              className="order-2 sm:order-1 bg-transparent"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleCommentSubmit}
                              disabled={!commentMessage.trim() || submittingComment}
                              className="primary-button order-1 sm:order-2"
                            >
                              {submittingComment ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send Internal Comment
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] modal-content overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Task #{selectedTache?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedTache && (
            <TaskForm
              initialData={selectedTache}
              onSubmit={handleEditTacheSubmit}
              onCancel={() => setIsEditDialogOpen(false)}
              supportGroups={supportGroups}
              settings={settings}
              currentUser={user}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Email Sender Dialog */}
      <EmailSenderDialog
        isOpen={isEmailDialogOpen}
        onClose={() => setIsEmailDialogOpen(false)}
        tache={selectedTache}
      />

      {/* Email Group Manager Dialog */}
      <EmailGroupManager
        isOpen={isEmailGroupManagerOpen}
        onClose={() => setIsEmailGroupManagerOpen(false)}
      />

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