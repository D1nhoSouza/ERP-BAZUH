
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Product, ProductFormData } from '../types/product'
import { formatCurrency } from '../utils/format'

const STORAGE_KEY = 'bazuh-pdv-products'

const emptyForm: ProductFormData = {
  code: '',
  name: '',
  category: 'Fontes',
  description: '',
  costPrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: 1,
}

const categories = [
  'Fontes',
  'Carregadores',
  'Cabos',
  'Mouses',
  'Teclados',
  'Suportes e bases',
  'Cases para HD',
  'Fones e headsets',
  'Webcams',
  'Power banks',
  'Adaptadores',
  'Outros',
]

function loadProducts(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed as Product[] : []
  } catch {
    return []
  }
}

function createProductCode(products: Product[]): string {
  let highest = 0

  for (const product of products) {
    const match = product.code.match(/^BAZ(\d+)$/i)
    if (match) {
      highest = Math.max(highest, Number(match[1]))
    }
  }

  return `BAZ${String(highest + 1).padStart(3, '0')}`
}

function Products() {
  const [products, setProducts] = useState<Product[]>(loadProducts)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  }, [products])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)

      const matchesCategory =
        categoryFilter === 'Todas' ||
        product.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [products, search, categoryFilter])

  const totalStock = products.reduce(
    (total, product) => total + product.stock,
    0,
  )

  const inventoryCost = products.reduce(
    (total, product) => total + product.costPrice * product.stock,
    0,
  )

  const lowStockCount = products.filter(
    (product) => product.stock <= product.minStock,
  ).length

  function updateField<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  function openNewForm() {
    setEditingId(null)
    setForm({
      ...emptyForm,
      code: createProductCode(products),
    })
    setFeedback('')
    setFormOpen(true)
  }

  function openEditForm(product: Product) {
    setEditingId(product.id)

    setForm({
      code: product.code,
      name: product.name,
      category: product.category,
      description: product.description,
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      stock: product.stock,
      minStock: product.minStock,
    })

    setFeedback('')
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedCode = form.code.trim().toUpperCase()

    if (!form.name.trim()) {
      setFeedback('Informe o nome do produto.')
      return
    }

    if (!normalizedCode) {
      setFeedback('Informe o código do produto.')
      return
    }

    const duplicateCode = products.some(
      (product) =>
        product.code.toLowerCase() === normalizedCode.toLowerCase() &&
        product.id !== editingId,
    )

    if (duplicateCode) {
      setFeedback('Já existe um produto com esse código.')
      return
    }

    if (form.costPrice < 0 || form.salePrice < 0) {
      setFeedback('Os preços não podem ser negativos.')
      return
    }

    if (
      !Number.isFinite(form.costPrice) ||
      !Number.isFinite(form.salePrice) ||
      !Number.isFinite(form.stock) ||
      !Number.isFinite(form.minStock) ||
      form.stock < 0 ||
      form.minStock < 0 ||
      !Number.isInteger(form.stock) ||
      !Number.isInteger(form.minStock)
    ) {
      setFeedback('Confira os valores e as quantidades informados.')
      return
    }

    const now = new Date().toISOString()

    if (editingId) {
      setProducts((previous) =>
        previous.map((product) =>
          product.id === editingId
            ? {
                ...product,
                ...form,
                code: normalizedCode,
                name: form.name.trim(),
                description: form.description.trim(),
              }
            : product,
        ),
      )
      setFeedback('Produto atualizado com sucesso.')
    } else {
      const newProduct: Product = {
        ...form,
        id: crypto.randomUUID(),
        code: normalizedCode,
        name: form.name.trim(),
        description: form.description.trim(),
        createdAt: now,
      }

      setProducts((previous) => [...previous, newProduct])
      setFeedback('Produto cadastrado com sucesso.')
    }

    setFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Deseja excluir o produto "${product.name}"?`,
    )

    if (!confirmed) return

    setProducts((previous) =>
      previous.filter((item) => item.id !== product.id),
    )
    setFeedback('Produto excluído.')
  }

  return (
    <div className="products-page">
      <div className="products-heading">
        <div>
          <h3>Cadastro de produtos</h3>
          <p>Gerencie seu catálogo, preços e estoque.</p>
        </div>

        <button className="primary-button" onClick={openNewForm}>
          + Novo produto
        </button>
      </div>

      <div className="product-stats">
        <article className="product-stat">
          <span>Produtos cadastrados</span>
          <strong>{products.length}</strong>
        </article>

        <article className="product-stat">
          <span>Unidades em estoque</span>
          <strong>{totalStock}</strong>
        </article>

        <article className="product-stat">
          <span>Custo do estoque</span>
          <strong>{formatCurrency(inventoryCost)}</strong>
        </article>

        <article className="product-stat">
          <span>Itens com estoque baixo</span>
          <strong>{lowStockCount}</strong>
        </article>
      </div>

      {feedback && (
        <div className="product-feedback" role="status">
          {feedback}
          <button
            type="button"
            onClick={() => setFeedback('')}
            aria-label="Fechar mensagem"
          >
            ×
          </button>
        </div>
      )}

      {formOpen && (
        <section className="panel product-form-panel">
          <div className="panel-heading">
            <div>
              <h3>
                {editingId ? 'Editar produto' : 'Novo produto'}
              </h3>
              <p>Preencha os dados do produto abaixo.</p>
            </div>

            <button
              type="button"
              className="close-button"
              onClick={closeForm}
              aria-label="Fechar formulário"
            >
              ×
            </button>
          </div>

          <form className="product-form" onSubmit={handleSubmit}>
            <label>
              Nome do produto *
              <input
                required
                value={form.name}
                onChange={(event) =>
                  updateField('name', event.target.value)
                }
                placeholder="Ex.: Fonte para notebook Dell"
              />
            </label>

            <label>
              Código *
              <input
                required
                value={form.code}
                onChange={(event) =>
                  updateField('code', event.target.value)
                }
                placeholder="Ex.: BAZ001"
              />
            </label>

            <label>
              Categoria
              <select
                value={form.category}
                onChange={(event) =>
                  updateField('category', event.target.value)
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Descrição
              <input
                value={form.description}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
                placeholder="Marca, modelo ou detalhes"
              />
            </label>

            <label>
              Valor de compra (R$) *
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(event) =>
                  updateField('costPrice', Number(event.target.value))
                }
              />
            </label>

            <label>
              Valor de venda (R$) *
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.salePrice}
                onChange={(event) =>
                  updateField('salePrice', Number(event.target.value))
                }
              />
            </label>

            <label>
              Quantidade em estoque *
              <input
                type="number"
                required
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) =>
                  updateField('stock', Number(event.target.value))
                }
              />
            </label>

            <label>
              Estoque mínimo *
              <input
                type="number"
                required
                min="0"
                step="1"
                value={form.minStock}
                onChange={(event) =>
                  updateField('minStock', Number(event.target.value))
                }
              />
            </label>

            <div className="profit-preview">
              <span>Lucro bruto estimado por unidade</span>
              <strong
                className={
                  form.salePrice - form.costPrice < 0
                    ? 'negative-value'
                    : ''
                }
              >
                {formatCurrency(form.salePrice - form.costPrice)}
              </strong>
            </div>

            {feedback && (
              <p className="form-error" role="alert">
                {feedback}
              </p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
              >
                Cancelar
              </button>

              <button type="submit" className="primary-button">
                {editingId ? 'Salvar alterações' : 'Cadastrar produto'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel product-list-panel">
        <div className="panel-heading product-list-heading">
          <div>
            <h3>Lista de produtos</h3>
            <p>
              {filteredProducts.length} produto(s) encontrado(s)
            </p>
          </div>
        </div>

        <div className="product-filters">
          <input
            aria-label="Pesquisar produtos"
            placeholder="Pesquisar por nome, código ou categoria..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label="Filtrar categoria"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="Todas">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Código</th>
                <th>Compra</th>
                <th>Venda</th>
                <th>Lucro/un.</th>
                <th>Estoque</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    <span className="table-subtitle">
                      {product.category}
                    </span>
                  </td>
                  <td>{product.code}</td>
                  <td>{formatCurrency(product.costPrice)}</td>
                  <td>{formatCurrency(product.salePrice)}</td>
                  <td>
                    <span
                      className={
                        product.salePrice - product.costPrice < 0
                          ? 'negative-value'
                          : 'positive-value'
                      }
                    >
                      {formatCurrency(
                        product.salePrice - product.costPrice,
                      )}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`stock-badge ${
                        product.stock <= product.minStock
                          ? 'stock-low'
                          : 'stock-ok'
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => openEditForm(product)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => deleteProduct(product)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="product-empty">
              <div className="empty-icon">□</div>
              <strong>Nenhum produto encontrado</strong>
              <p>
                Cadastre um produto ou altere os filtros da pesquisa.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Products
