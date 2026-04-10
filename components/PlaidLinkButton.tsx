'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'

declare global {
  interface Window {
    Plaid: {
      create: (config: PlaidConfig) => { open: () => void; destroy: () => void }
    }
  }
}

interface PlaidConfig {
  token: string
  onSuccess: (public_token: string, metadata: { institution: { name: string } }) => void
  onExit: () => void
}

export function PlaidLinkButton({ onSuccess }: { onSuccess?: () => void }) {
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.onload = () => setReady(true)
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const open = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/plaid/create-link-token', { method: 'POST' })
    const { link_token } = await res.json()

    const handler = window.Plaid.create({
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token, institution_name: metadata.institution.name }),
        })
        onSuccess?.()
      },
      onExit: () => setLoading(false),
    })
    handler.open()
    setLoading(false)
  }, [onSuccess])

  return (
    <button
      onClick={open}
      disabled={!ready || loading}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      <Link2 className="h-4 w-4" />
      {loading ? 'Connecting…' : 'Connect Account'}
    </button>
  )
}
