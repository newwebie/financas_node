'use client'

import { formatDateFull } from '@/lib/helpers'
import {
  Home, Plus, Handshake, BarChart3, Fuel, Target,
  Users, Pencil, Settings, ArrowLeftRight, ChevronLeft, Menu, Calendar, Download, MapPin
} from 'lucide-react'

const ICON_MAP = {
  Home, Plus, Handshake, BarChart3, Fuel, Target,
  Users, Pencil, Settings, Download, MapPin,
}

export default function Sidebar({ pages, activePage, onNavigate, isOpen, onToggle, user, colors, onSwitchUser, periodo, pendentesCount = 0 }) {
  const isSu = user === 'Susanna'
  const emoji = isSu ? '⚡' : '🔱'

  function renderAvatar() {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
        <span className="text-sm">{emoji}</span>
      </div>
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
          {renderAvatar()}
        </button>
        {periodo?.dataInicio && (
          <div className="mb-3 flex flex-col items-center" title="Período da Fatura">
            <Calendar size={14} className="text-white/30 mb-1" />
            <p className="text-white/30 text-[8px] leading-tight text-center">
              {formatDateFull(periodo.dataInicio)?.split(' de ').slice(0, 2).join('/')}
            </p>
            <p className="text-white/30 text-[8px] leading-tight text-center">
              {formatDateFull(periodo.dataFim)?.split(' de ').slice(0, 2).join('/')}
            </p>
          </div>
        )}
        <div className="w-8 h-px bg-white/10 mb-2" />
        {pages.map((page) => {
          const Icon = ICON_MAP[page.icon]
          const isActive = activePage === page.id
          const showBadge = page.id === 'import' && pendentesCount > 0
          return (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200
                          ${isActive
                            ? `bg-white/10 ${isSu ? 'text-su-400' : 'text-pi-400'}`
                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
              title={page.label}
            >
              <Icon size={20} strokeWidth={1.8} />
              {showBadge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {pendentesCount > 9 ? '9+' : pendentesCount}
                </span>
              )}
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
              {renderAvatar()}
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
        {periodo?.dataInicio && (
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Calendar size={14} className="text-white/30 flex-shrink-0" />
            <div>
              <p className="text-white/30 text-[10px] font-medium">Período da Fatura</p>
              <p className="text-white/50 text-xs">
                {formatDateFull(periodo.dataInicio)} - {formatDateFull(periodo.dataFim)}
              </p>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-3 px-3">
          {pages.map((page) => {
            const Icon = ICON_MAP[page.icon]
            const isActive = activePage === page.id
            const showBadge = page.id === 'import' && pendentesCount > 0
            return (
              <button
                key={page.id}
                onClick={() => onNavigate(page.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all duration-200
                            ${isActive
                              ? `bg-white/10 ${isSu ? 'text-su-400' : 'text-pi-400'}`
                              : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}
              >
                <div className="relative flex-shrink-0">
                  <Icon size={20} strokeWidth={1.8} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                      {pendentesCount > 9 ? '9+' : pendentesCount}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">{page.label}</span>
                {showBadge && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendentesCount > 9 ? '9+' : pendentesCount}
                  </span>
                )}
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
