import { createClient } from "@/lib/supabase/server"
import { nanoid } from "nanoid"
import slugify from "slugify"

function generateAgentSlug(title: string) {
  const base = slugify(title, { lower: true, strict: true, trim: true })
  const id = nanoid(6)
  return `${base}-${id}`
}

export async function POST(request: Request) {
  try {
    const {
      name,
      description,
      slug,
      systemPrompt,
      model_preference,
      mcp_config,
      example_inputs,
      avatar_url,
      tools = [],
      remixable = false,
      is_public = true,
      max_steps = 5,
      workspace_id, // Add workspace_id
    } = await request.json()

    if (!name || !description || !systemPrompt || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
        }
      )
    }

    const supabase = await createClient()

    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Supabase not available in this deployment." }),
        { status: 200 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
      })
    }

    const agentSlug = slug || generateAgentSlug(name)

    // Validate slug uniqueness
    if (slug) {
      const { data: existingAgent, error: slugError } = await supabase
        .from("agents")
        .select("id")
        .eq("slug", slug)
        .single()

      if (slugError && slugError.code !== "PGRST116") {
        // PGRST116 means no rows found, which is good.
        // Any other error is a problem.
        return new Response(JSON.stringify({ error: slugError.message }), {
          status: 500,
        })
      }

      if (existingAgent) {
        return new Response(
          JSON.stringify({ error: "This Model ID is already taken." }),
          {
            status: 409, // Conflict
          }
        )
      }
    }

    const { data: agent, error: supabaseError } = await supabase
      .from("agents")
      .insert({
        slug: agentSlug,
        name,
        description,
        avatar_url,
        model_preference,
        mcp_config,
        example_inputs,
        tools,
        remixable,
        is_public,
        system_prompt: systemPrompt,
        max_steps,
        creator_id: authData.user.id,
        workspace_id: workspace_id, // Add workspace_id to the insert object
      })
      .select()
      .single()

    if (supabaseError) {
      return new Response(JSON.stringify({ error: supabaseError.message }), {
        status: 500,
      })
    }

    return new Response(JSON.stringify({ agent }), { status: 201 })
  } catch (err: unknown) {
    console.error("Error in create-agent endpoint:", err)

    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500 }
    )
  }
}
