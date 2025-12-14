/**
 * Ce fichier gère les tâches (taches) :
 * - GET : récupère les tâches, filtrées soit par employé, soit par utilisateur support,
 *         ou toutes si aucun filtre,
 * - POST : crée une nouvelle tâche en s'assurant que les champs obligatoires sont présents.
 * La fonction interne getTachesBySupportUser récupère les tâches liées à un utilisateur support,
 * avec leurs réponses associées.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getTaches, getTachesByEmployee, createTache } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const supportUserId = searchParams.get("supportUserId")

    let taches
    if (employeeId) {
      taches = await getTachesByEmployee(Number.parseInt(employeeId))
    } else if (supportUserId) {
      taches = await getTachesBySupportUser(Number.parseInt(supportUserId))
    } else {
      taches = await getTaches()
    }

    return NextResponse.json({ success: true, taches })
  } catch (error) {
    console.error("Get taches error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch taches" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tacheData = await request.json()

    if (!tacheData.employee_id || !tacheData.employee_name || !tacheData.title || !tacheData.description) {
      return NextResponse.json({ success: false, error: "Required fields are missing" }, { status: 400 })
    }

    await createTache(tacheData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Create tache error:", error)
    return NextResponse.json({ success: false, error: "Failed to create tache" }, { status: 500 })
  }
}

async function getTachesBySupportUser(supportUserId: number) {
  const { getPool } = await import("@/lib/database")
  const connection = getPool()

  const [tacheRows] = await connection.execute(
    `
    SELECT DISTINCT t.* 
    FROM taches t
    LEFT JOIN support_groups sg ON t.entite = sg.name
    LEFT JOIN user_groups ug ON sg.id = ug.group_id
    WHERE (t.assigned_to_group = TRUE AND ug.user_id = ?) 
       OR (t.assigned_to_group = FALSE AND t.assigned_member_id = ?)
    ORDER BY t.created_at DESC
  `,
    [supportUserId, supportUserId],
  )

  if (!Array.isArray(tacheRows)) {
    return []
  }

  const tachesWithResponses = await Promise.all(
    tacheRows.map(async (tache: any) => {
      const [responseRows] = await connection.execute(
        `SELECT id, message, support_name, support_id, created_at 
         FROM responses 
         WHERE tache_id = ? 
         ORDER BY created_at ASC`,
        [tache.id],
      )

      return {
        ...tache,
        responses: Array.isArray(responseRows) ? responseRows : [],
      }
    }),
  )

  return tachesWithResponses
}
