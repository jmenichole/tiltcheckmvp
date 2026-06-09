import { redirect } from 'next/navigation';

/** Legacy route — operators hub removed; terms is the primary legal entry. */
export default function LegalPage() {
  redirect('/terms');
}
