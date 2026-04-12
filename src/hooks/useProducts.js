import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProducts() {
  const { user, effectiveUserId, isDriver } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    if (!user || !effectiveUserId) return
    setLoading(true)
    // Both owners and drivers fetch products belonging to the effective (owner) user ID
    // RLS policies allow drivers to read parent's products
    const { data } = await supabase
      .from('products')
      .select('id,name,brand,source,description,image_url,images,cost,avg_cost,sell_price,price_min,price_max,margin_percent,stock_qty,unit,is_active,category,created_at,updated_at,user_id')
      .eq('user_id', effectiveUserId)
      .order('category')
      .order('name')
    setProducts(data || [])
    setLoading(false)
  }, [user, effectiveUserId])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const addProduct = async (productData) => {
    if (isDriver) throw new Error('Drivers cannot add products')
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
    // Drivers CAN update stock_qty (for deductions during sales) but not other fields
    // RLS allows update if user_id = self OR user_id = parent
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    const { data, error: fetchErr } = await supabase
      .from('products')
      .select('id,name,brand,source,description,image_url,images,cost,avg_cost,sell_price,price_min,price_max,margin_percent,stock_qty,unit,is_active,category,created_at,updated_at,user_id')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    if (data) setProducts(prev => prev.map(p => p.id === id ? data : p))
    return data
  }

  const deleteProduct = async (id) => {
    if (isDriver) throw new Error('Drivers cannot delete products')
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  /**
   * Add stock with optional cost tracking.
   * Recalculates weighted average cost automatically.
   */
  const addStock = async (productId, qty, note = '', costPerUnit = null, source = null) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const currentQty = product.stock_qty || 0
    const currentAvg = product.avg_cost ?? product.cost ?? 0

    let newAvgCost = currentAvg
    if (costPerUnit !== null && costPerUnit >= 0) {
      const totalQty = currentQty + qty
      if (totalQty > 0) {
        newAvgCost = ((currentQty * currentAvg) + (qty * costPerUnit)) / totalQty
      }
    }
    newAvgCost = Math.round(newAvgCost * 100) / 100

    const totalCost = costPerUnit !== null ? qty * costPerUnit : null

    // Stock movements are always recorded under the acting user's ID
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

    const updates = {
      stock_qty: currentQty + qty,
      avg_cost: newAvgCost,
      cost: newAvgCost,
    }
    if (source) updates.source = source

    await updateProduct(productId, updates)
    return newAvgCost
  }

  const uploadProductImage = async (productId, file) => {
    // Use effectiveUserId for storage path so all images are under the owner's folder
    const ext = 'webp'
    const ts = Date.now()
    const storageUserId = effectiveUserId || user.id
    const path = `${storageUserId}/${productId}_${ts}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    return publicUrl
  }

  const uploadAdditionalImage = async (productId, file, index) => {
    const ext = file.name ? file.name.split('.').pop() : 'webp'
    const storageUserId = effectiveUserId || user.id
    const path = `${storageUserId}/${productId}_extra_${index}_${Date.now()}.${ext}`
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
    isDriver,
  }
}
