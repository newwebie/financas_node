'use client'

import Image from 'next/image'
import {
  Home, Plus, Handshake, BarChart3, Fuel, Target,
  Users, Pencil, Settings, ArrowLeftRight, ChevronLeft, Menu
} from 'lucide-react'

const ICON_MAP = {
  Home, Plus, Handshake, BarChart3, Fuel, Target,
  Users, Pencil, Settings,
}

export default function Sidebar({ pages, activePage, onNavigate, isOpen, onToggle, user, colors, onSwitchUser, perfilConfig }) {
  const isSu = user === 'Susanna'
  const perfil = perfilConfig?.[user] || { tipo: 'emoji', valor: isSu ? '⚡' : '👤' }

  function renderAvatar(size = 40) {
    if (perfil.tipo === 'emoji') {
      return (
        <div className={`w-full h-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
          <span className="text-sm">{perfil.valor}</span>
        </div>
      )
    }
    return (
      <Image
        src={perfil.valor}
        alt={user}
        width={size}
        height={size}
        className="object-cover w-full h-full"
      />
    )
  }

  return (
    <>
      {/* Desktop: sidebar fixa com ícones */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[72px] z-50
                       bg-base-800/90 backdrop-blur-md border-r border-white/5
                       flex-col items-center py-4 gap-1">
        <button
          onClick={onSwitchUser}
          className={`w-10 h-10 rounded-2xl mb-4 overflow-hidden
                      ${isSu ? 'ring-2 ring-su-400/30' : 'ring-2 ring-pi-400/30'}
                      shadow-lg hover:scale-105 transition-transform active:scale-95`}
          title={`Trocar (${user})`}
        >
          {renderAvatar(40)}
        </button>
        <div className="w-8 h-px bg-white/10 mb-2" />
        {pages.map((page) => {
          const Icon = ICON_MAP[page.icon]
          const isActive = activePage === page.id
          return (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200
                          ${isActive
                            ? `bg-white/10 ${isSu ? 'text-su-400' : 'text-pi-400'}`
                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
              title={page.label}
            >
              <Icon size={20} strokeWidth={1.8} />
            </button>
          )
        })}
      </nav>

      {/* Mobile: sidebar deslizante */}
      <div className={`fixed left-0 top-0 bottom-0 w-64 z-50 bg-base-800/95 backdrop-blur-md
                        border-r border-white/5 flex flex-col transition-transform duration-300 ease-out
                        lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl overflow-hidden shadow-lg ${isSu ? 'ring-2 ring-su-400/30' : 'ring-2 ring-pi-400/30'}`}>
              {renderAvatar(40)}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{user}</p>
              <p className="text-white/30 text-xs">Finanças</p>
            </div>
          </div>
          <button onClick={onToggle} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
            <ChevronLeft size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-3">
          {pages.map((page) => {
            const Icon = ICON_MAP[page.icon]
            const isActive = activePage === page.id
            return (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all duration-200
                            ${isActive
                              ? `bg-white/10 ${isSu ? 'text-su-400' : 'text-pi-400'}`
                              : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="text-sm font-medium">{page.label}</span>
              </button>
            )
          })}
        </div>
        <div className="p-3 border-t border-white/5">
          <button
            onClick={onSwitchUser}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <ArrowLeftRight size={18} strokeWidth={1.8} />
            <span className="text-sm">Trocar usuário</span>
          </button>
        </div>
      </div>
    </>
  )
}
