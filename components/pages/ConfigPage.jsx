'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/Cards'
import { formatDateFull } from '@/lib/helpers'
import { Settings, Calendar, Check, Save, User, Image as ImageIcon } from 'lucide-react'

const EMOJIS_DISPONIVEIS = ['⚡', '🌟', '💫', '🔥', '💎', '🌸', '🦋', '🌺', '🎨', '🎭', '🎪', '🎯']

export default function ConfigPage({ user, outro, colors, refreshKey, triggerRefresh }) {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState([])
  const [perfilConfig, setPerfilConfig] = useState({ tipo: 'emoji', valor: '⚡' })
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    loadData()
  }, [user, refreshKey])

  async function loadData() {
    setLoading(true)
    try {
      const cfg = await fetch(`/api/config?user=${user}`).then(r => r.json())
      setConfig(cfg)

      // Buscar config de perfil
      const perfilCfg = cfg.find(c => c.tipo === 'perfil' && c.user === user)
      if (perfilCfg) {
        setPerfilConfig({
          tipo: perfilCfg.perfil_tipo || 'emoji',
          valor: perfilCfg.perfil_valor || '⚡'
        })
      }

      // Buscar config de período atual
      const hoje = new Date()
      const mesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
      const periodoCfg = cfg.find(c => c.mes === mesAno && c.user === user && c.tipo === 'periodo')

      if (periodoCfg && periodoCfg.data_inicio && periodoCfg.data_fim) {
        const inicio = new Date(periodoCfg.data_inicio)
        const fim = new Date(periodoCfg.data_fim)
        setDataInicio(inicio.toISOString().split('T')[0])
        setDataFim(fim.toISOString().split('T')[0])
      } else {
        // Valores padrão: início = dia 1 do mês, fim = último dia do mês
        const inicioDefault = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        const fimDefault = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        setDataInicio(inicioDefault.toISOString().split('T')[0])
        setDataFim(fimDefault.toISOString().split('T')[0])
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePerfil() {
    setSaving(true)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          tipo: 'perfil',
          perfil_tipo: perfilConfig.tipo,
          perfil_valor: perfilConfig.valor,
        }),
      })

      showToast('Perfil atualizado com sucesso!')
      await loadData()
      triggerRefresh()
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      showToast('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePeriodo() {
    if (!dataInicio || !dataFim) {
      showToast('Preencha as datas de início e fim')
      return
    }

    const inicio = new Date(dataInicio + 'T00:00:00')
    const fim = new Date(dataFim + 'T23:59:59')

    if (inicio >= fim) {
      showToast('Data de início deve ser anterior à data de fim')
      return
    }

    setSaving(true)
    try {
      const hoje = new Date()
      const mesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user,
          mes: mesAno,
          tipo: 'periodo',
          data_inicio: inicio.toISOString(),
          data_fim: fim.toISOString(),
        }),
      })

      showToast('Período atualizado com sucesso!')
      await loadData()
      triggerRefresh()
    } catch (error) {
      console.error('Erro ao salvar período:', error)
      showToast('Erro ao salvar período')
    } finally {
      setSaving(false)
    }
  }

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const periodoAtual = dataInicio && dataFim ? {
    inicio: new Date(dataInicio + 'T00:00:00'),
    fim: new Date(dataFim + 'T23:59:59')
  } : null

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings size={28} className="text-white" />
        <div>
          <h1 className="text-2xl font-semibold text-white">Configurações</h1>
          <p className="text-white/40 text-sm">Personalize sua experiência</p>
        </div>
      </div>

      {/* Configuração de Perfil */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={20} className="text-white/60" />
          <h2 className="text-white font-semibold text-lg">Foto/Emoji de Perfil</h2>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-2xl overflow-hidden shadow-lg ${user === 'Susanna' ? 'ring-2 ring-su-400/30' : 'ring-2 ring-pi-400/30'}`}>
            {perfilConfig.tipo === 'emoji' ? (
              <div className={`w-full h-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-2xl`}>
                {perfilConfig.valor}
              </div>
            ) : (
              <img src={perfilConfig.valor} alt="Perfil" className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <p className="text-white font-medium">{user}</p>
            <p className="text-white/40 text-xs">Preview do seu perfil</p>
          </div>
        </div>

        {/* Tipo de Perfil */}
        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Tipo</label>
            <div className="flex gap-3">
              <button
                onClick={() => setPerfilConfig({ ...perfilConfig, tipo: 'emoji' })}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all
                            ${perfilConfig.tipo === 'emoji'
                              ? `bg-gradient-to-br ${colors.gradient} text-white`
                              : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                Emoji
              </button>
              <button
                onClick={() => setPerfilConfig({ ...perfilConfig, tipo: 'foto' })}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all
                            ${perfilConfig.tipo === 'foto'
                              ? `bg-gradient-to-br ${colors.gradient} text-white`
                              : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
              >
                Foto
              </button>
            </div>
          </div>

          {perfilConfig.tipo === 'emoji' ? (
            <div>
              <label className="block text-white/60 text-sm mb-2">Escolha um emoji</label>
              <div className="grid grid-cols-6 gap-2">
                {EMOJIS_DISPONIVEIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setPerfilConfig({ ...perfilConfig, valor: emoji })}
                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all
                                ${perfilConfig.valor === emoji
                                  ? `bg-gradient-to-br ${colors.gradient} scale-110`
                                  : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-white/60 text-sm mb-2">URL da Foto</label>
              <input
                type="text"
                value={perfilConfig.valor}
                onChange={(e) => setPerfilConfig({ ...perfilConfig, valor: e.target.value })}
                placeholder="/avatars/pietrah.png"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20"
              />
              <p className="text-white/30 text-xs mt-2">
                Coloque a foto em /public/avatars/ e use o caminho /avatars/nome.png
              </p>
            </div>
          )}

          <button
            onClick={handleSavePerfil}
            disabled={saving}
            className={`w-full bg-gradient-to-br ${colors.gradient} text-white rounded-xl py-3 px-4
                        flex items-center justify-center gap-2 font-medium
                        hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </div>

      {/* Período Atual da Fatura */}
      {periodoAtual && (
        <div className={`bg-gradient-to-br ${colors.gradient} bg-opacity-20 border border-white/10 rounded-3xl p-6`}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={20} className="text-white/60" />
            <p className="text-white/60 text-sm font-medium">Período Configurado</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Data Início</span>
              <span className="text-white font-semibold">{formatDateFull(periodoAtual.inicio)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Data Fim</span>
              <span className="text-white font-semibold">{formatDateFull(periodoAtual.fim)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-white/60 text-sm">Dias no Período</span>
              <span className="text-white font-bold">
                {Math.ceil((periodoAtual.fim - periodoAtual.inicio) / (1000 * 60 * 60 * 24))} dias
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Configuração de Período */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
        <h2 className="text-white font-semibold text-lg mb-4">Período da Fatura Atual</h2>
        <p className="text-white/40 text-sm mb-6">
          Configure as datas de início e fim do seu período de faturamento
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Data de Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Data de Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20"
            />
          </div>

          <button
            onClick={handleSavePeriodo}
            disabled={saving}
            className={`w-full bg-gradient-to-br ${colors.gradient} text-white rounded-xl py-3 px-4
                        flex items-center justify-center gap-2 font-medium
                        hover:opacity-90 transition-opacity disabled:opacity-50`}
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Período'}
          </button>
        </div>
      </div>

      {/* Informações Adicionais */}
      <div className="bg-base-700/50 backdrop-blur-sm border border-white/5 rounded-3xl p-6">
        <h2 className="text-white font-semibold mb-3">ℹ️ Sobre o Período</h2>
        <div className="space-y-2 text-white/60 text-sm">
          <p>
            • O período define quando inicia e termina sua fatura mensal
          </p>
          <p>
            • Todas as despesas e cálculos são baseados neste período
          </p>
          <p>
            • Recomendamos usar o mesmo período do seu cartão de crédito
          </p>
          <p>
            • Exemplo: 11 do mês passado até 10 do mês atual
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-slide-up z-50">
          <Check size={20} />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </div>
  )
}
