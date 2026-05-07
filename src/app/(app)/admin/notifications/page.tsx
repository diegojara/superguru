// src/app/(app)/admin/notifications/page.tsx
import { createClient } from '@/lib/supabase/server'
import NotificationsClient from './NotificationsClient'

export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const { data: notifications } = await supabase
    .from('admin_notifications')
    .select('*, pools(name), users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50) as any

  return <NotificationsClient notifications={(notifications as any[]) ?? []} />
}
