"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, Search, Users, User, ChevronRight, X, ArrowLeft, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Tache {
  id?: number
  title: string
  description: string
  status?: string
  priority: string
  category: string
  employee_name?: string
  employee_id?: number
  created_at?: string
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

interface TaskFormProps {
  initialData?: Tache | null
  onSubmit: (tache: Tache) => void
  onCancel: () => void
  supportGroups: SupportGroup[]
  settings: {
    priorities: Setting[]
    statuses: Setting[]
    categories: Setting[]
    poles: Setting[]
    canals: Setting[]
  }
  currentUser: {
    id: number
    name: string
    type: string
  }
}

export function TaskForm({ initialData, onSubmit, onCancel, supportGroups, settings, currentUser }: TaskFormProps) {
  const isEditing = !!initialData
  const { toast } = useToast()

  const [formData, setFormData] = useState<Tache>(
    initialData || {
      title: "",
      type: "incident",
      category: "",
      entite: "",
      expiration: "",
      related_taches: "",
      pole: "",
      canal: "",
      description: "",
      priority: "medium",
      employee_id: currentUser.id,
      employee_name: currentUser.name,
    }
  )

  const [selectedAssignment, setSelectedAssignment] = useState<{
    type: "group" | "member"
    id: number
    name: string
    groupName?: string
  } | null>(() => {
    if (initialData) {
      if (initialData.assigned_to_group && initialData.assigned_group_id) {
        const group = supportGroups.find(g => g.id === initialData.assigned_group_id);
        return group ? { type: "group", id: group.id, name: group.name } : null;
      } else if (initialData.assigned_member_id) {
        for (const group of supportGroups) {
          const member = group.members.find(m => m.id === initialData.assigned_member_id);
          if (member) {
            return { type: "member", id: member.id, name: member.name, groupName: group.name };
          }
        }
        return null;
      }
    }
    return null;
  });

  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.assigned_to_group && initialData.assigned_group_id) {
        const group = supportGroups.find(g => g.id === initialData.assigned_group_id);
        setSelectedAssignment(group ? { type: "group", id: group.id, name: group.name } : null);
      } else if (initialData.assigned_member_id) {
        for (const group of supportGroups) {
          const member = group.members.find(m => m.id === initialData.assigned_member_id);
          if (member) {
            setSelectedAssignment({ type: "member", id: member.id, name: member.name, groupName: group.name });
            break;
          }
        }
      } else {
        setSelectedAssignment(null);
      }
    }
  }, [initialData, supportGroups]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleGroupSelect = (group: SupportGroup) => {
    setSelectedAssignment({
      type: "group",
      id: group.id,
      name: group.name,
    })
    setIsMemberSelectorOpen(false)
  }

  const handleMemberSelect = (member: { id: number; name: string }, groupName: string) => {
    setSelectedAssignment({
      type: "member",
      id: member.id,
      name: member.name,
      groupName: groupName,
    })
    setIsMemberSelectorOpen(false)
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !selectedAssignment) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and select assignment.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const tacheDataToSend: Tache = {
        ...formData,
        entite: selectedAssignment.type === "group" ? selectedAssignment.name : selectedAssignment.groupName || "",
        assigned_member_id: selectedAssignment.type === "member" ? selectedAssignment.id : null,
        assigned_to_group: selectedAssignment.type === "group",
        assigned_group_id: selectedAssignment.type === "group" ? selectedAssignment.id : null,
        employee_id: initialData?.employee_id || currentUser.id, // Keep original employee_id for edits
        employee_name: initialData?.employee_name || currentUser.name, // Keep original employee_name for edits
      }

      // Remove properties that are not part of the database schema for update
      if (isEditing) {
        delete tacheDataToSend.created_at;
        delete tacheDataToSend.responses;
        delete tacheDataToSend.comments;
        delete tacheDataToSend.total_session_time;
        delete tacheDataToSend.status; // Status is handled separately or should not be changed via this form
      }

      onSubmit(tacheDataToSend)
    } catch (error) {
      console.error("Error preparing task data:", error)
      toast({
        title: "Error",
        description: "Failed to prepare task data.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filteredGroups = supportGroups.filter(
    (group) =>
      group.member_count > 0 && // Only show groups with members
      (group.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      group.members.some((member) => member.name.toLowerCase().includes(memberSearchQuery.toLowerCase())))
  )

  return (
    <div className="flex h-[70vh] overflow-hidden">
      {/* Main Form */}
      <div
        className={`transition-all duration-300 overflow-y-auto pr-4 ${
          isMemberSelectorOpen ? "w-1/2 border-r" : "w-full"
        }`}
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Title *</label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Brief description of the issue"
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Type *</label>
              <Select
                name="type"
                value={formData.type}
                onValueChange={(value) => handleSelectChange("type", value)}
              >
                <SelectTrigger className="form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="demande">Demande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category</label>
              <Select
                name="category"
                value={formData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
              >
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {settings.categories.map((category) => (
                    <SelectItem key={category.id} value={category.value}>
                      {category.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">Assignment *</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsMemberSelectorOpen(true)}
                  className="flex-1 justify-start form-input h-10 px-3"
                >
                  {selectedAssignment ? (
                    <div className="flex items-center gap-2">
                      {selectedAssignment.type === "group" ? (
                        <>
                          <Users className="h-4 w-4" />
                          <span className="truncate">Entire {selectedAssignment.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            Group
                          </Badge>
                        </>
                      ) : (
                        <>
                          <User className="h-4 w-4" />
                          <span className="truncate">{selectedAssignment.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {selectedAssignment.groupName}
                          </Badge>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Select assignment</span>
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                {selectedAssignment && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedAssignment(null)}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Priority</label>
              <Select
                name="priority"
                value={formData.priority}
                onValueChange={(value) => handleSelectChange("priority", value)}
              >
                <SelectTrigger className="form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.priorities.map((priority) => (
                    <SelectItem key={priority.id} value={priority.value}>
                      {priority.value.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">Expiration Date</label>
              <Input
                type="date"
                name="expiration"
                value={formData.expiration}
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Department</label>
              <Select
                name="pole"
                value={formData.pole}
                onValueChange={(value) => handleSelectChange("pole", value)}
              >
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {settings.poles.map((pole) => (
                    <SelectItem key={pole.id} value={pole.value}>
                      {pole.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">Channel</label>
              <Select
                name="canal"
                value={formData.canal}
                onValueChange={(value) => handleSelectChange("canal", value)}
              >
                <SelectTrigger className="form-input">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {settings.canals.map((canal) => (
                    <SelectItem key={canal.id} value={canal.value}>
                      {canal.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="form-label">Related Tasks</label>
            <Input
              name="related_taches"
              value={formData.related_taches}
              onChange={handleInputChange}
              placeholder="Related task IDs (comma separated)"
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Description *</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed description of the issue or request"
              rows={4}
              className="form-input resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t divider">
            <Button
              variant="outline"
              onClick={onCancel}
              className="order-2 sm:order-1 bg-transparent"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="primary-button order-1 sm:order-2" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Save Changes" : "Create Task"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Member Selector Panel */}
      {isMemberSelectorOpen && (
        <div className="w-1/2 pl-4 flex flex-col">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups or members..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <div key={group.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium">{group.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {group.member_count} members
                      </Badge>
                    </div>
                    {group.chief_name && (
                      <Badge variant="outline" className="text-xs">
                        Chief: {group.chief_name}
                      </Badge>
                    )}
                  </div>

                  {group.description && (
                    <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                  )}

                  {/* Group Selection Option */}
                  <div className="mb-3 p-2 rounded border-2 border-dashed border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <span className="font-medium text-blue-600">Assign to Entire Group</span>
                          <p className="text-xs text-muted-foreground">
                            Task will be visible to all {group.member_count} members
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleGroupSelect(group)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Select Group
                      </Button>
                    </div>
                  </div>

                  {/* Individual Members */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Or select individual member:
                    </p>
                    {group.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleMemberSelect(member, group.name)}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-500" />
                          <div>
                            <span className="font-medium">{member.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">@{member.username}</span>
                          </div>
                          {member.is_chief && (
                            <Badge variant="outline" className="text-xs ml-2">
                              Chief
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMemberSelect(member, group.name)
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredGroups.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No groups found</p>
                  <p className="text-sm text-muted-foreground">
                    {memberSearchQuery
                      ? "Try adjusting your search criteria"
                      : "No support groups available"}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}