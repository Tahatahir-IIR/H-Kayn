/**
 * Ce fichier permet de mettre à jour le statut d'une tâche donnée.
 * Il vérifie que le statut fourni est valide en le comparant avec les statuts actifs en base.
 * Si le statut est valide, la tâche est mise à jour, sinon une erreur est retournée.
 */

import { type NextRequest, NextResponse } from "next/server"
import { updateTacheStatus, query } from "@/lib/database"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status } = await request.json()
    const tacheId = Number.parseInt(params.id)

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const validStatuses = await query(`
      SELECT value FROM system_settings 
      WHERE category = 'statuses' AND is_active = TRUE
    `)

    const statusValues = Array.isArray(validStatuses)
      ? validStatuses.map((s: any) => s.value)
      : ["pending", "in_progress", "resolved", "rejected", "on_hold"]

    if (!statusValues.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Valid statuses are: ${statusValues.join(", ")}`,
        },
        { status: 400 },
      )
    }

    await updateTacheStatus(tacheId, status)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update tache error:", error)
    return NextResponse.json({ error: "Failed to update tache" }, { status: 500 })
  }
}
