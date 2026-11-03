
import { useEffect, useState } from 'react'

type SaleItem = {
  product: {
    id: string
    code: string
    name: string
    salePrice: number
  }
  quantity: number
}

type Sale = {
  id: string
  items: SaleItem[]
  total: number
  paymentMethod: string
  amountReceived: number
  change: number
  date: string
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR')
}

function History() {
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)

  useEffect(() => {
    try {
      const savedSales = localStorage.getItem('bazuh-pdv-sales')
      setSales(savedSales ? JSON.parse(savedSales) : [])
    } catch {
      setSales([])
    }
  }, [])

  const totalSales = sales.reduce(
    (total, sale) => total + sale.total,
    0,
  )

  function printReceipt() {
    const receipt = document.querySelector('.receipt')

    if (!receipt) {
      alert('Comprovante não encontrado.')
      return
    }

    const printWindow = window.open(
      '',
      '_blank',
      'width=400,height=600',
    )

    if (!printWindow) {
      alert('O navegador bloqueou a janela de impressão.')
      return
    }

    const logoUrl = `${window.location.origin}/logo-bazuh.jpg`

    const receiptClone = receipt.cloneNode(true) as HTMLElement
    const logoClone = receiptClone.querySelector(
      '.receipt-logo',
    ) as HTMLImageElement | null

    if (logoClone) {
      logoClone.src = logoUrl
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Comprovante BAZUH</title>

          <style>
            @page {
              size: 58mm 200mm;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 58mm;
              margin: 0;
              padding: 0;
              background: white;
              color: black;
              font-family: Arial, sans-serif;
              font-size: 10px;
            }

            .receipt {
              display: block;
              width: 48mm;
              max-width: 48mm;
              margin: 0 auto;
              padding: 2mm 0;
              line-height: 1.35;
              font-size: 10px;
              overflow-wrap: anywhere;
            }

            .receipt-header,
            .receipt-footer {
              text-align: center;
            }

            .receipt-logo {
              display: block;
              width: 32mm;
              max-width: 100%;
              height: auto;
              margin: 0 auto 8px;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }

            .receipt p {
              margin: 6px 0;
            }

            .receipt h2 {
              font-size: 16px;
              margin: 8px 0;
            }

            .receipt h3 {
              font-size: 12px;
              margin: 8px 0;
            }

            .receipt hr {
              border: none;
              border-top: 1px dashed black;
              margin: 8px 0;
            }

            .receipt-item {
              margin: 8px 0;
              break-inside: avoid;
            }

            .receipt-item p {
              margin: 2px 0;
            }

            .receipt-footer {
              margin-top: 12px;
            }
          </style>
        </head>

        <body>
          ${receiptClone.outerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()

    const logo = printWindow.document.querySelector(
      '.receipt-logo',
    ) as HTMLImageElement | null

    let printed = false

    const imprimir = () => {
      if (printed || printWindow.closed) return

      printed = true
      printWindow.focus()
      printWindow.print()
    }

    if (logo && !logo.complete) {
      logo.addEventListener('load', imprimir, { once: true })
      logo.addEventListener('error', imprimir, { once: true })
    } else {
      imprimir()
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Histórico de vendas</h1>
          <p>Consulte todas as vendas registradas no PDV.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total de vendas</span>
          <strong>{sales.length}</strong>
        </div>

        <div className="stat-card">
          <span>Valor vendido</span>
          <strong>{formatCurrency(totalSales)}</strong>
        </div>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Vendas registradas</h3>
            <p>{sales.length} venda(s) encontrada(s).</p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma venda registrada</strong>
            <p>As vendas finalizadas no PDV aparecerão aqui.</p>
          </div>
        ) : (
          <div className="history-list">
            {[...sales].reverse().map((sale) => (
              <div
                className="panel"
                key={sale.id}
                style={{
                  cursor: 'pointer',
                  border:
                    selectedSale?.id === sale.id
                      ? '2px solid #6366f1'
                      : undefined,
                }}
                onClick={() => setSelectedSale(sale)}
              >
                <div className="panel-heading">
                  <div>
                    <h3>Venda #{sale.id.slice(0, 8)}</h3>
                    <p>{formatDate(sale.date)}</p>
                  </div>

                  <strong>{formatCurrency(sale.total)}</strong>
                </div>

                <p>
                  {sale.items.length} produto(s) · {sale.paymentMethod}
                </p>

                <small>
                  Clique para consultar os detalhes da venda.
                </small>
              </div>
            ))}
          </div>
        )}

        {selectedSale && (
          <section
            className="panel"
            style={{ marginTop: '24px' }}
          >
            <div className="panel-heading">
              <div>
                <h3>
                  Detalhes da venda #{selectedSale.id.slice(0, 8)}
                </h3>
                <p>{formatDate(selectedSale.date)}</p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={printReceipt}
                >
                  Imprimir comprovante
                </button>

                <button
                  type="button"
                  className="text-button"
                  onClick={() => setSelectedSale(null)}
                >
                  Fechar ×
                </button>
              </div>
            </div>

            {/* COMPROVANTE NÃO FISCAL */}

            <div className="print-container">
              <div className="receipt">
                <header className="receipt-header">
                  <img
                    src="/logo-bazuh.jpg"
                    alt="BAZUH"
                    className="receipt-logo"
                  />
                  <br />
                  <p>Tecnologia e variedades</p>
                  <p>CNPJ: 69.670.533/0001-87</p>
                  <p>Whats: (91) 9198504-7027</p>
                  <p>Documento não fiscal</p>
                </header>

                <hr />

                <p>
                  <strong>Venda:</strong> #{selectedSale.id}
                </p>

                <p>
                  <strong>Data:</strong> {formatDate(selectedSale.date)}
                </p>

                <hr />

                <h3>PRODUTOS</h3>

                {selectedSale.items.map((item, index) => (
                  <div
                    key={`${item.product.id}-${index}`}
                    className="receipt-item"
                  >
                    <strong>{item.product.name}</strong>

                    <p>
                      {item.quantity} x{' '}
                      {formatCurrency(item.product.salePrice)}
                    </p>

                    <p>
                      Subtotal:{' '}
                      {formatCurrency(
                        item.quantity * item.product.salePrice,
                      )}
                    </p>
                  </div>
                ))}

                <hr />

                <h2>
                  TOTAL: {formatCurrency(selectedSale.total)}
                </h2>

                <p>
                  <strong>Pagamento:</strong>{' '}
                  {selectedSale.paymentMethod}
                </p>

                {selectedSale.paymentMethod === 'Dinheiro' && (
                  <>
                    <p>
                      Recebido:{' '}
                      {formatCurrency(selectedSale.amountReceived)}
                    </p>

                    <p>
                      Troco: {formatCurrency(selectedSale.change)}
                    </p>
                  </>
                )}

                <hr />

                <footer className="receipt-footer">
                  <p>Obrigado pela preferência!</p>
                  <p>Siga-nos: @bazuhtech</p>
                  <p>Para trocas, apresente este comprovante</p>
                  <strong>
                    BAZUH — Tecnologia e variedades
                  </strong>
                </footer>
              </div>
            </div>

            <h3>Produtos vendidos</h3>

            {selectedSale.items.map((item, index) => (
              <div
                key={`${selectedSale.id}-${index}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '12px 0',
                  borderBottom: '1px solid #e5e7eb',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong>{item.product.name}</strong>

                  <p>Código: {item.product.code}</p>

                  <p>
                    {item.quantity} ×{' '}
                    {formatCurrency(item.product.salePrice)}
                  </p>
                </div>

                <strong>
                  {formatCurrency(
                    item.quantity * item.product.salePrice,
                  )}
                </strong>
              </div>
            ))}

            <div style={{ marginTop: '20px' }}>
              <p>
                Forma de pagamento:{' '}
                <strong>{selectedSale.paymentMethod}</strong>
              </p>

              {selectedSale.paymentMethod === 'Dinheiro' && (
                <>
                  <p>
                    Valor recebido:{' '}
                    <strong>
                      {formatCurrency(selectedSale.amountReceived)}
                    </strong>
                  </p>

                  <p>
                    Troco:{' '}
                    <strong>
                      {formatCurrency(selectedSale.change)}
                    </strong>
                  </p>
                </>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb',
                }}
              >
                <strong>Total da venda</strong>

                <strong style={{ fontSize: '1.3rem' }}>
                  {formatCurrency(selectedSale.total)}
                </strong>
              </div>
            </div>
          </section>
        )}
      </section>
    </div>
  )
}

export default History
