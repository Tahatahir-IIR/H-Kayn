/**
 * Ce fichier gère les sessions actives sur une tâche :
 * - POST : crée ou met à jour une session utilisateur sur une tâche,
 *          peut aussi mettre à jour le temps passé si fourni,
 * - GET : récupère les sessions actives d'une tâche,
 *          nettoie d'abord les sessions inactives,
 * - DELETE : supprime une session utilisateur et met à jour le temps passé si fourni.
 * L'ID de la tâche est extrait de l'URL.
 */

import { type NextRequest, NextResponse } from "next/server"
import {
  createOrUpdateTacheSession,
  removeTacheSession,
  getActiveTacheSessions,
  updateTacheSessionTime,
  getTacheById,
  cleanupInactiveSessions, // Import the cleanup function
} from "@/lib/database"

// Helper: Extract tache ID from route
function extractTacheId(request: NextRequest): number {
  const segments = request.nextUrl.pathname.split("/")
  const id = segments[segments.indexOf("taches") + 1]
  return Number.parseInt(id)
}

// POST: Create or update session
export async function POST(request: NextRequest) {
  try {
    const tacheId = extractTacheId(request)
    const { user_id, user_name, user_type, session_time } = await request.json()

    if (!user_id || !user_name || !user_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await createOrUpdateTacheSession({
      tache_id: tacheId,
      user_id,
      user_name,
      user_type,
    })

    if (session_time && session_time > 0) {
      await updateTacheSessionTime(tacheId, session_time)
    }

    const activeSessions = await getActiveTacheSessions(tacheId)
    const tache = await getTacheById(tacheId)

    return NextResponse.json({
      success: true,
      activeSessions,
      totalTaskTime: tache?.total_session_time || 0,
    })
  } catch (error) {
    console.error("POST /sessions error:", error)
    return NextResponse.json({ error: "Failed to manage session" }, { status: 500 })
  }
}

// GET: Get active sessions
export async function GET(request: NextRequest) {
  try {
    const tacheId = extractTacheId(request)

    // Clean up inactive sessions before fetching active ones
    await cleanupInactiveSessions()

    const activeSessions = await getActiveTacheSessions(tacheId)
    const tache = await getTacheById(tacheId)

    return NextResponse.json({
      activeSessions,
      totalTaskTime: tache?.total_session_time || 0,
    })
  } catch (error) {
    console.error("GET /sessions error:", error)
    return NextResponse.json({ error: "Failed to get sessions" }, { status: 500 })
  }
}

// DELETE: Remove session and update time if provided
export async function DELETE(request: NextRequest) {
  try {
    const tacheId = extractTacheId(request)
    const url = new URL(request.url)
    const userId = Number.parseInt(url.searchParams.get("userId") || "0")
    const { session_time } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (session_time && session_time > 0) {
      await updateTacheSessionTime(tacheId, session_time)
    }

    await removeTacheSession(tacheId, userId)
    const tache = await getTacheById(tacheId)

    return NextResponse.json({
      success: true,
      totalTaskTime: tache?.total_session_time || 0,
    })
  } catch (error) {
    console.error("DELETE /sessions error:", error)
    return NextResponse.json({ error: "Failed to remove session" }, { status: 500 })
  }
}