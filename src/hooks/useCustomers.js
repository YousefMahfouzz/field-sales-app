import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useCustomers() {
  const { user, effectiveUserId } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCustomers = useCallback(async () => {
    if (!user || !effectiveUserId) return
    setLoading(true)
    // Fetch customers belonging to the effective (owner) user ID
    // Drivers see their parent's customers; owners see their own
    const { data, error } = await supabase
      .from('customers')
      .select('id,full_name,business_name,phone,address,lat,lng,area,status,next_visit_date,last_visit_date,visit_frequency_days,sale_amount,cost,notes,bought_before,wants_next,decision_maker,best_time,decision_maker_schedule,tags,rating,payment_status,created_at,updated_at')
      .eq('user_id', effectiveUserId)
      .is('deleted_at', null)
      .order('next_visit_date', { ascending: true, nullsFirst: false })
    if (!error) setCustomers(data || [])
    setLoading(false)
  }, [user, effectiveUserId])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const addCustomer = async (customerData) => {
    // New customers are always created under the effective (owner) user_id
    // so the owner and all other drivers can see them
    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...customerData, user_id: effectiveUserId }])
      .select().single()
    if (error) throw error
    setCustomers(prev => [...prev, data])
    return data
  }

  const updateCustomer = async (id, updates) => {
    const { error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    const { data } = await supabase.from('customers').select('*').eq('id', id).single()
    if (data) setCustomers(prev => prev.map(c => c.id === id ? data : c))
    return data
  }

  // Soft delete
  const deleteCustomer = async (id) => {
    await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  const restoreCustomer = async (id) => {
    await supabase.from('customers').update({ deleted_at: null }).eq('id', id)
    const { data } = await supabase.from('customers').select('*').eq('id', id).single()
    if (data) setCustomers(prev => [...prev.filter(c => c.id !== id), data])
  }

  const fetchDeleted = async () => {
    if (!user || !effectiveUserId) return []
    const { data } = await supabase.from('customers').select('*').eq('user_id', effectiveUserId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(50)
    return data || []
  }

  return { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, restoreCustomer, fetchDeleted }
}
