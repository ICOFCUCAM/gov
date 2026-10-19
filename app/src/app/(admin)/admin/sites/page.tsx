import { SiteEditor } from '@/components/features/sites/SiteEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Public Site Editor' };

// Editor for the public institution websites: officials propose changes to a
// site's content and design, a second official publishes them, every version
// is kept and can be restored. Not public: behind the session gate.
// See lib/data/site-editorial.ts and docs/PUBLIC_WEBSITES_PLAN.md (phase 4).
export default function PublicSiteEditorPage() {
  return <SiteEditor />;
}
