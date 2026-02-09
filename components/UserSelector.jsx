'use client'

import Image from 'next/image'

const EMOJIS = { Susanna: '⚡', Pietrah: '🔱' }

export default function UserSelector({ onSelect }) {
  function renderAvatar(user) {
    return (
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg
                      bg-gradient-to-br from-gray-500/15 to-gray-700/15 shadow-gray-500/5">
        <span className="text-xl">{EMOJIS[user]}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-900 flex flex-col items-center justify-center pt-[50vh] px-6 relative overflow-hidden">
      {/* Background mobile */}
      <div className="absolute inset-0 md:hidden">
        <Image
          src="/login_background.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Background desktop */}
      <div className="absolute inset-0 hidden md:block">
        <Image
          src="/background_desktop.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Título (mobile only) */}
      <div className="text-center mb-16 animate-fade-in md:hidden">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Finanças</h1>
        <p className="text-white/40 text-sm mt-2 font-light">Quem está usando?</p>
      </div>

      {/* Botões */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => onSelect('Susanna')}
          className="group relative w-full py-5 px-6 rounded-3xl transition-all duration-300
                     bg-white/[0.03] border border-white/20 hover:border-white/40
                     active:scale-[0.98]"
        >
          <div className="absolute inset-0 rounded-3xl bg-white/[0.02]
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-4">
            {renderAvatar('Susanna')}
            <p className="text-white font-semibold text-lg">Susanna</p>
          </div>
        </button>

        <button
          onClick={() => onSelect('Pietrah')}
          className="group relative w-full py-5 px-6 rounded-3xl transition-all duration-300
                     bg-white/[0.03] border border-white/20 hover:border-white/40
                     active:scale-[0.98]"
        >
          <div className="absolute inset-0 rounded-3xl bg-white/[0.02]
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-4">
            {renderAvatar('Pietrah')}
            <p className="text-white font-semibold text-lg">Pietrah</p>
          </div>
        </button>
      </div>

    </div>
  )
}
