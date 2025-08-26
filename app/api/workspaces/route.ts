import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET handler to fetch all workspaces for the current user
export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not available in this deployment." },
        { status: 500 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("creator_id", user.id)

    if (error) {
      console.error("Error fetching workspaces:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ workspaces })
  } catch (err: unknown) {
    console.error("Error in GET /api/workspaces:", err)
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// POST handler to create a new workspace
export async function POST(request: Request) {
  try {
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not available in this deployment." },
        { status: 500 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: workspace, error } = await supabase
      .from("workspaces")
      .insert({
        name,
        creator_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating workspace:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ workspace }, { status: 201 })
  } catch (err: unknown) {
    console.error("Error in POST /api/workspaces:", err)
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
