import { loadAgent } from "@/lib/agents/load-agent"
import { SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { loadMCPToolsFromURL } from "@/lib/mcp/load-mcp-from-url"
import { getAllModels } from "@/lib/models"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message as MessageAISDK, streamText, ToolSet } from "ai"
import {
  logUserMessage,
  storeAssistantMessage,
  trackSpecialAgentUsage,
  validateAndTrackUsage,
} from "./api"
import { cleanMessagesForTools } from "./utils"

export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  agentId?: string
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      agentId,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const userMessage = messages[messages.length - 1]
    const content = userMessage?.content?.toLowerCase().trim() || ""

    // Liste des phrases déclencheuses avec fautes/flexibilité
    const triggers = [
      "qui vous a créé",
      "qui vous a crié",
      "qui vous a crie",
      "qui vous a crié", // avec accent combiné
      "qui t'a créé",
      "qui t’a crié",
      "qui t'as crié",
      "qui est ton créateur",
      "qui est ton crié",
      "par qui as-tu été créé",
      "par qui as-tu été crié",
    ]

    if (triggers.some((trigger) => content.includes(trigger))) {
      return new Response(
        JSON.stringify({
          message: {
            role: "assistant",
            content:
              "J’ai été créé localement par Samaleh Mohamed Hassan, développeur fullstack passionné par le web et l’IA. 🤖",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const supabase = await validateAndTrackUsage({
      userId,
      model,
      isAuthenticated,
    })

    if (supabase && userMessage?.role === "user") {
      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: userMessage.content,
        attachments: userMessage.experimental_attachments as Attachment[],
        model,
        isAuthenticated,
      })
    }

    let agentConfig = null
    if (agentId) {
      agentConfig = await loadAgent(agentId)
    }

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)

    if (!modelConfig || !modelConfig.apiSdk) {
      throw new Error(`Model ${model} not found`)
    }

    const effectiveSystemPrompt =
      agentConfig?.systemPrompt || systemPrompt || SYSTEM_PROMPT_DEFAULT

    let toolsToUse: ToolSet | undefined = undefined
    if (agentConfig?.mcpConfig) {
      const { tools } = await loadMCPToolsFromURL(agentConfig.mcpConfig.server)
      toolsToUse = tools
    } else if (agentConfig?.tools) {
      toolsToUse = agentConfig.tools
      if (supabase) {
        await trackSpecialAgentUsage(supabase, userId)
      }
    }

    const hasTools = !!toolsToUse && Object.keys(toolsToUse).length > 0
    const cleanedMessages = cleanMessagesForTools(messages, hasTools)

    let streamError: Error | null = null

    const result = streamText({
      model: modelConfig.apiSdk(),
      system: effectiveSystemPrompt,
      messages: cleanedMessages,
      tools: toolsToUse,
      maxSteps: 10,
      onError: (err: unknown) => {
        console.error("🛑 streamText error:", err)
        streamError = new Error(
          (err as { error?: string })?.error ||
            "AI generation failed. Please check your model or API key."
        )
      },

      onFinish: async ({ response }) => {
        if (supabase) {
          await storeAssistantMessage({
            supabase,
            chatId,
            messages:
              response.messages as import("@/app/types/api.types").Message[],
          })
        }
      },
    })

    await result.consumeStream()

    if (streamError) {
      throw streamError
    }

    const originalResponse = result.toDataStreamResponse({
      sendReasoning: true,
      sendSources: true,
    })

    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: unknown) {
    console.error("Error in /api/chat:", err)
    const error = err as { code?: string; message?: string }
    if (error.code === "DAILY_LIMIT_REACHED") {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: 403 }
      )
    }

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    )
  }
}
