import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ALBUM_CONFIG } from '@/lib/album-config'

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('UNAUTHORIZED')
  }
}

async function countRows(supabase, table, applyFilters) {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })

  if (typeof applyFilters === 'function') {
    query = applyFilters(query)
  }

  const { count, error } = await query

  if (error) {
    throw error
  }

  return count || 0
}

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

function getPairKey(senderId, receiverId) {
  return [senderId, receiverId].sort().join(':')
}

export async function GET() {
  try {
    await requireUser()

    const admin = createAdminClient()

    const [
      totalUsers,
      totalMessages,
      stickerRows,
      tradeRows,
    ] = await Promise.all([
      countRows(admin, 'profiles'),
      countRows(admin, 'messages'),
      fetchAllRows(
        admin
          .from('user_stickers')
          .select('user_id, sticker_number, quantity')
      ),
      fetchAllRows(
        admin
          .from('trade_requests')
          .select('sender_id, receiver_id, status')
      ),
    ])

    const activeCollectors = new Set()
    const collectedNumbers = new Set()
    const ownedByUser = new Map()
    let totalStickerCopies = 0
    let totalDuplicateCopies = 0

    stickerRows.forEach((entry) => {
      activeCollectors.add(entry.user_id)
      collectedNumbers.add(entry.sticker_number)
      totalStickerCopies += entry.quantity || 0
      totalDuplicateCopies += Math.max(0, (entry.quantity || 0) - 1)

      const current = ownedByUser.get(entry.user_id) || 0
      ownedByUser.set(entry.user_id, current + 1)
    })

    const activeCollectorCount = activeCollectors.size
    const averageOwned = activeCollectorCount
      ? Math.round(
        Array.from(ownedByUser.values()).reduce((sum, value) => sum + value, 0) /
        activeCollectorCount
      )
      : 0

    const tradeStatusCounts = tradeRows.reduce((counts, trade) => {
      counts[trade.status] = (counts[trade.status] || 0) + 1
      return counts
    }, {})

    const conversationPairs = new Set(
      tradeRows.map((trade) => getPairKey(trade.sender_id, trade.receiver_id))
    )

    return Response.json({
      totalUsers,
      activeCollectors: activeCollectorCount,
      totalStickerCopies,
      totalDuplicateCopies,
      uniqueStickerNumbers: collectedNumbers.size,
      albumStickerTotal: ALBUM_CONFIG.totalStickers,
      averageOwned,
      totalTrades: tradeRows.length,
      openTrades: tradeStatusCounts.offen || 0,
      acceptedTrades: tradeStatusCounts.akzeptiert || 0,
      completedTrades: tradeStatusCounts.erledigt || 0,
      declinedTrades: tradeStatusCounts.abgelehnt || 0,
      totalMessages,
      activeTradePairs: conversationPairs.size,
    })
  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 })
    }

    return Response.json(
      { error: error.message || 'Praesentationszahlen konnten nicht geladen werden.' },
      { status: 500 }
    )
  }
}
