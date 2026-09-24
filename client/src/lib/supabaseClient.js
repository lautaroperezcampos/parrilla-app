import { createClient } from '@supabase/supabase-js'

// Estas dos variables se leen del archivo .env (ver .env.example).
// Nunca hay que escribir la URL o la clave directamente acá:
// así el mismo código funciona en desarrollo local y en Vercel,
// cada uno con sus propias variables de entorno.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisá tu archivo .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
