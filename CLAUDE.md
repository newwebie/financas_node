# CLAUDE.md — Finanças Node

Leia o arquivo `CONTEXTO.md` na raiz do projeto para ter o contexto completo: stack, estrutura de pastas, collections MongoDB, páginas, utilitários e integrações.

## Regras críticas

- **Timezone bug**: NUNCA use `new Date("YYYY-MM-DD")` — isso resulta em midnight UTC (dia anterior no Brasil). Sempre use `new Date("YYYY-MM-DD T12:00:00")`. No cliente, use `getFullYear()/getMonth()/getDate()` em vez de `.toISOString().split('T')[0]`.
- **JavaScript puro**: sem TypeScript, sem Mongoose — usa driver MongoDB nativo via `getCollections()`.
- **Autenticação**: apenas `localStorage` — sem JWT ou sessão server-side.
- **Sempre atualizar o CONTEXTO.md** ao adicionar novas features, rotas, collections ou mudanças estruturais relevantes.
