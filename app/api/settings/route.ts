/**
 * Cette API gère les paramètres système (system_settings) :
 * - GET : récupère les paramètres actifs, groupés par catégorie,
 * - POST : crée un nouveau paramètre après validation,
 * - PUT : met à jour un paramètre existant avec vérification,
 * - DELETE : supprime un paramètre via son ID.
 * La validation inclut la vérification des doublons et du format de la couleur (hexadécimal).
 */

import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET() {
  try {
    const results = await query(`
      SELECT * FROM system_settings 
      WHERE is_active = TRUE
      ORDER BY category, display_order, value
    `)

    const settings = {
      types: [],
      categories: [],
      poles: [],
      canals: [],
      priorities: [],
      statuses: [],
    }

    if (Array.isArray(results)) {
      results.forEach((setting: any) => {
        if (settings[setting.category as keyof typeof settings]) {
          settings[setting.category as keyof typeof settings].push(setting)
        }
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { category, value, color } = await request.json()

    if (!category || !value) {
      return NextResponse.json({ error: "Category and value are required" }, { status: 400 })
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json({ error: "Color must be in hex format (#RRGGBB)" }, { status: 400 })
    }

    const existing = await query("SELECT id FROM system_settings WHERE category = ? AND value = ?", [category, value])

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: "This value already exists in this category" }, { status: 400 })
    }

    const orderResult = await query(
      "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM system_settings WHERE category = ?",
      [category],
    )

    const displayOrder = Array.isArray(orderResult) && orderResult.length > 0 ? (orderResult[0] as any).next_order : 1

    const result = await query(
      "INSERT INTO system_settings (category, value, color, display_order) VALUES (?, ?, ?, ?)",
      [category, value, color || null, displayOrder],
    )

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error creating setting:", error)
    return NextResponse.json({ error: "Failed to create setting" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, category, value, color } = await request.json()

    if (!id || !category || !value) {
      return NextResponse.json({ error: "ID, category, and value are required" }, { status: 400 })
    }

    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json({ error: "Color must be in hex format (#RRGGBB)" }, { status: 400 })
    }

    const existing = await query("SELECT id FROM system_settings WHERE category = ? AND value = ? AND id != ?", [
      category,
      value,
      id,
    ])

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: "This value already exists in this category" }, { status: 400 })
    }

    const result = await query(
      "UPDATE system_settings SET value = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [value, color || null, id],
    )

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error updating setting:", error)
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Setting ID is required" }, { status: 400 })
    }

    const result = await query("DELETE FROM system_settings WHERE id = ?", [id])

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error deleting setting:", error)
    return NextResponse.json({ error: "Failed to delete setting" }, { status: 500 })
  }
}
