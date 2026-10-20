import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as list, POST as open } from './route';
import { GET as one, POST as step } from './[id]/route';
import { POST as upload } from './[id]/documents/route';
import { GET as download } from './[id]/documents/[doc]/route';
import { POST as procedures } from '../case-packages/route';
import { resetCases } from '@/lib/casework/engine';
import { resetPackages } from '@/lib/casework/packages';
import { samplePackage } from '@/lib/casework/testkit';
import { setSovereign, listMinistries } from '@/lib/data/store';

const post = (body: unknown) => new NextRequest('http://x/', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const get = (url: string) => new NextRequest(url);
const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

describe('/api/cases (without sign-in enforced: declared names)', () => {
  beforeEach(() => {
    resetCases(); resetPackages();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 9).toString('base64'));
    setSovereign({ deployment: { authorities: { businessRegister: listMinistries()[0]!.id } } }, 'test');
  });

  it('drafts and approves a procedure, opens a case, attaches a document, acts four-eyes and reads it back', async () => {
    expect((await procedures(post({ op: 'draft', package: { ...samplePackage(), owner: 'businessRegister' }, by: 'Author' }))).status).toBe(201);
    expect((await procedures(post({ op: 'approve', key: 'test.licence', version: 1, by: 'Author' }))).status).toBe(422);
    expect((await procedures(post({ op: 'approve', key: 'test.licence', version: 1, activeFrom: '2026-01-01', by: 'Approver' }))).status).toBe(200);
    const o = await open(post({ procedure: 'test.licence', fields: { name: 'Ade' }, by: 'Clerk' }));
    expect(o.status).toBe(201);
    const c = (await o.json()).case as { id: string; ref: string };
    const u = await upload(post({ class: 'application-form', title: 'Form', data: Buffer.from('%PDF-1.7\nx\n%%EOF').toString('base64'), by: 'Clerk' }), params({ id: c.id }));
    expect(u.status).toBe(201);
    const doc = (await u.json()).document as { id: string };
    expect((await download(get('http://x/?v=1'), params({ id: c.id, doc: doc.id }))).headers.get('content-type')).toBe('application/pdf');
    expect((await step(post({ op: 'act', action: 'accept', by: 'Clerk' }), params({ id: c.id }))).status).toBe(200);
    expect(await (await step(post({ op: 'act', action: 'grant', reason: 'Meets the conditions', by: 'Signer A' }), params({ id: c.id }))).json()).toMatchObject({ pending: true });
    expect((await step(post({ op: 'act', action: 'grant', by: 'Signer A' }), params({ id: c.id }))).status).toBe(422);
    expect(await (await step(post({ op: 'act', action: 'grant', by: 'Signer B' }), params({ id: c.id }))).json()).toMatchObject({ case: { stage: 'granted' }, decision: { sha256: expect.any(String) } });
    const read = await (await one(get('http://x/'), params({ id: c.ref }))).json();
    expect(read).toMatchObject({ case: { stage: 'granted', fields: { name: 'Ade' } }, decisions: [{ content: { decision: 'grant' } }], documents: [{ class: 'application-form' }] });
    const listed = await (await list(get('http://x/?procedure=test.licence'))).json();
    expect(listed.cases[0]).toMatchObject({ ref: c.ref, fields: {} });
  });
});
