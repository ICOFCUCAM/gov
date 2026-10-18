import { NextRequest, NextResponse } from 'next/server';
import { removeDepartment } from '@/lib/data/store';
import { refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';
export async function DELETE(_r: NextRequest, { params }: { params: { id: string; deptId: string } }) {
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const r = removeDepartment(params.id, params.deptId);
  if ('error' in r) return NextResponse.json(r, { status: 404 });
  return NextResponse.json({ ministry: r });
}
