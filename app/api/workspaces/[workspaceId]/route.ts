import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const workspaceId = params.workspaceId
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 })
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

    // First, verify the user owns the workspace
    const { data: workspace, error: fetchError } = await supabase
      .from("workspaces")
      .select("creator_id")
      .eq("id", workspaceId)
      .single()

    if (fetchError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    if (workspace.creator_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to delete this workspace" },
        { status: 403 }
      )
    }

    // If ownership is confirmed, proceed with deletion
    const { error: deleteError } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)

    if (deleteError) {
      console.error("Error deleting workspace:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Workspace deleted successfully" }, { status: 200 })
  } catch (err: unknown) {
    console.error("Error in DELETE /api/workspaces/[workspaceId]:", err)
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
