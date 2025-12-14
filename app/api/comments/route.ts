/**
 * Ce script est une route API qui permet d’ajouter un commentaire à une tâche dans une application interne.
 * Lorsqu’un utilisateur commente une tâche, le commentaire est enregistré dans la base de données,
 * puis une notification par email est envoyée à l’employé concerné (s’il a une adresse email).
 * Si l’email échoue, le commentaire est quand même enregistré.
 * Le mail est bien stylisé en HTML et contient les infos de la tâche, de l’auteur et du message.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createTaskComment, getUserById, getTacheById } from "@/lib/database"
import nodemailer from "nodemailer"

const createCompanyTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { tache_id, user_id, user_name, user_type, message } = await request.json()

    if (!tache_id || !user_id || !user_name || !user_type || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    const commentResult = await createTaskComment({
      tache_id,
      user_id,
      user_name,
      user_type,
      message: message.trim(),
    })

    const task = await getTacheById(tache_id)
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const employee = await getUserById(task.employee_id)
    const commenter = await getUserById(user_id)

    if (!employee || !employee.email) {
      console.warn(`Employee email not found for task ${tache_id}`)
      return NextResponse.json({
        success: true,
        comment_id: commentResult.insertId,
        email_sent: false,
        message: "Comment added but email could not be sent (no employee email found)",
      })
    }

    if (!commenter || !commenter.email) {
      console.warn(`Commenter email not found for user ${user_id}`)
      return NextResponse.json({
        success: true,
        comment_id: commentResult.insertId,
        email_sent: false,
        message: "Comment added but email could not be sent (no commenter email found)",
      })
    }

    try {
      const transporter = createCompanyTransporter()

      const emailSubject = `New Comment on Task #${task.id}: ${task.title}`
      const emailBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Support System</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Internal Task Communication</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px; background-color: white; margin: 0;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px;">
              💬 New Comment on Your Task
            </h2>
            
            <!-- Task Info Card -->
            <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 16px;">📋 Task Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #6c757d; font-weight: 500; width: 100px;">ID:</td>
                  <td style="padding: 5px 0; color: #333; font-weight: 600;">#${task.id}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6c757d; font-weight: 500;">Title:</td>
                  <td style="padding: 5px 0; color: #333; font-weight: 600;">${task.title}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6c757d; font-weight: 500;">Status:</td>
                  <td style="padding: 5px 0;">
                    <span style="background-color: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize;">
                      ${task.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6c757d; font-weight: 500;">Priority:</td>
                  <td style="padding: 5px 0;">
                    <span style="background-color: ${task.priority === "high" ? "#ffebee" : task.priority === "medium" ? "#fff3e0" : "#e8f5e8"}; color: ${task.priority === "high" ? "#c62828" : task.priority === "medium" ? "#ef6c00" : "#2e7d32"}; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: uppercase;">
                      ${task.priority}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Comment Card -->
            <div style="background-color: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e9ecef;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                  <span style="color: white; font-weight: 600; font-size: 16px;">${commenter.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h4 style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">${commenter.name}</h4>
                  <p style="margin: 0; color: #6c757d; font-size: 12px; text-transform: capitalize;">${commenter.type} • ${commenter.email}</p>
                </div>
                <div style="margin-left: auto; color: #6c757d; font-size: 12px;">
                  ${new Date().toLocaleString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #667eea;">
                <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            </div>

            <!-- Task Description (if available) -->
            ${
              task.description
                ? `
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 14px; font-weight: 600;">📝 Original Task Description:</h4>
              <p style="margin: 0; color: #6c757d; font-size: 13px; line-height: 1.5;">
                ${task.description.substring(0, 300)}${task.description.length > 300 ? "..." : ""}
              </p>
            </div>
            `
                : ""
            }

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border: 1px solid #bbdefb;">
                <p style="margin: 0; color: #1976d2; font-size: 14px; font-weight: 500;">
                  🔗 Log in to your employee dashboard to view the full task details and track progress.
                </p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              This is an automated notification from the Company Support System.<br>
              Please do not reply to this email. Use the support dashboard for all communications.
            </p>
            <div style="margin-top: 10px;">
              <span style="color: #6c757d; font-size: 11px;">
                © ${new Date().getFullYear()} Company Support System • Internal Use Only
              </span>
            </div>
          </div>
        </div>
      `

      await transporter.sendMail({
        from: `"${commenter.name} (Support)" <${commenter.email}>`, 
        to: employee.email, 
        subject: emailSubject,
        html: emailBody,
        replyTo: commenter.email,
      })

      return NextResponse.json({
        success: true,
        comment_id: commentResult.insertId,
        email_sent: true,
        message: "Comment added and internal email notification sent successfully",
      })
    } catch (emailError) {
      console.error("Email sending error:", emailError)
      return NextResponse.json({
        success: true,
        comment_id: commentResult.insertId,
        email_sent: false,
        message: "Comment added but internal email notification failed to send",
      })
    }
  } catch (error) {
    console.error("Create comment error:", error)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}