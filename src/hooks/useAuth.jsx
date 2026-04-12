import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, is_admin, parent_user_id, role, can_see_profit, is_active')
      .eq('id', userId)
      .single()
    setProfile(data || null)
    return data
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email, password) => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) return result

    // Check if driver account is deactivated
    if (result.data?.user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_active, role')
        .eq('id', result.data.user.id)
        .single()
      if (prof && prof.is_active === false) {
        await supabase.auth.signOut()
        return { data: null, error: { message: 'Your account has been deactivated. Contact your distributor.' } }
      }
    }
    return result
  }

  // signUp now accepts displayName and optional driverCode info
  const signUp = async (email, password, displayName, driverInfo = null) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user && displayName) {
      const baseUsername = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20)
      const username = baseUsername || `user${Date.now().toString().slice(-6)}`

      const profileData = {
        id: data.user.id,
        username,
        display_name: displayName,
      }

      // If registering as a driver
      if (driverInfo) {
        profileData.parent_user_id = driverInfo.owner_user_id
        profileData.role = 'driver'
        profileData.can_see_profit = false
        profileData.is_active = true
      } else {
        profileData.role = 'owner'
      }

      await supabase.from('profiles').upsert(profileData)
      await fetchProfile(data.user.id)
    }
    return { data, error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const updateProfile = async (updates) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) throw error
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, is_admin, parent_user_id, role, can_see_profit, is_active')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
    return data
  }

  // The "effective" user ID for data that should be shared (products, customers, stock)
  // Drivers use their parent's ID; owners use their own
  const effectiveUserId = useMemo(() => {
    if (!profile) return user?.id || null
    return profile.parent_user_id || profile.id
  }, [profile, user])

  const isDriver = profile?.role === 'driver'
  const isOwner = !isDriver // owner or legacy accounts
  const canSeeProfit = isOwner || profile?.can_see_profit === true

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signOut, updateProfile, fetchProfile,
      effectiveUserId, isDriver, isOwner, canSeeProfit,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
