import type { Metadata } from 'next';
import CasinoSetupClient from '@/components/CasinoSetupClient';

export const metadata: Metadata = {
  title: 'Auto-lock wins on nuts.gg — 2 min setup',
  description:
    'Free auto-vault for nuts.gg. Skim heater wins to vault before you rinse. Plain steps for Firefox or Edge on Android.',
};

export default function NutsSetupPage() {
  return <CasinoSetupClient siteId="nuts" />;
}
