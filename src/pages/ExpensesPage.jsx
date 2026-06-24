import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { localToday } from '../lib/dateUtils'

const CATEGORIES = [
  { id: 'gas',         label: '⛽ Gas',         color: '#dc2626', bg: '#fef2f2' },
  { id: 'maintenance', label: '🔧 Maintenance', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'supplies',    label: '📦 Supplies',    color: '#0891b2', bg: '#ecfeff' },
  { id: 'meals',       label: '🍔 Meals',       color: '#ea580c', bg: '#fff7ed' },
  { id: 'other',       label: '📋 Other',       color: '#64748b', bg: '#f8fafc' },
]

export default function ExpensesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category: 'gas', amount: '', expense_date: localToday(), note: '' })
  const [saving, setSaving] = useState(false)
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('expenses')
      .select('*').eq('user_id', user.id)
      .order('expense_date', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const save = async () => {
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { alert('Enter an amount'); return }
    if (!form.expense_date) { alert('Pick a date'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('expenses').insert([{
        user_id: user.id,
        category: form.category,
        amount: amt,
        expense_date: form.expense_date,
        note: form.note?.trim() || null,
      }])
      if (error) throw error
      setForm({ category: 'gas', amount: '', expense_date: localToday(), note: '' })
      setShowAdd(false)
      await load()
    } catch (e) { alert('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(p => p.filter(e => e.id !== id))
  }

  const monthExpenses = expenses.filter(e => e.expense_date?.startsWith(filterMonth))
  const monthTotal = monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const byCategory = {}
  monthExpenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0) })

  const monthSet = new Set()
  expenses.forEach(e => { if (e.expense_date) monthSet.add(e.expense_date.substring(0, 7)) })
  const today = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const monthOptions = [...monthSet].sort().reverse()

  const monthLabel = (ym) => {
    const [y, m] = ym.split('-')
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ flex: 1, marginLeft: 8 }}>Expenses</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
      </div>

      <div className="page" style={{ paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', fontSize: 14, fontWeight: 600 }}>
            {monthOptions.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>

        <div className="card" style={{ marginBottom: 14, padding: 16, background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: 'white' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 }}>
            {monthLabel(filterMonth)} · Total
          </p>
          <p style={{ fontSize: 36, fontWeight: 900, color: '#fbbf24' }}>${monthTotal.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{monthExpenses.length} entries</p>
        </div>

        {Object.keys(byCategory).length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 14 }}>
            {CATEGORIES.filter(c => byCategory[c.id]).map(c => (
              <div key={c.id} className="card" style={{ padding: '10px 12px', background: c.bg, borderColor: c.color + '44' }}>
                <p style={{ fontSize: 11, color: c.color, fontWeight: 700, marginBottom: 2 }}>{c.label}</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: c.color }}>${byCategory[c.id].toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>}

        {!loading && monthExpenses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>—</p>
            <p className="text-sm text-muted">No expenses this month yet.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>+ Add First Expense</button>
          </div>
        )}

        {!loading && monthExpenses.map(e => {
          const cat = CATEGORIES.find(c => c.id === e.category) || CATEGORIES[CATEGORIES.length - 1]
          return (
            <div key={e.id} className="card" style={{ marginBottom: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, background: cat.bg,
                color: cat.color, display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0,
              }}>{cat.label.split(' ')[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15 }}>${Number(e.amount).toFixed(2)}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {cat.label.split(' ').slice(1).join(' ')} · {new Date(e.expense_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                {e.note && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>"{e.note}"</p>}
              </div>
              <button onClick={() => remove(e.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, padding: 8 }}>🗑️</button>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom: 14 }}>+ Add Expense</h2>

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 14 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))}
                  style={{
                    padding: '8px 14px', borderRadius: 20, border: '1.5px solid',
                    borderColor: form.category === c.id ? c.color : 'var(--border)',
                    background: form.category === c.id ? c.bg : 'white',
                    color: form.category === c.id ? c.color : 'var(--text)',
                    fontSize: 13, fontWeight: form.category === c.id ? 800 : 600,
                    cursor: 'pointer',
                  }}>{c.label}</button>
              ))}
            </div>

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount ($) *</label>
            <input type="number" min="0" step="0.01" value={form.amount} autoFocus
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="50.00"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 18, fontWeight: 700, marginTop: 6, marginBottom: 14 }} />

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date *</label>
            <input type="date" value={form.expense_date} max={localToday()}
              onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 15, marginTop: 6, marginBottom: 14 }} />

            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Note (optional)</label>
            <input type="text" value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Filled up at Shell, Esplanade trip..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, marginTop: 6, marginBottom: 18 }} />

            <button onClick={save} disabled={saving || !form.amount} className="btn btn-success btn-full">
              {saving ? 'Saving...' : `💾 Save $${parseFloat(form.amount || 0).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
