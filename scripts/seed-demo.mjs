import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoPassword = process.env.DEMO_USER_PASSWORD || 'DalumDemo123!'

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Fehlende Env-Variablen. Setze NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const demoUsers = [
  {
    username: 'anna-dalum',
    displayName: 'Anna Dalum',
    email: 'demo.anna@svd-stickertausch.local',
    stickers: {
      1: 1, 2: 1, 4: 1, 7: 2, 8: 1, 12: 3, 15: 1, 18: 1, 23: 1, 28: 1,
      31: 1, 42: 1, 55: 1, 61: 1, 64: 1, 70: 2, 73: 1, 88: 2, 91: 1, 107: 1,
      130: 1, 144: 1, 155: 1, 188: 1, 207: 1, 236: 1, 241: 1, 273: 1, 304: 1, 335: 1,
    },
    offers: [
      { offer_type: 'tausch', sticker_numbers: [7, 12, 70, 88], description: 'Mehrere doppelte Sticker zum Tauschen.' },
      { offer_type: 'suche', sticker_numbers: [3, 5, 9, 90], description: 'Diese Sticker fehlen noch im Album.' },
    ],
  },
  {
    username: 'ben-holt',
    displayName: 'Ben Holt',
    email: 'demo.ben@svd-stickertausch.local',
    stickers: {
      3: 1, 5: 1, 7: 1, 9: 1, 12: 1, 19: 1, 24: 1, 28: 2, 30: 1, 33: 1,
      45: 1, 61: 2, 64: 1, 66: 1, 71: 1, 88: 1, 90: 2, 92: 1, 95: 1, 107: 1,
      109: 1, 131: 1, 145: 1, 188: 2, 208: 1, 237: 1, 244: 1, 305: 1, 336: 1, 400: 1,
    },
    offers: [
      { offer_type: 'tausch', sticker_numbers: [28, 61, 90, 188], description: 'Tausche gerne direkt in der App.' },
    ],
  },
  {
    username: 'clara-svd',
    displayName: 'Clara SVD',
    email: 'demo.clara@svd-stickertausch.local',
    stickers: {
      2: 1, 3: 1, 6: 1, 8: 2, 11: 1, 14: 1, 17: 1, 20: 1, 22: 1, 29: 1,
      36: 1, 40: 2, 46: 1, 58: 1, 62: 1, 70: 1, 72: 2, 84: 1, 87: 1, 95: 2,
      108: 1, 132: 1, 156: 1, 189: 1, 209: 1, 239: 1, 245: 1, 274: 1, 306: 1, 337: 1,
    },
    offers: [
      { offer_type: 'tausch', sticker_numbers: [8, 40, 72, 95], description: 'Vier gute Tausch-Sticker vorhanden.' },
      { offer_type: 'suche', sticker_numbers: [1, 7, 12, 88], description: 'Suche vor allem fruehe Nummern.' },
    ],
  },
  {
    username: 'david-verein',
    displayName: 'David Verein',
    email: 'demo.david@svd-stickertausch.local',
    stickers: {
      1: 1, 4: 1, 6: 1, 9: 2, 10: 1, 13: 1, 16: 1, 21: 1, 25: 1, 32: 1,
      37: 1, 43: 1, 50: 1, 61: 1, 67: 2, 74: 1, 83: 1, 88: 1, 90: 1, 96: 1,
      110: 1, 133: 1, 146: 2, 190: 1, 210: 1, 240: 1, 246: 1, 307: 1, 338: 1, 401: 1,
    },
    offers: [
      { offer_type: 'tausch', sticker_numbers: [9, 67, 146], description: 'Ein paar doppelte Sticker fuer spontane Tausche.' },
    ],
  },
]

const seededTradeIds = {
  annaToBen: randomUUID(),
  claraToAnna: randomUUID(),
}

function mapStickerRows(userId, stickers) {
  return Object.entries(stickers).map(([stickerNumber, quantity]) => ({
    user_id: userId,
    sticker_number: Number(stickerNumber),
    quantity,
  }))
}

async function ensureDemoUser(seedUser, existingUsersByEmail) {
  const existingUser = existingUsersByEmail.get(seedUser.email)

  if (existingUser) {
    return existingUser
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: seedUser.email,
    password: demoPassword,
    email_confirm: true,
    user_metadata: {
      username: seedUser.username,
      display_name: seedUser.displayName,
    },
  })

  if (error) {
    throw error
  }

  return data.user
}

async function loadExistingUsers() {
  const existingUsersByEmail = new Map()
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw error
    }

    for (const user of data.users) {
      existingUsersByEmail.set(user.email, user)
    }

    if (data.users.length < 200) {
      break
    }

    page += 1
  }

  return existingUsersByEmail
}

async function resetDemoRows(userIds) {
  await supabase.from('messages').delete().in('sender_id', userIds)
  await supabase.from('messages').delete().in('receiver_id', userIds)
  await supabase.from('trade_requests').delete().in('sender_id', userIds)
  await supabase.from('trade_requests').delete().in('receiver_id', userIds)
  await supabase.from('offers').delete().in('user_id', userIds)
  await supabase.from('user_stickers').delete().in('user_id', userIds)
}

async function seedProfiles(users) {
  const profileRows = users.map((user, index) => ({
    id: user.id,
    username: demoUsers[index].username,
    display_name: demoUsers[index].displayName,
    email: demoUsers[index].email,
    contact_method: 'platform',
    contact_info: null,
  }))

  const { error } = await supabase.from('profiles').upsert(profileRows, {
    onConflict: 'id',
  })

  if (error) {
    throw error
  }
}

async function seedStickers(users) {
  const stickerRows = users.flatMap((user, index) =>
    mapStickerRows(user.id, demoUsers[index].stickers)
  )

  const { error } = await supabase.from('user_stickers').insert(stickerRows)

  if (error) {
    throw error
  }
}

async function seedOffers(users) {
  const offerRows = users.flatMap((user, index) =>
    demoUsers[index].offers.map((offer) => ({
      id: randomUUID(),
      user_id: user.id,
      offer_type: offer.offer_type,
      sticker_numbers: offer.sticker_numbers,
      description: offer.description,
      status: 'aktiv',
    }))
  )

  const { error } = await supabase.from('offers').insert(offerRows)

  if (error) {
    throw error
  }
}

async function seedTradesAndMessages(users) {
  const byUsername = new Map(users.map((user, index) => [demoUsers[index].username, user]))

  const anna = byUsername.get('anna-dalum')
  const ben = byUsername.get('ben-holt')
  const clara = byUsername.get('clara-svd')

  const tradeRows = [
    {
      id: seededTradeIds.annaToBen,
      sender_id: anna.id,
      receiver_id: ben.id,
      request_type: 'tausch',
      offered_stickers: [12, 88],
      requested_stickers: [90, 188],
      message: 'Ich haette #12 und #88 fuer dich und suche #90 oder #188.',
      status: 'offen',
    },
    {
      id: seededTradeIds.claraToAnna,
      sender_id: clara.id,
      receiver_id: anna.id,
      request_type: 'tausch',
      offered_stickers: [8, 72],
      requested_stickers: [7, 12],
      message: 'Haettest du Lust auf einen kleinen Tausch?',
      status: 'akzeptiert',
    },
  ]

  const { error: tradeError } = await supabase.from('trade_requests').insert(tradeRows)

  if (tradeError) {
    throw tradeError
  }

  const messageRows = [
    {
      id: randomUUID(),
      sender_id: anna.id,
      receiver_id: ben.id,
      trade_request_id: seededTradeIds.annaToBen,
      content: 'Hi Ben, dein Profil sieht passend aus. Wollen wir tauschen?',
      is_read: false,
    },
    {
      id: randomUUID(),
      sender_id: ben.id,
      receiver_id: anna.id,
      trade_request_id: seededTradeIds.annaToBen,
      content: 'Ja, klingt gut. Ich schaue heute Abend nochmal rein.',
      is_read: true,
    },
    {
      id: randomUUID(),
      sender_id: clara.id,
      receiver_id: anna.id,
      trade_request_id: seededTradeIds.claraToAnna,
      content: 'Ich koennte dir #8 und #72 geben.',
      is_read: true,
    },
    {
      id: randomUUID(),
      sender_id: anna.id,
      receiver_id: clara.id,
      trade_request_id: seededTradeIds.claraToAnna,
      content: 'Perfekt, #7 und #12 habe ich doppelt.',
      is_read: true,
    },
  ]

  const { error: messageError } = await supabase.from('messages').insert(messageRows)

  if (messageError) {
    throw messageError
  }
}

async function main() {
  console.log('Demo-Seed startet...')

  const existingUsersByEmail = await loadExistingUsers()
  const users = []

  for (const seedUser of demoUsers) {
    const user = await ensureDemoUser(seedUser, existingUsersByEmail)
    users.push(user)
  }

  const userIds = users.map((user) => user.id)

  await resetDemoRows(userIds)
  await seedProfiles(users)
  await seedStickers(users)
  await seedOffers(users)
  await seedTradesAndMessages(users)

  console.log('Demo-Daten erfolgreich angelegt.')
  console.log('')
  console.log('Demo-Accounts:')
  demoUsers.forEach((user) => {
    console.log(`- ${user.displayName} | ${user.email} | Passwort: ${demoPassword}`)
  })
  console.log('')
  console.log('Hinweis: Die App liest Profile und Sticker bereits aus Supabase.')
  console.log('Chats und Tauschanfragen im UI laufen aktuell noch lokal ueber localStorage.')
}

main().catch((error) => {
  console.error('Seed fehlgeschlagen:')
  console.error(error)
  process.exit(1)
})
