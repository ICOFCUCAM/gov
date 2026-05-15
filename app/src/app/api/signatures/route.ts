import { NextRequest, NextResponse } from 'next/server';
import { signDocument } from '@/lib/data/store';
import type { SignatureRequest } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: Partial<SignatureRequest>;
  try {
    body = (await req.json()) as Partial<SignatureRequest>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.documentId || !body.documentTitle || !body.signerName) {
    return NextResponse.json(
      { error: 'documentId, documentTitle, signerName are required' },
      { status: 422 },
    );
  }
  const result = signDocument({
    documentId: body.documentId,
    documentTitle: body.documentTitle,
    signerName: body.signerName,
  });
  return NextResponse.json({ result }, { status: 201 });
}
