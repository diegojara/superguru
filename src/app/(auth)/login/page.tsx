// src/app/(auth)/login/page.tsx
import type { Metadata } from 'next'
import LoginForm from './LoginForm'
export const metadata: Metadata = { title: 'Iniciar sesión — SuperGurú' }
export default function LoginPage() { return <LoginForm /> }
