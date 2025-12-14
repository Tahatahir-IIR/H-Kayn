/**
 * Cette API permet de gérer les utilisateurs dans un groupe via une seule route POST.
 * Elle supporte 3 actions :
 * - "assign" : ajouter un utilisateur à un groupe,
 * - "remove" : retirer un utilisateur d’un groupe,
 * - "setChief" : définir un utilisateur comme chef du groupe.
 * Les actions sont choisies via le champ "action" dans le body de la requête.
 */

import { type NextRequest, NextResponse } from "next/server"
import { assignUserToGroup, removeUserFromGroup, setGroupChief } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { action, userId, groupId } = await request.json()

    if (!action || !userId || !groupId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    switch (action) {
      case "assign":
        await assignUserToGroup(userId, groupId)
        return NextResponse.json({ success: true, message: "User assigned to group successfully" })

      case "remove":
        await removeUserFromGroup(userId, groupId)
        return NextResponse.json({ success: true, message: "User removed from group successfully" })

      case "setChief":
        await setGroupChief(userId, groupId)
        return NextResponse.json({ success: true, message: "Group chief set successfully" })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Group assignment error:", error)
    return NextResponse.json({ error: "Failed to perform group operation" }, { status: 500 })
  }
}
