"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Send, X, Mail, User, Building, ClipboardList, MapPin, UserCircle, AlertCircle, Users } from "lucide-react"
import { EmailGroupSelector } from "./email-group-selector" 
import { Badge } from "@/components/ui/badge"

interface Tache {
  id: number
  title: string
  description: string
  employee_name: string
}

interface EmailSenderDialogProps {
  isOpen: boolean
  onClose: () => void
  tache: Tache | null
}

export function EmailSenderDialog({ isOpen, onClose, tache }: EmailSenderDialogProps) {
  const { toast } = useToast()
  const [receivers, setReceivers] = useState("") // This will now be derived from selectedRecipients
  const [subject, setSubject] = useState("")
  const [emailBodyContent, setEmailBodyContent] = useState("")
  const [tableAgence, setTableAgence] = useState("")
  const [tableProblem, setTableProblem] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [isEmailSelectorOpen, setIsEmailSelectorOpen] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<{ type: 'group' | 'email', value: string, display: string }[]>([])

  useEffect(() => {
    if (tache) {
      setSubject(`Demande d'intervention - Tâche #${tache.id}: ${tache.title}`)
      setEmailBodyContent(`Bonjour,\n\nMerci svp d'intervenir:\n\nCordialement`)
      setTableAgence("")
      setTableProblem("")
      setSelectedRecipients([]) // Reset recipients when a new task is selected
    } else {
      setSubject("")
      setEmailBodyContent("")
      setTableAgence("")
      setTableProblem("")
      setSelectedRecipients([])
    }
  }, [tache])

  // Effect to update the 'receivers' string whenever 'selectedRecipients' changes
  useEffect(() => {
    const allEmails: string[] = [];
    const uniqueEmails = new Set<string>();

    const fetchGroupEmails = async (groupId: string) => {
      try {
        const response = await fetch("/api/email-groups");
        if (response.ok) {
          const data = await response.json();
          const group = (data.emailGroups || []).find((g: any) => g.id.toString() === groupId);
          if (group && Array.isArray(group.emails)) {
            group.emails.forEach((email: string) => uniqueEmails.add(email));
          }
        }
      } catch (error) {
        console.error("Failed to fetch group emails:", error);
      }
    };

    const processRecipients = async () => {
      const groupPromises: Promise<void>[] = [];
      selectedRecipients.forEach(recipient => {
        if (recipient.type === 'email') {
          uniqueEmails.add(recipient.value);
        } else if (recipient.type === 'group') {
          groupPromises.push(fetchGroupEmails(recipient.value));
        }
      });

      await Promise.all(groupPromises); // Wait for all group emails to be fetched

      setReceivers(Array.from(uniqueEmails).join(", "));
    };

    processRecipients();
  }, [selectedRecipients]);


  const handleSendEmail = async () => {
    if (!receivers.trim() || !subject.trim() || !emailBodyContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Receivers, Subject, Content).",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    const fullEmailContent = `
      ${emailBodyContent}

      --- Task Details ---
      Task ID: #${tache?.id || 'N/A'}
      Agence: ${tableAgence}
      Task Sender: ${tache?.employee_name || 'N/A'}
      Problem: ${tableProblem}
      --------------------
    `;

    console.log("Sending Email:", { receivers, subject, content: fullEmailContent })

    setTimeout(() => {
      toast({
        title: "Email Sent (Simulated)",
        description: "Your email has been prepared and would be sent.",
      })
      setSubmitting(false)
      onClose()
    }, 1000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[95vh] modal-content overflow-hidden flex flex-col">
        <DialogHeader className="border-b divider pb-4 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email for Task #{tache?.id}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Receivers Section */}
          <div className="space-y-2">
            <Label htmlFor="receivers" className="form-label flex items-center gap-2">
              <User className="h-4 w-4" />
              Receivers (To) *
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedRecipients.map((recipient, index) => (
                <Badge key={index} variant="secondary" className="text-sm flex items-center gap-1">
                  {recipient.display}
                </Badge>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEmailSelectorOpen(true)}
              className="w-full justify-center"
            >
              <Users className="h-4 w-4 mr-2" />
              Select Recipients
            </Button>
            {receivers && (
              <p className="text-xs opacity-75 mt-2">Final email list: <span className="font-mono text-muted-foreground">{receivers}</span></p>
            )}
          </div>

          {/* Object Section */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="form-label flex items-center gap-2">
              <Building className="h-4 w-4" />
              Subject *
            </Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="form-input"
            />
          </div>

          {/* Task Details Table Section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Task Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="taskId" className="text-xs font-medium flex items-center gap-1">
                  <ClipboardList className="h-3 w-3 text-muted-foreground" />
                  Task ID:
                </Label>
                <Input
                  id="taskId"
                  type="text"
                  value={`#${tache?.id || 'N/A'}`}
                  readOnly
                  className="form-input bg-background/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="agence" className="text-xs font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  Agence:
                </Label>
                <Input
                  id="agence"
                  type="text"
                  value={tableAgence}
                  onChange={(e) => setTableAgence(e.target.value)}
                  placeholder="Enter agency name"
                  className="form-input"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taskSender" className="text-xs font-medium flex items-center gap-1">
                  <UserCircle className="h-3 w-3 text-muted-foreground" />
                  Task Sender:
                </Label>
                <Input
                  id="taskSender"
                  type="text"
                  value={tache?.employee_name || 'N/A'}
                  readOnly
                  className="form-input bg-background/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="problem" className="text-xs font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                  Problem:
                </Label>
                <Input
                  id="problem"
                  type="text"
                  value={tableProblem}
                  onChange={(e) => setTableProblem(e.target.value)}
                  placeholder="Describe the problem"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Main Content Section */}
          <div className="space-y-2">
            <Label htmlFor="emailBodyContent" className="form-label flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Content *
            </Label>
            <Textarea
              id="emailBodyContent"
              value={emailBodyContent}
              onChange={(e) => setEmailBodyContent(e.target.value)}
              placeholder="Email body"
              rows={10}
              className="form-input resize-y"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t divider flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="order-2 sm:order-1 bg-transparent">
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={submitting} className="primary-button order-1 sm:order-2">
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>

      <EmailGroupSelector
        isOpen={isEmailSelectorOpen}
        onClose={() => setIsEmailSelectorOpen(false)}
        onSelectRecipients={setSelectedRecipients}
        initialSelected={selectedRecipients}
      />
    </Dialog>
  )
}