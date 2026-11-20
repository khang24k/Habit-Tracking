import { redirect } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { getCurrentUser } from '@/lib/session';
import { DashboardApp } from '@/components/DashboardApp';
import { SetupGuide } from '@/components/SetupGuide';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (!isDatabaseConfigured()) {
    return <SetupGuide />;
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return <DashboardApp initialUser={user} />;
}
