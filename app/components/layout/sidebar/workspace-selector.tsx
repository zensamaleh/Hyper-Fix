"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { DialogCreateWorkspace } from "./dialog-create-workspace"

// Define the type for a single workspace
type Workspace = {
  id: string
  name: string
}

export function WorkspaceSelector() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentWorkspaceId = searchParams.get("workspace_id")

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/workspaces")
      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data.workspaces || [])
      } else {
        console.error("Failed to fetch workspaces")
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const handleWorkspaceChange = (workspaceId: string) => {
    if (workspaceId === "create-new") {
      setIsDialogOpen(true)
    } else {
      router.push(`/agents?workspace_id=${workspaceId}`)
    }
  }

  const handleWorkspaceCreated = () => {
    fetchWorkspaces()
  }

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <>
      <div className="px-3 py-2">
        <Select
          onValueChange={handleWorkspaceChange}
          value={currentWorkspaceId || ""}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
            <SelectItem value="create-new">+ Create New Workspace</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogCreateWorkspace
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </>
  )
}
