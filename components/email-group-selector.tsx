"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plus, Check, X, Search, Users, Mail, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion" 

interface EmailGroup {
  id: number
  name: string
  description?: string
  emails: string[]
  created_at: string
  updated_at: string
}

interface EmailGroupSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectRecipients: (recipients: { type: 'group' | 'email', value: string, display: string }[]) => void
  initialSelected?: { type: 'group' | 'email', value: string, display: string }[]
}

export function EmailGroupSelector({ isOpen, onClose, onSelectRecipients, initialSelected = [] }: EmailGroupSelectorProps) {
  const { toast } = useToast()
  const [emailGroups, setEmailGroups] = useState<EmailGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRecipients, setSelectedRecipients] = useState(initialSelected)
  const [accordionOpenItems, setAccordionOpenItems] = useState<string[]>([]) // State for open accordion items

  useEffect(() => {
    if (isOpen) {
      loadEmailGroups()
      setSelectedRecipients(initialSelected)
      setSearchQuery("") // Reset search query
      setAccordionOpenItems([]) // Close all accordions when opening
    }
  }, [isOpen, initialSelected])

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

  const handleToggleRecipient = (recipient: { type: 'group' | 'email', value: string, display: string }) => {
    setSelectedRecipients((prev) => {
      const isAlreadySelected = prev.some(
        (r) => r.type === recipient.type && r.value === recipient.value
      )

      if (isAlreadySelected) {
        return prev.filter((r) => !(r.type === recipient.type && r.value === recipient.value))
      } else {
        return [...prev, recipient]
      }
    })
  }

  const isRecipientSelected = (recipient: { type: 'group' | 'email', value: string }) => {
    return selectedRecipients.some(
      (r) => r.type === recipient.type && r.value === recipient.value
    )
  }

  const handleConfirmSelection = () => {
    onSelectRecipients(selectedRecipients)
    onClose()
  }

  const filteredGroups = emailGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.emails.some((email) => email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] modal-content overflow-hidden flex flex-col">
        <DialogHeader className="border-b divider pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Select Email Recipients
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="relative my-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups or emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin loading-spinner" />
                <p className="text-base">Loading email groups...</p>
              </div>
            ) : emailGroups.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm opacity-75">No email groups configured.</p>
                <p className="text-xs opacity-50 mt-1">Please add email groups in Admin Dashboard settings.</p>
              </div>
            ) : (
              <ScrollArea className="h-full w-full">
                <div className="p-1 space-y-3">
                  <Accordion type="multiple" value={accordionOpenItems} onValueChange={setAccordionOpenItems} className="w-full">
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <AccordionItem key={group.id} value={group.id.toString()} className="border rounded-lg mb-3">
                          <AccordionTrigger className="flex items-center justify-between p-4 hover:no-underline">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-500" />
                              <h4 className="font-medium">{group.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {group.emails.length} emails
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={isRecipientSelected({ type: 'group', value: group.id.toString() }) ? "default" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent accordion from toggling
                                  handleToggleRecipient({ type: 'group', value: group.id.toString(), display: `Group: ${group.name}` });
                                }}
                                className={isRecipientSelected({ type: 'group', value: group.id.toString() }) ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                              >
                                {isRecipientSelected({ type: 'group', value: group.id.toString() }) ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                {isRecipientSelected({ type: 'group', value: group.id.toString() }) ? "Selected" : "Select Group"}
                              </Button>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 pt-0">
                            {group.description && (
                              <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                            )}
                            <div className="space-y-2 border-t pt-3">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Individual emails:
                              </p>
                              {group.emails.length > 0 ? (
                                group.emails.filter(email => email.toLowerCase().includes(searchQuery.toLowerCase())).map((email) => (
                                  <div
                                    key={email}
                                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => handleToggleRecipient({ type: 'email', value: email, display: email })}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Mail className="h-4 w-4 text-blue-500" />
                                      <span className="font-medium text-sm">{email}</span>
                                    </div>
                                    {isRecipientSelected({ type: 'email', value: email }) ? (
                                      <Check className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Plus className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-4">
                                  <p className="text-xs opacity-50">No emails in this group.</p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm opacity-75">No groups or emails found matching "{searchQuery}".</p>
                      </div>
                    )}
                  </Accordion>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t divider flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {selectedRecipients.map((recipient, index) => (
              <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                {recipient.display}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => handleToggleRecipient(recipient)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
          <Button onClick={handleConfirmSelection} className="primary-button">
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}