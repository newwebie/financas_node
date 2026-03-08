'use client'

import { useState, useCallback, useEffect } from 'react'
import { getUserColors, getOtherUser, getPeriodo } from '@/lib/helpers'
import Sidebar from '@/components/Sidebar'
import HomePage from '@/components/pages/HomePage'
import NovoPage from '@/components/pages/NovoPage'
import AcertoPage from '@/components/pages/AcertoPage'
import RelatorioPage from '@/components/pages/RelatorioPage'
import CombustivelPage from '@/components/pages/CombustivelPage'
import MetasPage from '@/components/pages/MetasPage'
import AmbasPage from '@/components/pages/AmbasPage'
import EditarPage from '@/components/pages/EditarPage'
import ConfigPage from '@/components/pages/ConfigPage'
import ImportPage from '@/components/pages/ImportPage'
import LugaresPage from '@/components/pages/LugaresPage'
import { Menu } from 'lucide-react'
import Image from 'next/image'

const PAGES = [
  { id: 'home', icon: 'Home', label: 'Início' },
  { id: 'novo', icon: 'Plus', label: 'Novo' },
  { id: 'acerto', icon: 'Handshake', label: 'Acerto' },
  { id: 'relatorio', icon: 'BarChart3', label: 'Relatório' },
  { id: 'combustivel', icon: 'Fuel', label: 'Combustível' },
  { id: 'metas', icon: 'Target', label: 'Metas' },
  { id: 'ambas', icon: 'Users', label: 'Ambas' },
  { id: 'editar', icon: 'Pencil', label: 'Editar' },
  { id: 'import', icon: 'Download', label: 'Importar' },
  { id: 'lugares', icon: 'MapPin', label: 'Lugares' },
  { id: 'config', icon: 'Settings', label: 'Config' },
]

export default function AppShell({ user, onSwitchUser }) {
  const [activePage, setActivePage] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editItemId, setEditItemId] = useState(null)
  const [acertoFocus, setAcertoFocus] = useState(null)
  const [periodo, setPeriodo] = useState({ dataInicio: null, dataFim: null })
  const [pendentesCount, setPendentesCount] = useState(0)
  const colors = getUserColors(user)
  const outro = getOtherUser(user)

  useEffect(() => {
    loadPeriodo()
    loadPendentes()
  }, [user, refreshKey])

  async function loadPeriodo() {
    try {
      const config = await fetch(`/api/config?user=${user}`).then(r => r.json())
      const p = getPeriodo(config, user, 0)
      setPeriodo(p)
    } catch (error) {
      console.error('Erro ao carregar período:', error)
    }
  }

  async function loadPendentes() {
    try {
      const res = await fetch(`/api/pluggy/transacoes?user=${user}&status=pendente`)
      if (res.ok) {
        const data = await res.json()
        setPendentesCount(Array.isArray(data) ? data.length : 0)
      } else {
        setPendentesCount(0)
      }
    } catch {
      setPendentesCount(0)
    }
  }

  const handleNavigate = useCallback((pageId) => {
    setActivePage(pageId)
    setSidebarOpen(false)
  }, [])

  const openEditItem = useCallback((itemId) => {
    setEditItemId(itemId)
    setActivePage('editar')
    setSidebarOpen(false)
  }, [])

  const openAcerto = useCallback((section) => {
    setAcertoFocus(section)
    setActivePage('acerto')
    setSidebarOpen(false)
  }, [])

  const triggerRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  function renderPage() {
    const props = { user, outro, colors, refreshKey, triggerRefresh }
    switch (activePage) {
      case 'home': return <HomePage {...props} openEditItem={openEditItem} openAcerto={openAcerto} />
      case 'novo': return <NovoPage {...props} />
      case 'acerto': return <AcertoPage {...props} focusSection={acertoFocus} clearFocus={() => setAcertoFocus(null)} openEditItem={openEditItem} />
      case 'relatorio': return <RelatorioPage {...props} />
      case 'combustivel': return <CombustivelPage {...props} />
      case 'metas': return <MetasPage {...props} />
      case 'ambas': return <AmbasPage {...props} />
      case 'editar': return <EditarPage {...props} editItemId={editItemId} clearEditItemId={() => setEditItemId(null)} />
      case 'import': return <ImportPage {...props} />
      case 'lugares': return <LugaresPage user={user} colors={colors} />
      case 'config': return <ConfigPage {...props} />
      default: return <HomePage {...props} openEditItem={openEditItem} />
    }
  }

  return (
    <div className="min-h-screen bg-base-900 flex relative">
      {/* Background mobile */}
      <div className="absolute inset-0 md:hidden pointer-events-none">
        <Image
          src="/default_background.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar pages={PAGES} activePage={activePage} onNavigate={handleNavigate}
               isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)}
               user={user} colors={colors} onSwitchUser={onSwitchUser}
               periodo={periodo} pendentesCount={pendentesCount} />
      <main className="flex-1 min-h-screen lg:ml-[72px] xl:ml-[200px] relative z-10">
        <div className="sticky top-0 z-30 bg-base-900/80 backdrop-blur-md border-b border-white/5
                        px-4 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => setSidebarOpen(true)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
            <span className="text-sm font-medium text-white/80">{user}</span>
          </div>
          <div className="w-10" />
        </div>
        <div className="p-4 lg:p-6 xl:p-8 max-w-4xl xl:max-w-5xl mx-auto pb-24 animate-fade-in" key={activePage}>
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
