// src/app/(app)/pools/new/page.tsx
import type { Metadata } from 'next'
import NewPoolForm from './NewPoolForm'

export const metadata: Metadata = {
  title: 'Crear Polla — SuperGurú',
}

export default function NewPoolPage() {
  return <NewPoolForm />
}
