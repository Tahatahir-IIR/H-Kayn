"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Mail, Users, X, Save, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface EmailGroup {
  id: number
  name: string
  description?: string
  emails: string[]
  created_at: string
  updated_at: string
}

interface EmailGroupManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function EmailGroupManager({ isOpen, onClose }: EmailGroupManagerProps) {
  const { toast } = useToast()
  const [emailGroups, setEmailGroups] = useState<EmailGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<EmailGroup | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    emails: [""] as string[], // Initialize with an empty string for the first email input
  })
  const [emailErrors, setEmailErrors] = useState<string[]>([])

  const isValidEmail = (email: string): boolean => {
    // Basic email regex for client-side validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateEmails = (emails: string[]): boolean => {
    const errors: string[] = emails.map((email) => {
      if (!email.trim()) {
        return "Email cannot be empty."
      }
      if (!isValidEmail(email)) {
        return "Invalid email format."
      }
      return ""
    })
    setEmailErrors(errors)
    return errors.every((error) => !error)
  }

  const loadEmailGroups = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/email-groups")
      if (response.ok) {
        const data = await response.json()
        setEmailGroups(Array.isArray(data.emailGroups) ? data.emailGroups : [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load email groups",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading email groups:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server to load email groups",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadEmailGroups()
    }
  }, [isOpen])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleEmailInputChange = (index: number, value: string) => {
    const newEmails = [...formData.emails]
    newEmails[index] = value
    setFormData((prev) => ({ ...prev, emails: newEmails }))
    // Validate this specific email immediately
    const newErrors = [...emailErrors]
    if (!value.trim()) {
      newErrors[index] = "Email cannot be empty."
    } else if (!isValidEmail(value)) {
      newErrors[index] = "Invalid email format."
    } else {
      newErrors[index] = ""
    }
    setEmailErrors(newErrors)
  }

  const handleAddEmailField = () => {
    setFormData((prev) => ({ ...prev, emails: [...prev.emails, ""] }))
    setEmailErrors((prev) => [...prev, ""]) // Add an empty error slot for the new field
  }

  const handleRemoveEmailField = (index: number) => {
    const newEmails = formData.emails.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, emails: newEmails }))
    setEmailErrors((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Filter out empty email fields before final validation and submission
    const cleanedEmails = formData.emails.filter(email => email.trim() !== "");

    if (cleanedEmails.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one email address is required.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    if (!validateEmails(cleanedEmails)) {
      toast({
        title: "Validation Error",
        description: "Please correct the invalid email addresses.",
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Group name is required.",
        variant: "destructive",
      })
      setSubmitting(false)
      return
    }

    try {
      const method = editingGroup ? "PUT" : "POST"
      const url = editingGroup ? `/api/email-groups` : "/api/email-groups"
      const body = JSON.stringify({
        id: editingGroup?.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        emails: cleanedEmails,
      })

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Email group ${editingGroup ? "updated" : "created"} successfully!`,
        })
        resetForm()
        loadEmailGroups()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || `Failed to ${editingGroup ? "update" : "create"} email group.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error submitting email group:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (group: EmailGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || "",
      emails: group.emails.length > 0 ? group.emails : [""], // Ensure at least one empty field if no emails
    })
    setEmailErrors(group.emails.map(() => "")) // Clear previous errors
    setShowForm(true)
  }

  const handleDelete = async (groupId: number) => {
    if (!confirm("Are you sure you want to delete this email group?")) return

    try {
      const response = await fetch(`/api/email-groups?id=${groupId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Email group deleted successfully!",
        })
        loadEmailGroups()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete email group.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting email group:", error)
      toast({
        title: "Error",
        description: "Failed to connect to server.",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setEditingGroup(null)
    setFormData({ name: "", description: "", emails: [""] }) // Reset to one empty email field
    setEmailErrors([])
    setShowForm(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] modal-content overflow-hidden flex flex-col">
        <DialogHeader className="border-b divider pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Manage Email Groups
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Add/Edit Form */}
          {showForm ? (
            <div className="standard-card">
              <div className="border-b divider pb-4 mb-6">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  {editingGroup ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingGroup ? "Edit Email Group" : "Create New Email Group"}
                </h4>
                <p className="text-sm opacity-75 mt-1">Define a group of email addresses for quick sending.</p>
              </div>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="form-label">Group Name *</Label>
                  <Input
                    id="groupName"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="e.g., IT Department, Sales Team"
                    required
                    className="form-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupDescription" className="form-label">Description</Label>
                  <Textarea
                    id="groupDescription"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Optional description for the group"
                    rows={2}
                    className="form-input resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="form-label">Emails *</Label>
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailInputChange(index, e.target.value)}
                        placeholder={`Email ${index + 1}`}
                        className={`form-input ${emailErrors[index] ? 'border-red-500' : ''}`}
                      />
                      {formData.emails.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveEmailField(index)}
                          className="flex-shrink-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {emailErrors.map((error, index) => (
                    error && <p key={`error-${index}`} className="text-red-500 text-xs mt-1">{error}</p>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddEmailField} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t divider">
                  <Button type="submit" disabled={submitting} className="primary-button">
                    {submitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {editingGroup ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingGroup ? "Save Changes" : "Create Group"}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="order-2 sm:order-2"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(true)} className="primary-button">
                <Plus className="h-4 w-4 mr-2" />
                Add New Group
              </Button>
            </div>
          )}

          {/* Email Groups List */}
          <div className="standard-card">
            <div className="border-b divider pb-4 mb-4">
              <h4 className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Existing Email Groups
              </h4>
              <p className="text-sm opacity-75 mt-1">Overview of your configured email distribution groups.</p>
            </div>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin loading-spinner" />
                <p className="text-base">Loading email groups...</p>
              </div>
            ) : emailGroups.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm opacity-75">No email groups created yet.</p>
                <p className="text-xs opacity-50 mt-1">Click "Add New Group" to get started.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] w-full rounded-md border">
                <div className="p-4 space-y-4">
                  {emailGroups.map((group) => (
                    <div key={group.id} className="p-4 border rounded-lg divider">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h5 className="font-medium text-base">{group.name}</h5>
                          {group.description && <p className="text-sm opacity-75 mt-1">{group.description}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(group)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(group.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Emails:</p>
                        <div className="flex flex-wrap gap-1">
                          {group.emails && group.emails.length > 0 ? (
                            group.emails.map((email, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {email}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs opacity-50 italic">No emails configured or parsing failed.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t divider flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}