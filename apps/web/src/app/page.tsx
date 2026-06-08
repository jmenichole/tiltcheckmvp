import { cookies } from 'next/headers';
import LandingAuthedHome from '@/components/LandingAuthedHome';
import LandingMarketingHome from '@/components/LandingMarketingHome';
import { hasSessionCookie } from '@/lib/auth-redirect';

export default async function Home() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get('tc_session')?.value;

  if (hasSessionCookie(sessionValue)) {
    return <LandingAuthedHome />;
  }

  return <LandingMarketingHome />;
}
