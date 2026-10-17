import { PublisherConsole } from '@/components/features/updates/PublisherConsole';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Release Publisher' };

// Publisher console for the Sovereign Update Center: the platform team
// publishes global releases and nation builds and runs the request pipeline.
// Not public: behind the session gate, and a platform-tier session under
// CIVICOS_AUTH=enforce (see lib/updates/access.ts).
export default function ReleasePublisherPage() {
  return <PublisherConsole />;
}
