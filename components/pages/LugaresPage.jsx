'use client'

import LugaresManager from '@/components/LugaresManager'

export default function LugaresPage({ user, colors }) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} bg-opacity-20 flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Lugares Frequentes</h1>
          <p className="text-white/40 text-sm">Identifique automaticamente suas transações</p>
        </div>
      </div>

      <LugaresManager user={user} colors={colors} />
    </div>
  )
}
