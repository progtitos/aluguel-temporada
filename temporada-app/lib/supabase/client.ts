import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://stpivxmptsxabdpsimlb.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cGl2eG1wdHN4YWJkcHNpbWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzE0NTcsImV4cCI6MjEwMjMwNzQ1N30.K28WtxPkpWYvaN3cTV0b2SH_flDFuUxCJw0tnrxMVdM'
  )
}
