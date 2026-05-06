// src/app/(auth)/register/page.tsx
import type { Metadata } from 'next'
import RegisterForm from './RegisterForm'

export const metadata: Metadata = {
  title: 'Crear cuenta — SuperGurú',
}

export default function RegisterPage() {
  return <RegisterForm />
}
