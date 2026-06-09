import Link from 'next/link';

type Props = {
  active: 'vault' | 'settings';
};

export default function DashboardTabBar({ active }: Props) {
  return (
    <nav className="dashboard-tab-bar" aria-label="Dashboard sections">
      {active === 'vault' ? (
        <span className="dashboard-tab dashboard-tab--active" aria-current="page">
          Vault
        </span>
      ) : (
        <Link href="/dashboard" className="dashboard-tab dashboard-tab--link">
          Vault
        </Link>
      )}
      {active === 'settings' ? (
        <span className="dashboard-tab dashboard-tab--active" aria-current="page">
          Profile settings
        </span>
      ) : (
        <Link href="/settings" className="dashboard-tab dashboard-tab--link">
          Profile settings
        </Link>
      )}
    </nav>
  );
}
