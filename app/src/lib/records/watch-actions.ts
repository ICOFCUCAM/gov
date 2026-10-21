// The audit actions the access watches raise (lib/records/access-watch.ts
// WATCH_ACTIONS), as a pure list the browser can import: the oversight screen
// (/audit) counts them on the audit chain it already reads, so no extra read
// of the access log is made (every such read is itself logged).
// watch-actions.test.ts keeps this list equal to the watch's.

export const WATCH_FINDING_ACTIONS: Readonly<Record<string, string>> = {
  'access.unusual': 'Unusual access to records',
  'register.harvest.suspected': 'Possible harvesting of the public professional check',
};
