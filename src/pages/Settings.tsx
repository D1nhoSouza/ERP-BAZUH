
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

type StoreSettings = {
  storeName: string
  cnpj: string
  phone: string
  whatsapp: string
  email: string
  address: string
  receiptMessage: string
}

type BackupData = {
  app: string
  version: number
  createdAt: string
  data: {
    products: unknown[]
    sales: unknown[]
    settings: StoreSettings
    nextProductCode?: number
  }
}

const SETTINGS_KEY = 'bazuh-pdv-settings'
const PRODUCTS_KEY = 'bazuh-pdv-products'
const SALES_KEY = 'bazuh-pdv-sales'
const CODE_COUNTER_KEY = 'bazuh-pdv-next-product-code'

const defaultSettings: StoreSettings = {
  storeName: 'BAZUH',
  cnpj: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  receiptMessage: 'Obrigado pela preferência!',
}

function loadSettings(): StoreSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)

    return saved
      ? { ...defaultSettings, ...JSON.parse(saved) }
      : defaultSettings
  } catch {
    return defaultSettings
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function getHighestProductNumber(products: unknown[]): number {
  let highest = 0

  for (const product of products) {
    if (!isRecord(product) || typeof product.code !== 'string') {
      continue
    }

    const match = product.code.match(/^BAZ(\d+)$/i)

    if (match) {
      const number = Number(match[1])

      if (Number.isSafeInteger(number)) {
        highest = Math.max(highest, number)
      }
    }
  }

  return highest
}

function getNextProductCode(products: unknown[]): number {
  const saved = Number(
    localStorage.getItem(CODE_COUNTER_KEY)
  )

  const savedCounter = isPositiveInteger(saved) ? saved : 1

  return Math.max(
    savedCounter,
    getHighestProductNumber(products) + 1
  )
}

function isValidBackup(value: unknown): value is BackupData {
  if (!isRecord(value)) return false

  if (value.app !== 'bazuh-pdv') return false

  if (value.version !== 1 && value.version !== 2) {
    return false
  }

  if (typeof value.createdAt !== 'string') return false

  if (!isRecord(value.data)) return false

  const { products, sales, settings, nextProductCode } = value.data

  if (!Array.isArray(products) || !Array.isArray(sales)) {
    return false
  }

  if (!isRecord(settings)) return false

  const fields = [
    'storeName',
    'cnpj',
    'phone',
    'whatsapp',
    'email',
    'address',
    'receiptMessage',
  ]

  if (!fields.every((field) => typeof settings[field] === 'string')) {
    return false
  }

  if (value.version === 2) {
    return isPositiveInteger(nextProductCode)
  }

  return true
}

export default function Settings() {
  const [settings, setSettings] = useState<StoreSettings>(loadSettings)
  const [savedMessage, setSavedMessage] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(
    field: keyof StoreSettings,
    value: string
  ) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }))

    setSavedMessage('')
  }

  function handleSave() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      )

      setSavedMessage('Configurações salvas com sucesso!')
    } catch {
      setSavedMessage('Erro ao salvar as configurações.')
    }
  }

  function exportBackup() {
    try {
      const products: unknown = JSON.parse(
        localStorage.getItem(PRODUCTS_KEY) || '[]'
      )

      const sales: unknown = JSON.parse(
        localStorage.getItem(SALES_KEY) || '[]'
      )

      if (!Array.isArray(products) || !Array.isArray(sales)) {
        throw new Error('Dados locais inválidos.')
      }

      const savedSettings = loadSettings()

      const backup: BackupData = {
        app: 'bazuh-pdv',
        version: 2,
        createdAt: new Date().toISOString(),
        data: {
          products,
          sales,
          settings: savedSettings,
          nextProductCode: getNextProductCode(products),
        },
      }

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: 'application/json' }
      )

      const url = URL.createObjectURL(blob)

      const date = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')

      const link = document.createElement('a')

      link.href = url
      link.download = `backup-bazuh-pdv-${date}.json`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      setBackupMessage(
        'Backup gerado com produtos, vendas, configurações e sequência dos códigos.'
      )
    } catch {
      setBackupMessage(
        'Não foi possível gerar o backup. Verifique os dados locais.'
      )
    }
  }

  async function importBackup(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      const content = await file.text()
      const parsed: unknown = JSON.parse(content)

      if (!isValidBackup(parsed)) {
        throw new Error('Formato de backup inválido.')
      }

      const confirmed = window.confirm(
        'ATENÇÃO: Restaurar este backup substituirá todos os produtos, vendas, configurações e o contador de códigos atuais.\n\n' +
        `Backup criado em: ${new Date(parsed.createdAt).toLocaleString('pt-BR')}\n\n` +
        'Deseja continuar?'
      )

      if (!confirmed) return

      const previousValues = {
        products: localStorage.getItem(PRODUCTS_KEY),
        sales: localStorage.getItem(SALES_KEY),
        settings: localStorage.getItem(SETTINGS_KEY),
        counter: localStorage.getItem(CODE_COUNTER_KEY),
      }

      const currentNextCode = getNextProductCode(
        (() => {
          try {
            const current = JSON.parse(
              localStorage.getItem(PRODUCTS_KEY) || '[]'
            )

            return Array.isArray(current) ? current : []
          } catch {
            return []
          }
        })()
      )

      const restoredNextCode = Math.max(
        currentNextCode,
        parsed.data.nextProductCode ?? 1,
        getHighestProductNumber(parsed.data.products) + 1
      )

      try {
        localStorage.setItem(
          PRODUCTS_KEY,
          JSON.stringify(parsed.data.products)
        )

        localStorage.setItem(
          SALES_KEY,
          JSON.stringify(parsed.data.sales)
        )

        localStorage.setItem(
          SETTINGS_KEY,
          JSON.stringify(parsed.data.settings)
        )

        localStorage.setItem(
          CODE_COUNTER_KEY,
          String(restoredNextCode)
        )
      } catch (error) {
        try {
          const restoreValue = (
            key: string,
            value: string | null
          ) => {
            if (value === null) {
              localStorage.removeItem(key)
            } else {
              localStorage.setItem(key, value)
            }
          }

          restoreValue(PRODUCTS_KEY, previousValues.products)
          restoreValue(SALES_KEY, previousValues.sales)
          restoreValue(SETTINGS_KEY, previousValues.settings)
          restoreValue(CODE_COUNTER_KEY, previousValues.counter)
        } catch {
          // Pode ser necessário recuperar os dados manualmente.
        }

        throw error
      }

      setSettings({
        ...defaultSettings,
        ...parsed.data.settings,
      })

      alert(
        'Backup restaurado! O sistema será recarregado para atualizar os dados.'
      )

      window.location.reload()
    } catch {
      setBackupMessage(
        'Falha na restauração. Verifique o arquivo. Se houve erro de armazenamento, confira os dados atuais antes de tentar novamente.'
      )
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h2>Configurações</h2>
          <p>Gerencie as informações comerciais da sua loja.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Dados da empresa</h3>
            <p>Informações comerciais da Bazuh.</p>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Nome da empresa
            <input
              value={settings.storeName}
              onChange={(event) =>
                handleChange('storeName', event.target.value)
              }
              placeholder="Nome da loja"
            />
          </label>

          <label>
            CNPJ
            <input
              value={settings.cnpj}
              onChange={(event) =>
                handleChange('cnpj', event.target.value)
              }
              placeholder="00.000.000/0000-00"
            />
          </label>

          <label>
            WhatsApp
            <input
              value={settings.whatsapp}
              onChange={(event) =>
                handleChange('whatsapp', event.target.value)
              }
              placeholder="(00) 00000-0000"
            />
          </label>

          <label>
            E-mail comercial
            <input
              type="email"
              value={settings.email}
              onChange={(event) =>
                handleChange('email', event.target.value)
              }
              placeholder="contato@bazuh.com.br"
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Comprovantes</h3>
            <p>Personalize a mensagem exibida no rodapé.</p>
          </div>
        </div>

        <label>
          Mensagem do comprovante
          <input
            value={settings.receiptMessage}
            onChange={(event) =>
              handleChange('receiptMessage', event.target.value)
            }
            placeholder="Obrigado pela preferência!"
          />
        </label>
      </section>

      <section className="panel">
        <div className="form-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleSave}
          >
            Salvar configurações
          </button>

          {savedMessage && (
            <span style={{ color: 'green' }}>
              {savedMessage}
            </span>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Backup e restauração</h3>
            <p>
              Proteja os produtos, vendas, configurações
              e códigos armazenados neste navegador.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="primary-button"
            onClick={exportBackup}
          >
            Exportar backup
          </button>

          <button
            type="button"
            className="text-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Restaurar backup
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={importBackup}
            style={{ display: 'none' }}
          />
        </div>

        <p style={{ marginTop: '14px', fontSize: '13px' }}>
          A restauração substitui os dados atuais.
          Faça um backup antes de restaurar outro arquivo.
        </p>

        {backupMessage && (
          <p style={{ marginTop: '12px' }}>
            {backupMessage}
          </p>
        )}
      </section>
    </div>
  )
}
