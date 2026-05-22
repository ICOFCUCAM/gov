import { CharterProfile } from '@/components/features/CharterProfile';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Charter profile' };

export default function CharterProfilePage({ params }: { params: { id: string } }) {
  return <CharterProfile charterId={decodeURIComponent(params.id)} />;
}
