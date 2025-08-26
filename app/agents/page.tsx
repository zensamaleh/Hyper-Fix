import { AgentsPage } from "@/app/components/agents/agents-page"
import { LayoutApp } from "@/app/components/layout/layout-app"
import { MessagesProvider } from "@/lib/chat-store/messages/provider"
import { CURATED_AGENTS_SLUGS } from "@/lib/config"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function Page({
  searchParams,
}: {
  searchParams: { workspace_id?: string }
}) {
  if (!isSupabaseEnabled) {
    notFound()
  }

  const supabase = await createClient()

  if (!supabase) {
    notFound()
  }

  const { data: userData } = await supabase.auth.getUser()
  const workspaceId = searchParams.workspace_id

  const { data: curatedAgents, error: agentsError } = await supabase
    .from("agents")
    .select("*")
    .in("slug", CURATED_AGENTS_SLUGS)

  const userAgentsQuery = userData?.user?.id
    ? supabase
        .from("agents")
        .select("*")
        .eq("creator_id", userData.user.id)
    : null

  if (userAgentsQuery && workspaceId) {
    userAgentsQuery.eq("workspace_id", workspaceId)
  } else if (userAgentsQuery) {
    // Default behavior if no workspace_id is provided:
    // only show agents that are not in any workspace.
    userAgentsQuery.is("workspace_id", null)
  }

  const { data: userAgents, error: userAgentsError } = userAgentsQuery
    ? await userAgentsQuery
    : { data: [], error: null }

  if (agentsError) {
    console.error(agentsError)
    return <div>Error loading agents</div>
  }

  if (userAgentsError) {
    console.error(userAgentsError)
    return <div>Error loading user agents</div>
  }

  return (
    <MessagesProvider>
      <LayoutApp>
        <AgentsPage
          curatedAgents={curatedAgents}
          userAgents={userAgents || null}
          userId={userData?.user?.id || null}
        />
      </LayoutApp>
    </MessagesProvider>
  )
}
