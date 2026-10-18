// The platform's API as an OpenAPI 3.1 document, generated from the route
// files (npm run build:openapi; a test fails when it falls out of date), so
// other systems and the nation's own developers can build against it.

import { NextResponse } from 'next/server';
import doc from '@/lib/api/openapi.json';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(doc, { headers: { 'cache-control': 'public, max-age=300' } });
}
