// sql.js built with its WebAssembly inlined (lib/geo/boundary-files.ts reads GeoPackages with it).
declare module 'sql.js/dist/sql-wasm-inline.js' {
  const initSqlJs: (config?: Record<string, unknown>) => Promise<unknown>;
  export default initSqlJs;
}
