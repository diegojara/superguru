import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PoolSettingsClient from './PoolSettingsClient'

interface Props { params: Promise<{ poolId: string }> }

export default async function PoolSettingsPage({ params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.from('pool_admins').select('id').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle() as any
  const { data: profile } = await supabase.from('users').select('is_superadmin').eq('id', user.id).single() as any
  if (!isAdmin && !profile?.is_superadmin) redirect(`/pools/${poolId}`)

  const { data: pool } = await supabase.from('pools').select('*').eq('id', poolId).single() as any
  if (!pool) redirect('/dashboard')

  const { data: members } = await supabase.from('pool_members').select('id, display_name, joined_at, users(email, full_name)').eq('pool_id', poolId).order('joined_at', { ascending: true }) as any
  const { data: myMember } = await supabase.from('pool_members').select('id, display_name').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle() as any

  return <PoolSettingsClient pool={pool} members={members ?? []} myMember={myMember} userId={user.id} />
}
