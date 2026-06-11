import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ poolId: string }>
}

export default async function PoolPage({ params }: Props) {
  const { poolId } = await params
  redirect(`/pools/${poolId}/predictions`)
}
