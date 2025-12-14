/**
 * Ce fichier gère toutes les opérations CRUD pour les groupes de support :
 * - GET : récupère tous les groupes disponibles,
 * - POST : crée un nouveau groupe (le nom est requis),
 * - PUT : met à jour un groupe existant (id et nom requis),
 * - DELETE : supprime un groupe via son ID.
 * Les erreurs sont gérées proprement avec des messages clairs.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getSupportGroups, createSupportGroup, updateSupportGroup, deleteSupportGroup } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const groups = await getSupportGroups()
    return NextResponse.json({ success: true, groups })
  } catch (error) {
    console.error("Get groups error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch groups" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const groupData = await request.json()

    if (!groupData.name) {
      return NextResponse.json({ success: false, error: "Group name is required" }, { status: 400 })
    }

    await createSupportGroup(groupData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Create group error:", error)
    return NextResponse.json({ success: false, error: "Failed to create group" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get("id")
    const groupData = await request.json()

    if (!groupId || !groupData.name) {
      return NextResponse.json({ success: false, error: "Group ID and name are required" }, { status: 400 })
    }

    await updateSupportGroup(Number.parseInt(groupId), groupData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update group error:", error)
    return NextResponse.json({ success: false, error: "Failed to update group" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get("id")

    if (!groupId) {
      return NextResponse.json({ success: false, error: "Group ID is required" }, { status: 400 })
    }

    await deleteSupportGroup(Number.parseInt(groupId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete group error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete group" }, { status: 500 })
  }
}
