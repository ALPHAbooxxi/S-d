'use client'

import { AuthProvider } from '@/lib/auth-context'
import { StickersProvider } from '@/lib/stickers-context'
import { TradesProvider } from '@/lib/trades-context'

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <StickersProvider>
        <TradesProvider>
          {children}
        </TradesProvider>
      </StickersProvider>
    </AuthProvider>
  )
}
