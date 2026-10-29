import { supabase } from '../supabaseClient'

// Caja y reportes. Los cálculos se hacen en la base (ver
// supabase/migrations/002_app_completa.sql).

export async function getOpenCashSession() {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('status', 'abierta')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getCashSessions() {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('status', 'cerrada')
    .order('opened_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return data
}

export async function getCashSummary(sessionId) {
  const { data, error } = await supabase.rpc('cash_session_summary', { p_session_id: sessionId })
  if (error) throw error
  return data
}

export async function openCashSession(openingAmount, notes) {
  const { data, error } = await supabase.rpc('open_cash_session', {
    p_opening_amount: openingAmount,
    p_notes: notes || null
  })
  if (error) throw error
  return data
}

export async function closeCashSession(countedAmount, notes) {
  const { data, error } = await supabase.rpc('close_cash_session', {
    p_counted_amount: countedAmount,
    p_notes: notes || null
  })
  if (error) throw error
  return data
}

export async function getReport(from, to) {
  const { data, error } = await supabase.rpc('report_summary', { p_from: from, p_to: to })
  if (error) throw error
  return data
}
