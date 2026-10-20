import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addDocument, addVersion, documentBytes, documentsOf, holdDocument, releaseDocument, disposeDocument, resetDocuments, sniffDocument, MAX_DOCUMENT_BYTES } from './documents';

const pdf = (s: string) => new Uint8Array(Buffer.from(`%PDF-1.7\n${s}\n%%EOF`));
const on = { kind: 'case' as const, id: 'CIV-2026-1' };
const base = { class: 'birth-notification', title: 'Notification from the hospital', institution: 'civil', belongsTo: on };

describe('documents', () => {
  beforeEach(() => { resetDocuments(); vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 3).toString('base64')); });
  afterEach(() => vi.unstubAllEnvs());

  it('keeps PDFs and images by their bytes, sealed, and refuses anything else', () => {
    expect(sniffDocument(pdf('x'))).toBe('application/pdf');
    expect(addDocument({ ...base, bytes: new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')) }, 'A')).toHaveProperty('error');
    expect(addDocument({ ...base, bytes: new Uint8Array(MAX_DOCUMENT_BYTES + 1).fill(0x25) }, 'A')).toHaveProperty('error');
    const d = addDocument({ ...base, bytes: pdf('one') }, 'A');
    if ('error' in d) throw new Error(d.error);
    expect(d.versions[0]).toMatchObject({ n: 1, mediaType: 'application/pdf', content: '' });
    const raw = (globalThis as unknown as { __civicosDocuments: { docs: { versions: { content: string }[] }[] } }).__civicosDocuments.docs[0]!.versions[0]!.content;
    expect(raw.startsWith('enc:') || raw.startsWith('v1:') || !raw.includes('PDF')).toBe(true);
    expect((documentBytes(d.id) as { bytes: Buffer }).bytes.toString()).toContain('one');
  });

  it('supersedes with new versions and keeps the earlier ones', () => {
    const d = addDocument({ ...base, bytes: pdf('one') }, 'A') as { id: string };
    addVersion(d.id, pdf('two'), 'B', 'Corrected date');
    expect(documentsOf(on)[0]!.versions.map(v => v.n)).toEqual([1, 2]);
    expect((documentBytes(d.id) as { bytes: Buffer }).bytes.toString()).toContain('two');
    expect((documentBytes(d.id, 1) as { bytes: Buffer }).bytes.toString()).toContain('one');
  });

  it('never disposes of a held document; disposal keeps the record and hashes', () => {
    const d = addDocument({ ...base, bytes: pdf('one') }, 'A') as { id: string };
    holdDocument(d.id, 'Appeal pending', 'B');
    expect(disposeDocument(d.id, 'civil-10y', 'system')).toHaveProperty('error');
    releaseDocument(d.id, 'B');
    expect(disposeDocument(d.id, 'civil-10y', 'system')).toMatchObject({ disposed: { rule: 'civil-10y' } });
    expect(documentBytes(d.id)).toHaveProperty('error');
    expect(documentsOf(on)[0]!.versions[0]!.sha256).toHaveLength(64);
  });

  it('refuses documents in a production installation without the data key', () => {
    vi.stubEnv('CIVICOS_DATA_KEK', '');
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(addDocument({ ...base, bytes: pdf('one') }, 'A')).toMatchObject({ error: expect.stringMatching(/CIVICOS_DATA_KEK/) });
  });
});
