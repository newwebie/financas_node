import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
const options = {
  maxPoolSize: 10,
  retryWrites: true,
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
}

let client
let clientPromise

if (!uri) {
  throw new Error('Adicione MONGODB_URI no arquivo .env.local')
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDb() {
  const client = await clientPromise
  const dbName = uri.split('/').pop()?.split('?')[0] || 'financas'
  return client.db(dbName)
}

export async function getCollections() {
  const db = await getDb()
  return {
    despesas: db.collection('despesas'),
    emprestimos: db.collection('emprestimos'),
    metas: db.collection('metas'),
    quitacoes: db.collection('quitacoes'),
    contas_fixas: db.collection('contas_fixas'),
    emprestimos_terceiros: db.collection('emprestimos_terceiros'),
    dividas_terceiros: db.collection('dividas_terceiros'),
    config: db.collection('config'),
  }
}
