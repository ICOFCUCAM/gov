import { CharterRegistry } from './CharterRegistry';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ministry Charter Registry' };

// Sovereign Charter Registry — the discovery surface for every
// ministry's institutional depth. Pairs with the maturity test that
// keeps these declarations honest.
export default function CharterRegistryPage() {
  return <CharterRegistry />;
}
