import { createBrowserClient } from '@supabase/ssr'
const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://zhsfmfnmvstvjmycxtqv.supabase.co'
const KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_9DrcsAG65zVMZeLIT33y1Q_pjG78Xwe'
export const createClient=()=>createBrowserClient(URL,KEY)
