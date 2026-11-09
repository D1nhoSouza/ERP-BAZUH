
const Database = require('better-sqlite3')
const path = require('path')

// ============================================
// CONFIGURACAO DO BANCO DE DADOS
// ============================================

const environment = process.env.BAZUH_ENV || 'production'

const isTest = environment === 'test'
const isMigration = environment === 'migration'

// Bloquear ambientes desconhecidos
if (!['production', 'test', 'migration'].includes(environment)) {
  throw new Error(`Ambiente invalido: ${environment}`)
}

// ============================================
// CAMINHOS DOS BANCOS
// ============================================

const dbPath = isMigration
  ? path.join(
      __dirname,
      '..',
      'backups',
      'bazuh-migracao-teste.sqlite'
    )
  : isTest
    ? path.join(
        __dirname,
        '..',
        'backups',
        'bazuh-teste-vendas.sqlite'
      )
    : path.join(__dirname, 'bazuh.db')

// Impedir criacao acidental dos bancos de teste
// e migracao, caso os arquivos nao existam.

const db = new Database(
  dbPath,
  isTest || isMigration
    ? { fileMustExist: true }
    : {}
)

// ============================================
// CONFIGURACOES DO SQLITE
// ============================================

// Ativar integridade entre tabelas
db.pragma('foreign_keys = ON')

// Configurar modo de gravacao
db.pragma('journal_mode = WAL')

// ============================================
// TABELA DE PRODUTOS
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    costPrice REAL NOT NULL DEFAULT 0,
    salePrice REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    minStock INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )
`)

// ============================================
// TABELA DE VENDAS
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    total REAL NOT NULL,
    paymentMethod TEXT NOT NULL,
    amountReceived REAL NOT NULL DEFAULT 0,
    change REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    cancelledAt TEXT
  )
`)

// ============================================
// ITENS DAS VENDAS
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saleId TEXT NOT NULL,
    productId TEXT,
    productCode TEXT NOT NULL,
    productName TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unitPrice REAL NOT NULL,
    subtotal REAL NOT NULL,

    FOREIGN KEY (saleId)
      REFERENCES sales(id)
      ON DELETE CASCADE
  )
`)

// ============================================
// CONFIRMACAO DE CONEXAO
// ============================================

const environmentName = {
  production: 'PRODUCAO',
  test: 'TESTE',
  migration: 'MIGRACAO'
}

console.log(
  `BAZUH SQLite conectado - Ambiente: ${environmentName[environment]}`
)

console.log(`Banco utilizado: ${dbPath}`)

// ============================================
// EXPORTAR CONEXAO
// ============================================

module.exports = db
