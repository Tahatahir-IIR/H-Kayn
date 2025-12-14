/**
 * Cette API gère les groupes d’emails dans le système.
 * Elle permet :
 * - de récupérer tous les groupes (GET),
 * - d’en créer un nouveau (POST),
 * - de mettre à jour un groupe existant (PUT),
 * - et de supprimer un groupe (DELETE).
 * Chaque action vérifie les données nécessaires et interagit avec la base via les fonctions du module `database`.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getEmailGroups, createEmailGroup, updateEmailGroup, deleteEmailGroup } from "@/lib/database"

export async function GET() {
  try {
    const emailGroups = await getEmailGroups()
    return NextResponse.json({ success: true, emailGroups })
  } catch (error) {
    console.error("Get email groups error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch email groups" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const groupData = await request.json()

    if (!groupData.name || !groupData.emails) {
      return NextResponse.json({ success: false, error: "Group name and emails are required" }, { status: 400 })
    }

    await createEmailGroup(groupData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Create email group error:", error)
    return NextResponse.json({ success: false, error: "Failed to create email group" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, emails } = await request.json()

    if (!id || !name || !emails) {
      return NextResponse.json({ success: false, error: "Group ID, name, and emails are required" }, { status: 400 })
    }

    await updateEmailGroup(id, { name, description, emails })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update email group error:", error)
    return NextResponse.json({ success: false, error: "Failed to update email group" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get("id")

    if (!groupId) {
      return NextResponse.json({ success: false, error: "Group ID is required" }, { status: 400 })
    }

    await deleteEmailGroup(Number.parseInt(groupId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete email group error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete email group" }, { status: 500 })
  }
}