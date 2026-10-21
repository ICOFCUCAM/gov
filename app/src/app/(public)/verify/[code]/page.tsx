// Public — what a certificate's code shows (lib/records/certificates.ts):
// kind, issuing authority, date, standing and whether the seal verifies,
// with only what the certificate itself states. No case, no other record.

import { PublicDocument } from '@/apps/_shared/public/PublicDocument';
import { siteMessages } from '@/lib/nation/registry';
import { visitorLocale } from '@/apps/_shared/public/site-props';
import { t as fill } from '@/lib/i18n';
import { checkCode, printableCode, normaliseCode } from '@/lib/records/certificates';
import { VerifyForm } from '../VerifyForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Check a certificate', robots: { index: false } };

export default async function VerifyCodePage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;
  const t = siteMessages(await visitorLocale());
  const c = checkCode(code);
  const standing = c ? (c.status === 'valid' ? t.verifyValid : c.status === 'superseded' ? t.verifySuperseded : t.verifyRevoked) : null;
  return (
    <PublicDocument kicker={t.verifyTitle} title={t.verifyTitle} intro={t.verifyIntro}>
      <VerifyForm label={t.verifyCode} button={t.verifyCheck} value={printableCode(normaliseCode(code).slice(0, 20))} />
      <section aria-labelledby="result" className="mt-6 rounded border border-slate-300 bg-white p-4">
        {c ? (
          <>
            <h2 id="result" className="text-[18px] font-semibold">{c.title}</h2>
            <p className={`mt-1 text-[15px] font-semibold ${c.status === 'valid' && c.sealOk ? 'text-emerald-800' : 'text-red-800'}`}>{standing}</p>
            <p className="mt-1 text-[14px]">{c.sealOk ? t.verifySealOk : t.verifySealBad}</p>
            {c.seal ? (
              // What the register of seal keys says about the seal's key (lib/keys/seal-register.ts); checkable outside at /api/trust/keys.
              <div className="mt-1 text-[14px]">
                {c.seal.state === 'trusted' || c.seal.state === 'after-compromise' ? (
                  <p>{c.seal.validUntil ? fill(t.verifyKeyValid, { key: c.seal.keyId, from: (c.seal.validFrom ?? '').slice(0, 10), until: c.seal.validUntil.slice(0, 10) }) : fill(t.verifyKeyInUse, { key: c.seal.keyId, from: (c.seal.validFrom ?? '').slice(0, 10) })}
                    {c.seal.basis.length ? ` ${fill(t.verifyKeyBasis, { basis: c.seal.basis.join('; ') })}` : ''}{c.seal.sample ? ` ${t.verifyKeySample}` : ''}</p>
                ) : null}
                {c.seal.state === 'before-registration' ? <p>{t.verifyKeyBefore}</p> : null}
                {c.seal.compromisedFrom ? <p className={c.seal.state === 'after-compromise' ? 'font-semibold text-red-800' : ''}>{fill(t.verifyKeyCompromised, { date: c.seal.compromisedFrom.slice(0, 10) })}</p> : null}
                {!['trusted', 'before-registration'].includes(c.seal.state) ? <p className="font-semibold text-red-800">{t.verifyKeyUntrusted}</p> : null}
                {c.seal.fingerprint ? <p className="mt-1 break-all font-mono text-[12px]">SHA-256 {c.seal.fingerprint}</p> : null}
                <p className="mt-1 text-[13px]"><a className="underline" href="/api/trust/keys">{t.verifyTrustList}</a></p>
              </div>
            ) : null}
            <p className="mt-2 text-[14px]">{fill(t.verifyIssuedBy, { name: c.institution })} · {fill(t.verifyIssuedOn, { date: c.issuedAt.slice(0, 10) })}</p>
            {Object.keys(c.publicFacts).length ? (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14px]">
                {Object.entries(c.publicFacts).map(([k, v]) => <div key={k} className="contents"><dt className="font-semibold">{k}</dt><dd>{v}</dd></div>)}
              </dl>
            ) : null}
          </>
        ) : <h2 id="result" className="text-[15px]">{t.verifyNotFound}</h2>}
      </section>
    </PublicDocument>
  );
}
