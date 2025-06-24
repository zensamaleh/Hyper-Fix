import { NextResponse } from "next/server"
import { validateAndTrackUsage, logUserMessage, storeAssistantMessage } from "@/lib/api"
import { loadAgent } from "@/lib/agents/load-agent"
import { getAllModels } from "@/lib/models"
import { streamText } from "ai"
import { cleanMessagesForTools } from "./utils"

type Message = {
  role: string
  content: string
  experimental_attachments?: any[]
}

type ChatRequest = {
  messages: Message[]
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
      return NextResponse.json({ error: "Missing required info" }, { status: 400 })
    }

    // Dernier message utilisateur
    const userMessage = messages[messages.length - 1]
    const content = userMessage?.content.toLowerCase().trim() || ""

    // Regex détection question auteur
    const isAuthorQuestion = /(qui\s+(t'?a|vous\s+a|a\s+créé|a\s+fait|a\s+conçu|est\s+l[ae]\s+créateur(?:rice)?)|t'?es\s+fait|par\s+qui\s+(t'?es|vous\s+êtes)|créé\s+par\s+qui|qui\s+est\s+(l[ae]\s+créateur(?:rice)?|l'auteur))/.test(content)

    if (isAuthorQuestion) {
      // Validation Supabase + lecture table app_info clé 'author'
      const supabase = await validateAndTrackUsage({
        userId,
        model,
        isAuthenticated,
      })

      const { data, error } = await supabase
        .from("app_info")
        .select("value")
        .eq("key", "author")
        .single()

      const authorInfo = data?.value || "Auteur non disponible."

      return NextResponse.json({
        message: {
          role: "assistant",
          content: `Cette application a été créée par ${authorInfo}.`,
        },
      })
    }

    // -------------------------------
    // Sinon appel modèle AI classique
    // -------------------------------

    const supabase = await validateAndTrackUsage({
      userId,
      model,
      isAuthenticated,
    })

    if (supabase && userMessage.role === "user") {
      await logUserMessage({
        supabase,
        userId,
        chatId,
        content: userMessage.content,
        attachments: userMessage.experimental_attachments || [],
        model,
        isAuthenticated,
      })
    }

    const allModels = await getAllModels()
    const modelConfig = allModels.find((m) => m.id === model)
    if (!modelConfig || !modelConfig.apiSdk) {
      throw new Error(`Model ${model} not found`)
    }

    const effectiveSystemPrompt = systemPrompt || "You are a helpful assistant."

    const cleanedMessages = cleanMessagesForTools(messages, false)

    const result = streamText({
      model: modelConfig.apiSdk(),
      system: effectiveSystemPrompt,
      messages: cleanedMessages,
      maxSteps: 10,
      onError: (err) => {
        console.error("streamText error:", err)
      },
      onFinish: async ({ response }) => {
        if (supabase) {
          await storeAssistantMessage({
            supabase,
            chatId,
            messages: response.messages,
          })
        }
      },
    })

    await result.consumeStream()

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
    return NextResponse.json(
      { error: (err as Error).message || "Internal error" },
      { status: 500 }
    )
  }
}
