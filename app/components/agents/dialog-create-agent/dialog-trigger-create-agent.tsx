"use client"

import { PopoverContentAuth } from "@/app/components/chat-input/popover-content-auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import {
  Popover,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/toast"
import { fetchClient } from "@/lib/fetch"
import { API_ROUTE_CREATE_AGENT } from "@/lib/routes"
import { useUser } from "@/lib/user-store/provider"
import { useRouter, useSearchParams } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"
import { useBreakpoint } from "../../../hooks/use-breakpoint"
import { CreateAgentForm } from "./create-agent-form"
import { getAllModels } from "@/lib/models"
import { ModelConfig } from "@/lib/models/types"

type AgentFormData = {
  name: string
  description: string
  slug: string
  avatar_url: string
  systemPrompt: string
  model_preference: string
  mcp: "none" | "git-mcp"
  repository?: string
  tools: string[]
}

type DialogCreateAgentTrigger = {
  trigger: React.ReactNode
}

// @todo: add drawer
export function DialogCreateAgentTrigger({
  trigger,
}: DialogCreateAgentTrigger) {
  const { user } = useUser()
  const isAuthenticated = !!user?.id
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    slug: "",
    avatar_url: "",
    systemPrompt: "",
    model_preference: "",
    mcp: "none",
    tools: [],
  })
  const [repository, setRepository] = useState("")
  const [error, setError] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [models, setModels] = useState<ModelConfig[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useBreakpoint(768)

  useEffect(() => {
    async function fetchModels() {
      const availableModels = await getAllModels()
      setModels(availableModels)
    }
    fetchModels()
  }, [])

  const generateSystemPrompt = (owner: string, repo: string) => {
    return `You are a helpful GitHub assistant focused on the repository: ${owner}/${repo}.
    
Use the available tools below to answer any questions. Always prefer using tools over guessing.
        
Tools available for this repository:
- \`fetch_${repo}_documentation\`: Fetch the entire documentation file. Use this first when asked about general concepts in ${owner}/${repo}.
- \`search_${repo}_documentation\`: Semantically search the documentation. Use this for specific questions.
- \`search_${repo}_code\`: Search code with exact matches using the GitHub API. Use when asked about file contents or code examples.
- \`fetch_generic_url_content\`: Fetch absolute URLs when referenced in the docs or needed for context.
      
Never invent answers. Use tools and return what you find.`
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    // Clear error for this field if it exists
    if (error[name]) {
      setError({ ...error, [name]: "" })
    }
  }

  const handleRepositoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const repoValue = e.target.value
    setRepository(repoValue)

    // Clear repository error if it exists
    if (error.repository) {
      setError({ ...error, repository: "" })
    }

    // Update system prompt if git-mcp is selected and repository format is valid
    if (formData.mcp === "git-mcp" && validateRepository(repoValue)) {
      const [owner, repo] = repoValue.split("/")
      setFormData((prev) => ({
        ...prev,
        systemPrompt: generateSystemPrompt(owner, repo),
      }))
    }
  }

  const handleSelectChange = (value: string, name: string) => {
    setFormData({ ...formData, [name]: value })

    if (name === "mcp") {
      // Clear repository error if switching away from git-mcp
      if (value !== "git-mcp" && error.repository) {
        setError({ ...error, repository: "" })
      }

      // If switching to git-mcp and repository is already valid, update system prompt
      if (value === "git-mcp" && validateRepository(repository)) {
        const [owner, repo] = repository.split("/")
        setFormData((prev) => ({
          ...prev,
          systemPrompt: generateSystemPrompt(owner, repo),
        }))
      }
    }
  }

  const handleToolsChange = (selectedTools: string[]) => {
    setFormData({ ...formData, tools: selectedTools })
  }

  const validateRepository = (repo: string) => {
    // Simple validation for owner/repo format
    const regex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/
    return regex.test(repo)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "Model name is required"
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required"
    }

    if (!formData.systemPrompt.trim()) {
      newErrors.systemPrompt = "System prompt is required"
    }

    if (formData.mcp === "git-mcp" && !validateRepository(repository)) {
      newErrors.repository =
        'Please enter a valid repository in the format "owner/repo"'
    }

    setError(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // If git-mcp is selected, validate the repository
      if (formData.mcp === "git-mcp") {
        const response = await fetch(
          `https://api.github.com/repos/${repository}`
        )

        if (!response.ok) {
          if (response.status === 404) {
            setError({
              ...error,
              repository:
                "Repository not found. Please check the repository name and try again.",
            })
          } else {
            setError({
              ...error,
              repository: `GitHub API error: ${response.statusText}`,
            })
          }
          setIsLoading(false)
          return
        }

        // Add repository to form data
        formData.repository = repository
      }

      const owner = repository ? repository.split("/")[0] : null
      const repo = repository ? repository.split("/")[1] : null

      const workspaceId = searchParams.get("workspace_id")
      if (!workspaceId) {
        // If there's no workspace selected, we can't create an agent.
        // We should probably show an error to the user.
        // For now, let's just log it and prevent submission.
        console.error("No workspace selected")
        toast({
          title: "No Workspace Selected",
          description: "Please select a workspace before creating a model.",
        })
        setIsLoading(false)
        return
      }

      const apiResponse = await fetchClient(API_ROUTE_CREATE_AGENT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          slug: formData.slug,
          systemPrompt: formData.systemPrompt,
          avatar_url: formData.avatar_url,
          workspace_id: workspaceId,
          model_preference: formData.model_preference,
          mcp_config: repository
            ? {
                server: `https://gitmcp.io/${owner}/${repo}`,
                variables: [],
              }
            : null,
          example_inputs: repository
            ? [
                "what does this repository do?",
                "how to install the project?",
                "how can I use this project?",
                "where is the main code located?",
              ]
            : null,
          tools: formData.tools,
          remixable: false,
          is_public: true,
          max_steps: 5,
        }),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || "Failed to create agent")
      }

      const { agent } = await apiResponse.json()

      // Close the dialog and redirect
      setOpen(false)
      router.push(`/?agent=${agent.slug}`)
    } catch (error: unknown) {
      console.error("Model creation error:", error)
      toast({
        title: "Error creating model",
        description:
          (error as Error).message || "Failed to create model. Please try again.",
      })
      setError({ form: "Failed to create model. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const content = (
    <CreateAgentForm
      models={models}
      formData={formData}
      repository={repository}
      setRepository={handleRepositoryChange}
      error={error}
      isLoading={isLoading}
      handleInputChange={handleInputChange}
      handleSelectChange={handleSelectChange}
      handleToolsChange={handleToolsChange}
      handleSubmit={handleSubmit}
      onClose={() => setOpen(false)}
      isDrawer={isMobile}
    />
  )

  if (!isAuthenticated) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContentAuth />
      </Popover>
    )
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">{content}</DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div
          className="h-full w-full"
          // Prevent the dialog from closing when clicking on the content, needed because of the agent-command component
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="border-border border-b px-6 py-4">
            <DialogTitle>Create Model</DialogTitle>
          </DialogHeader>
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
