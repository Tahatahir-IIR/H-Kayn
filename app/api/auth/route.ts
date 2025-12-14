/**
 * Cette route API permet de connecter un utilisateur avec son nom d’utilisateur et son mot de passe.
 * Elle vérifie que les champs sont remplis, puis elle cherche l’utilisateur dans la base de données.
 * Si les identifiants sont bons, elle renvoie les infos de l'utilisateur, sinon elle retourne une erreur.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getUserByCredentials } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const user = await getUserByCredentials(username, password)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
