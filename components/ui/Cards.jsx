'use client'

import { Utensils, Fuel, Car, Beer, Shirt, Pill, Gamepad2, Receipt, Home, PiggyBank, TrendingUp, Scissors, Package, Handshake, Target, FileText, Landmark, Search, Eye, Users, Plane } from 'lucide-react'

// Mapa de icones Lucide por categoria
const ICON_MAP = {
  Comida: Utensils,
  Combustivel: Fuel,
  Automoveis: Car,
  Bebidas: Beer,
  Vestuario: Shirt,
  Saude: Pill,
  Lazer: Gamepad2,
  Contas: Receipt,
  'Boa pra familia': Users,
  Cofrinho: PiggyBank,
  'Renda Variavel': TrendingUp,
  Trancas: Scissors,
  Espiritualidade: Eye,
  Viagem: Plane,
  Outros: Package,
  _emprestimo_pessoal: Handshake,
  _contas_fixas: FileText,
  _metas: Target,
  _emprestimo_terceiros: Landmark,
  _dividas_terceiros: FileText,
  Emprestei: Handshake,
}

export function CategoryIcon({ category, size = 16, className = '' }) {
  const Icon = ICON_MAP[category] || Package
  return <Icon size={size} className={className} />
}

// Card base com efeito glass
export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl
                  transition-all duration-300 overflow-hidden ${onClick ? 'cursor-pointer hover:border-white/10 hover:-translate-y-0.5' : ''}
                  ${className}`}
    >
      {children}
    </div>
  )
}

// Card de estatistica colorido (ex: Gastos, Cofrinho, Extra)
export function StatCard({ icon, label, value, color = 'neutral', delay = 0, className = '' }) {
  const colorMap = {
    su: 'bg-gradient-to-br from-su-400/20 to-su-600/10 border-su-400/20',
    pi: 'bg-gradient-to-br from-pi-400/20 to-pi-600/10 border-pi-400/20',
    mint: 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 border-emerald-400/20',
    peach: 'bg-gradient-to-br from-orange-400/20 to-orange-600/10 border-orange-400/20',
    lavender: 'bg-gradient-to-br from-violet-400/20 to-violet-600/10 border-violet-400/20',
    coral: 'bg-gradient-to-br from-red-400/20 to-red-600/10 border-red-400/20',
    neutral: 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10',
  }
  const textMap = {
    su: 'text-su-300', pi: 'text-pi-300', mint: 'text-emerald-400',
    peach: 'text-orange-400', lavender: 'text-violet-400', coral: 'text-red-400',
    neutral: 'text-white/50',
  }
  return (
    <div
      className={`rounded-3xl border p-4 overflow-hidden animate-slide-up ${colorMap[color]} ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-base">{icon}</span>}
        <span className={`text-xs font-medium truncate ${textMap[color]}`}>{label}</span>
      </div>
      <p className="text-xl font-semibold text-white tracking-tight truncate">{value}</p>
    </div>
  )
}

// Barra de progresso
export function ProgressBar({ value, max, color = '#f472b6', label, sublabel }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div>
      {(label || sublabel) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-white/80 truncate">{label}</span>
          <span className="text-xs text-white/40 font-mono flex-shrink-0 ml-2">{sublabel}</span>
        </div>
      )}
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}
        />
      </div>
    </div>
  )
}

// Item de lista com borda lateral colorida
export function ListItem({ children, borderColor = 'rgba(255,255,255,0.1)', onClick, className = '' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/[0.03] rounded-2xl p-4 border-l-[3px] overflow-hidden
                  transition-all duration-200 hover:bg-white/[0.05]
                  ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ borderLeftColor: borderColor }}
    >
      {children}
    </div>
  )
}

// Skeleton loading (shimmer)
export function Skeleton({ className = '' }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03]
                      bg-[length:200%_100%] animate-shimmer ${className}`} />
  )
}

export function CardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  )
}

// Estado vazio - icon aceita componente Lucide (function ou forwardRef) ou string/emoji
export function EmptyState({ icon: Icon, message = 'Nenhum dado encontrado', sub }) {
  const isComponent = typeof Icon === 'function' || (Icon && Icon.$$typeof)
  return (
    <div className="text-center py-16">
      {Icon && (
        isComponent
          ? <Icon size={48} className="text-white/20 mx-auto mb-4" />
          : <span className="text-5xl block mb-4">{Icon}</span>
      )}
      <p className="text-white/50 text-sm">{message}</p>
      {sub && <p className="text-white/30 text-xs mt-2">{sub}</p>}
    </div>
  )
}

// Titulo de seção
export function SectionTitle({ children, className = '' }) {
  return <h3 className={`text-sm font-medium text-white/50 mb-3 ${className}`}>{children}</h3>
}

// Badge
export function Badge({ children, color = 'neutral', icon }) {
  const colorMap = {
    su: 'bg-su-400/15 text-su-300 border-su-400/20',
    pi: 'bg-pi-400/15 text-pi-300 border-pi-400/20',
    mint: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
    coral: 'bg-red-400/15 text-red-400 border-red-400/20',
    neutral: 'bg-white/5 text-white/50 border-white/10',
    green: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
    red: 'bg-red-400/15 text-red-400 border-red-400/20',
    yellow: 'bg-amber-400/15 text-amber-400 border-amber-400/20',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[color] || colorMap.neutral}`}>
      {icon}
      {children}
    </span>
  )
}
