'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">Failed to load this page</p>
        <p className="text-xs text-gray-500 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto text-sm text-blue-600 hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    </div>
  )
}
