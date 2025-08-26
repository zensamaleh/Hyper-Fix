"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { fetchClient } from "@/lib/fetch"
import { useState } from "react"

type DialogCreateWorkspaceProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorkspaceCreated: () => void
}

export function DialogCreateWorkspace({
  open,
  onOpenChange,
  onWorkspaceCreated,
}: DialogCreateWorkspaceProps) {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: "Workspace name is required",
        status: "error",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetchClient("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create workspace")
      }

      toast({
        title: "Workspace created successfully",
        status: "success",
      })
      onWorkspaceCreated() // Callback to refresh the list
      onOpenChange(false) // Close the dialog
      setName("") // Reset the input
    } catch (error) {
      console.error("Failed to create workspace:", error)
      toast({
        title: "Error creating workspace",
        description: (error as Error).message,
        status: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Enter a name for your new workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="My Awesome Workspace"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
