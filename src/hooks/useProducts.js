import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProducts() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id,name,brand,source,description,image_url,images,cost,avg_cost,sell_price,price_min,price_max,margin_percent,stock_qty,unit,is_active,category,created_at,updated_at')
      .eq('user_id', user.id)
      // fetch all including archived — ProductsPage filters by is_active
      .order('category')
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const addProduct = async (productData) => {
    const { data, error } = await supabase
      .from('products')
      .insert([{ ...productData, user_id: user.id, is_active: true }])
      .select().single()
    if (error) throw error
    setProducts(prev => [...prev, data].sort((a, b) =>
      (a.category||'').localeCompare(b.category||'') || a.name.localeCompare(b.name)
    ))
    return data
  }

  const updateProduct = async (id, updates) => {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    // Re-fetch the updated product
    const { data } = await supabase
      .from('products')
      .select('id,name,brand,source,description,image_url,images,cost,avg_cost,sell_price,price_min,price_max,margin_percent,stock_qty,unit,is_active,category,created_at,updated_at')
      .eq('id', id)
      .single()
    if (data) setProducts(prev => prev.map(p => p.id === id ? data : p))
    return data
  }

  const deleteProduct = async (id) => {
    await supabase.from('products').update({ is_active: false }).eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  /**
   * Add stock with optional cost tracking.
   * Recalculates weighted average cost automatically.
   *
   * avgCost = (currentQty * currentAvgCost + newQty * newCostPerUnit) / (currentQty + newQty)
   */
  const addStock = async (productId, qty, note = '', costPerUnit = null, source = null) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const currentQty = product.stock_qty || 0
    const currentAvg = product.avg_cost ?? product.cost ?? 0

    // Weighted average cost
    let newAvgCost = currentAvg
    if (costPerUnit !== null && costPerUnit >= 0) {
      const totalQty = currentQty + qty
      if (totalQty > 0) {
        newAvgCost = ((currentQty * currentAvg) + (qty * costPerUnit)) / totalQty
      }
    }
    newAvgCost = Math.round(newAvgCost * 100) / 100

    const totalCost = costPerUnit !== null ? qty * costPerUnit : null

    // Insert stock movement with cost info
    const { error: mvError } = await supabase.from('stock_movements').insert([{
      user_id: user.id,
      product_id: productId,
      type: 'in',
      qty,
      note,
      cost_per_unit: costPerUnit,
      total_cost: totalCost,
      source,
    }])
    if (mvError) throw mvError

    // Update product: new stock qty + new avg cost
    const updates = {
      stock_qty: currentQty + qty,
      avg_cost: newAvgCost,
      // Also update base cost to avg so profit always reflects reality
      cost: newAvgCost,
    }
    if (source) updates.source = source

    await updateProduct(productId, updates)
    return newAvgCost
  }

  const uploadProductImage = async (productId, file) => {
    const ext = file.name ? file.name.split('.').pop() : 'webp'
    const path = `${user.id}/${productId}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    // Returns URL only — caller does the final updateProduct to avoid race conditions
    return publicUrl
  }

  const uploadAdditionalImage = async (productId, file, index) => {
    const ext = file.name ? file.name.split('.').pop() : 'webp'
    const path = `${user.id}/${productId}_extra_${index}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
  }

  return {
    products, loading, fetchProducts,
    addProduct, updateProduct, deleteProduct,
    addStock,
    uploadProductImage, uploadAdditionalImage,
  }
}
