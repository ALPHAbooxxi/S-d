import { createClient } from '@/lib/supabase/server'
import { ALBUM_CONFIG } from '@/lib/album-config'

async function fetchAllRows(query) {
  const PAGE_SIZE = 1000
  let allData = []
  let from = 0

  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      break
    }

    allData = allData.concat(data)

    if (data.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return allData
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user for highlighting
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id || null

    // Fetch all profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, created_at')

    if (profileError) {
      return Response.json({ error: profileError.message }, { status: 500 })
    }

    // Fetch sticker counts per user using aggregation via fetching all sticker rows
    let stickers = []
    try {
      stickers = await fetchAllRows(
        supabase
          .from('user_stickers')
          .select('user_id, sticker_number, quantity')
      )
    } catch (stickerError) {
       return Response.json({ error: stickerError.message }, { status: 500 })
    }

    // Aggregate sticker data per user
    const userStickers = new Map()
    ;(stickers || []).forEach((entry) => {
      const stats = userStickers.get(entry.user_id) || { owned: 0, duplicates: 0 }
      stats.owned++
      if (entry.quantity > 1) {
        stats.duplicates += entry.quantity - 1
      }
      userStickers.set(entry.user_id, stats)
    })

    // Build leaderboard entries
    const leaderboard = (profiles || [])
      .map((profile) => {
        const stats = userStickers.get(profile.id) || { owned: 0, duplicates: 0 }
        return {
          userId: profile.id,
          username: profile.username,
          displayName: profile.display_name || profile.username,
          ownedCount: stats.owned,
          duplicateCount: stats.duplicates,
          progress: Math.round((stats.owned / ALBUM_CONFIG.totalStickers) * 100 * 10) / 10,
          isCurrentUser: profile.id === currentUserId,
        }
      })
      .filter((entry) => entry.ownedCount > 0) // Only show users who have at least 1 sticker
      .sort((a, b) => b.ownedCount - a.ownedCount || b.progress - a.progress)
      .slice(0, 50)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))

    // Find current user's rank if not in top 50
    let currentUserRank = null
    if (currentUserId) {
      const currentInTop = leaderboard.find((entry) => entry.isCurrentUser)
      if (!currentInTop) {
        const allSorted = (profiles || [])
          .map((profile) => {
            const stats = userStickers.get(profile.id) || { owned: 0, duplicates: 0 }
            return { userId: profile.id, ownedCount: stats.owned }
          })
          .filter((entry) => entry.ownedCount > 0)
          .sort((a, b) => b.ownedCount - a.ownedCount)

        const idx = allSorted.findIndex((entry) => entry.userId === currentUserId)
        if (idx >= 0) {
          const stats = userStickers.get(currentUserId) || { owned: 0, duplicates: 0 }
          const profile = (profiles || []).find((p) => p.id === currentUserId)
          currentUserRank = {
            userId: currentUserId,
            username: profile?.username || '',
            displayName: profile?.display_name || profile?.username || '',
            ownedCount: stats.owned,
            duplicateCount: stats.duplicates,
            progress: Math.round((stats.owned / ALBUM_CONFIG.totalStickers) * 100 * 10) / 10,
            isCurrentUser: true,
            rank: idx + 1,
          }
        }
      }
    }

    return Response.json({
      leaderboard,
      currentUserRank,
      totalStickers: ALBUM_CONFIG.totalStickers,
    })
  } catch (error) {
    return Response.json({ error: error.message || 'Interner Fehler' }, { status: 500 })
  }
}
