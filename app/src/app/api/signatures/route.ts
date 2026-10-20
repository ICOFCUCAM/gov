import { NextRequest, NextResponse } from 'next/server';
import { signDocument } from '@/lib/data/store';
import type { SignatureRequest } from '@/lib/api/types';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: Partial<SignatureRequest>;
  try {
    // A signed-in official signs as themselves, whatever name the request carries.
    body = (await withOfficial({ ...((await req.json()) as Partial<SignatureRequest>), by: '' })) as Partial<SignatureRequest> & { by?: string };
    if ((body as { by?: string }).by) body.signerName = (body as { by?: string }).by;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.documentId || !body.documentTitle || !body.signerName) {
    return NextResponse.json(
      { error: 'documentId, documentTitle, signerName are required' },
      { status: 422 },
    );
  }
  const result = await signDocument({
    documentId: body.documentId,
    documentTitle: body.documentTitle,
    signerName: body.signerName,
  });
  return NextResponse.json({ result }, { status: 201 });
}
