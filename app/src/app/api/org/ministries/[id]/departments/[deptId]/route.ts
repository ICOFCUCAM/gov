import { NextRequest, NextResponse } from 'next/server';
import { removeDepartment } from '@/lib/data/store';
export const dynamic = 'force-dynamic';
export async function DELETE(_r: NextRequest, { params }: { params: { id: string; deptId: string } }) {
  const r = removeDepartment(params.id, params.deptId);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ ministry: r });
}
