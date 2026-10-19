import { CharterProfile } from '@/components/features/CharterProfile';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Charter profile' };

export default async function CharterProfilePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <CharterProfile charterId={decodeURIComponent(params.id)} />;
}
