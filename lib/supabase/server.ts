// lib/supabase/server.ts
import { Database } from "@/app/types/database.types"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isSupabaseEnabled } from "./config"

/**
 * Client Supabase complet avec gestion des cookies en lecture/écriture
 */
export const createClient = async () => {
  if (!isSupabaseEnabled) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore en cas d'erreur (ex: middleware)
          }
        },
      },
    }
  )
}

/**
 * Client Supabase simplifié, avec accès en lecture de cookie par nom uniquement.
 * Utile si tu n'as pas besoin d'écrire dans les cookies.
 */
export const createSupabaseServerClient = () => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
