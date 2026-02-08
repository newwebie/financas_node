'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function UserSelector({ onSelect }) {
  const [perfis, setPerfis] = useState({ Susanna: null, Pietrah: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPerfis()
  }, [])

  async function loadPerfis() {
    try {
      const [cfgSu, cfgPi] = await Promise.all([
        fetch('/api/config?user=Susanna').then(r => r.json()),
        fetch('/api/config?user=Pietrah').then(r => r.json()),
      ])

      const perfilSu = cfgSu.find(c => c.tipo === 'perfil' && c.user === 'Susanna')
      const perfilPi = cfgPi.find(c => c.tipo === 'perfil' && c.user === 'Pietrah')

      setPerfis({
        Susanna: perfilSu ? { tipo: perfilSu.perfil_tipo, valor: perfilSu.perfil_valor } : { tipo: 'emoji', valor: '⚡' },
        Pietrah: perfilPi ? { tipo: perfilPi.perfil_tipo, valor: perfilPi.perfil_valor } : { tipo: 'emoji', valor: '🔱' },
      })
    } catch (error) {
      console.error('Erro ao carregar perfis:', error)
      // Usar padrões em caso de erro
      setPerfis({
        Susanna: { tipo: 'emoji', valor: '⚡' },
        Pietrah: { tipo: 'emoji', valor: '🔱' },
      })
    } finally {
      setLoading(false)
    }
  }

  function renderAvatar(user, perfil) {
    if (perfil.tipo === 'emoji') {
      return (
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg
                        bg-gradient-to-br from-gray-500/15 to-gray-700/15 shadow-gray-500/5">
          <span className="text-xl">{perfil.valor}</span>
        </div>
      )
    }
    return (
      <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg ring-2 shadow-gray-500/10 ring-white/20">
        <Image
          src={perfil.valor}
          alt={user}
          width={48}
          height={48}
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
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
            {renderAvatar('Susanna', perfis.Susanna)}
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
            {renderAvatar('Pietrah', perfis.Pietrah)}
            <p className="text-white font-semibold text-lg">Pietrah</p>
          </div>
        </button>
      </div>

    </div>
  )
}
