/**
 * Ce fichier gère la création d'une réponse pour une tâche donnée :
 * - Vérifie que tous les champs requis sont présents,
 * - Si un nouveau statut est fourni, il est validé à partir des statuts actifs dans la base,
 * - Crée ensuite la réponse dans la base,
 * - Met à jour le statut de la tâche si besoin.
 */

import { type NextRequest, NextResponse } from "next/server"
import { createResponse, updateTacheStatus } from "@/lib/database"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { tache_id, support_id, support_name, message, new_status } = await request.json()

    if (!tache_id || !support_id || !support_name || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (new_status) {
      const validStatuses = await query(`
        SELECT value FROM system_settings 
        WHERE category = 'statuses' AND is_active = TRUE
      `)

      const statusValues = Array.isArray(validStatuses)
        ? validStatuses.map((s: any) => s.value)
        : ["pending", "in_progress", "resolved", "rejected", "on_hold"] // fallback

      if (!statusValues.includes(new_status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Valid statuses are: ${statusValues.join(", ")}`,
          },
          { status: 400 },
        )
      }
    }

    await createResponse({
      tache_id,
      support_id,
      support_name,
      message,
    })

    if (new_status) {
      await updateTacheStatus(tache_id, new_status)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Create response error:", error)
    return NextResponse.json({ error: "Failed to create response" }, { status: 500 })
  }
}
