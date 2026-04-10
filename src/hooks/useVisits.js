import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useVisits() {
  const { user } = useAuth()
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchVisitsForCustomer = useCallback(async (customerId) => {
    setLoading(true)
    const { data } = await supabase
      .from('visits')
      .select('*, sale_items(product_name, qty, unit_price, unit_cost)')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)
    setLoading(false)
    setVisits(data || [])
    return data || []
  }, [])

  const logVisit = async (visitData) => {
    const { data, error } = await supabase
      .from('visits')
      .insert([{ ...visitData, user_id: user.id }])
      .select().single()
    if (error) throw error
    setVisits(prev => [data, ...prev])
    return data
  }

  const deleteVisit = async (id) => {
    await supabase.from('visits').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setVisits(prev => prev.filter(v => v.id !== id))
  }

  const fetchWeekVisits = useCallback(async () => {
    if (!user) return []
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekAgo)
      .is('deleted_at', null)
    return data || []
  }, [user])

  return { visits, loading, fetchVisitsForCustomer, logVisit, deleteVisit, fetchWeekVisits }
}
