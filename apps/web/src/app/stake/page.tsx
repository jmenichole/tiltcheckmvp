import type { Metadata } from 'next';
import CasinoSetupClient from '@/components/CasinoSetupClient';

export const metadata: Metadata = {
  title: 'Auto-lock wins on Stake.us — 2 min setup',
  description:
    'Free auto-vault for Stake.us. Skim heater wins to vault (SC/GC) before you rinse. Plain steps for Firefox or Edge on Android.',
};

export default function StakeSetupPage() {
  return <CasinoSetupClient siteId="stake" />;
}
