import Link from 'next/link';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { EmptyState } from '@/components/ui/EmptyState';
import { listNotifications } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export default function InboxPage() {
  const notifications = listNotifications();
  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <main className="bg-bg min-h-screen">
      <PhoneShell
        activeTab="/wallet"
        header={
          <>
            <Link href="/wallet" className="underline underline-offset-2">← Home</Link>
            <strong>Inbox</strong>
            <span />
          </>
        }
      >
        {notifications.length === 0 ? (
          <EmptyState title="No messages" hint="Notifications from the state appear here." />
        ) : (
          <>
            <section>
              <h3 className="font-semibold text-lg mb-2">Unread</h3>
              {unread.length === 0 ? (
                <p className="text-sm text-ink-muted">Nothing unread.</p>
              ) : (
                <div className="space-y-2">
                  {unread.map(n => (
                    <Card tight key={n.id}>
                      <div className="flex justify-between items-baseline gap-2">
                        <strong>{n.from}</strong>
                        {n.aiClass ? <Pill>AI: Class {n.aiClass}</Pill> : null}
                      </div>
                      <div className="font-medium">{n.subject}</div>
                      <p className="text-sm mt-1">{n.body}</p>
                      <div className="text-xs text-ink-muted mt-2">
                        {new Date(n.at).toLocaleString()} · via {n.channel}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {read.length > 0 ? (
              <section>
                <h3 className="font-semibold text-lg mb-2">Read</h3>
                <div className="space-y-2">
                  {read.map(n => (
                    <Card tight key={n.id} className="opacity-80">
                      <div className="flex justify-between items-baseline gap-2">
                        <strong>{n.from}</strong>
                        {n.aiClass ? <Pill>AI: Class {n.aiClass}</Pill> : null}
                      </div>
                      <div className="font-medium">{n.subject}</div>
                      <p className="text-sm mt-1">{n.body}</p>
                      <div className="text-xs text-ink-muted mt-2">
                        {new Date(n.at).toLocaleString()} · via {n.channel}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </PhoneShell>
    </main>
  );
}
