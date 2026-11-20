import { redirect } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { getCurrentUser } from '@/lib/session';
import { AuthForm } from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (!isDatabaseConfigured()) {
    redirect('/');
  }

  const user = await getCurrentUser();
  if (user) {
    redirect('/');
  }

  return <AuthForm initialMode="register" />;
}
