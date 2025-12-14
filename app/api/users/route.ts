/**
 * Ce fichier gère les utilisateurs :
 * - GET : récupère la liste complète des utilisateurs,
 * - POST : crée un nouvel utilisateur en vérifiant que tous les champs nécessaires sont remplis,
 *          et gère le cas où le nom d'utilisateur existe déjà,
 * - DELETE : supprime un utilisateur selon son ID.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getUsers, createUser, deleteUser } from "@/lib/database"

export async function GET() {
  try {
    const users = await getUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    if (!userData.username || !userData.password || !userData.name || !userData.type) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    await createUser(userData)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Create user error:", error)

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await deleteUser(Number.parseInt(userId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
