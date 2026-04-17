'use client'

/**
 * Componente: OFXUploader
 * Descrição: Área de upload de arquivos OFX e CSV para importar transações bancárias.
 * Props: { user, onImported }
 * onImported({ imported, skipped }) chamado após upload bem-sucedido.
 */

import { useState, useRef } from 'react'
import { Upload, FileText, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function OFXUploader({ user, onImported }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [guiaOpen, setGuiaOpen] = useState(false)
  const inputRef = useRef(null)

  async function uploadFile(file) {
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'ofx' && ext !== 'csv' && ext !== 'pdf') {
      setError('Formato inválido. Use arquivos .pdf, .ofx ou .csv')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    const endpoints = { ofx: '/api/import/ofx', csv: '/api/import/csv', pdf: '/api/import/pdf' }
    const endpoint = endpoints[ext]
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', user)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erro ${res.status} ao importar arquivo`)
      }

      const data = await res.json()
      setResult(data)
      onImported && onImported(data)
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo')
    } finally {
      setLoading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Área de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all
                    ${dragging
                      ? 'border-white/40 bg-white/10'
                      : 'border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/5'
                    }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-white/40 animate-spin" />
            <p className="text-white/50 text-sm">Importando transações...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={32} className="text-white/30" />
            <div>
              <p className="text-white/70 text-sm font-medium">
                Arraste um arquivo .pdf, .ofx ou .csv aqui
              </p>
              <p className="text-white/30 text-xs mt-1">ou use o botão abaixo</p>
            </div>
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white
                         text-sm font-medium hover:bg-white/15 transition-colors active:scale-[0.98]"
            >
              Escolher arquivo
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.ofx,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Resultado */}
      {result && (
        <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
          <CheckCircle2 size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-green-300 text-sm font-medium">
              {result.imported} {result.imported === 1 ? 'transação importada' : 'transações importadas'}
            </p>
            {result.skipped > 0 && (
              <p className="text-green-300/60 text-xs mt-0.5">
                {result.skipped} {result.skipped === 1 ? 'já existia' : 'já existiam'} e foram ignoradas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Guia de exportação */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
        <button
          onClick={() => setGuiaOpen(!guiaOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-white/40" />
            <span className="text-white/60 text-sm">Como exportar do seu banco</span>
          </div>
          {guiaOpen ? (
            <ChevronDown size={16} className="text-white/30" />
          ) : (
            <ChevronRight size={16} className="text-white/30" />
          )}
        </button>

        {guiaOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-white/5">
            <BancoGuia
              banco="Santander (PDF)"
              color="bg-red-600"
              passos={['Acesse o Internet Banking', 'Vá em Extrato de Conta Corrente', 'Escolha o período', 'Clique em Imprimir / Salvar PDF']}
            />
            <BancoGuia
              banco="Nubank"
              color="bg-purple-500"
              passos={['Abra o app', 'Toque em Conta', 'Vá em Extrato', 'Toque em Exportar', 'Escolha formato OFX']}
            />
            <BancoGuia
              banco="Inter"
              color="bg-orange-500"
              passos={['Abra o app', 'Acesse Extrato', 'Toque em Compartilhar', 'Escolha formato OFX']}
            />
            <BancoGuia
              banco="Itaú"
              color="bg-amber-400"
              passos={['Acesse o Internet Banking', 'Vá em Extrato', 'Clique em Salvar como OFX']}
            />
            <BancoGuia
              banco="Bradesco"
              color="bg-red-500"
              passos={['Acesse Net Empresas', 'Vá em Extrato', 'Clique em Exportar OFX']}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function BancoGuia({ banco, color, passos }) {
  return (
    <div className="pt-3">
      <p className="text-white/70 text-xs font-semibold mb-1.5 flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        {banco}
      </p>
      <ol className="space-y-0.5 pl-2">
        {passos.map((passo, i) => (
          <li key={i} className="text-white/40 text-xs flex items-start gap-1.5">
            <span className="text-white/20 flex-shrink-0">{i + 1}.</span>
            {passo}
          </li>
        ))}
      </ol>
    </div>
  )
}
