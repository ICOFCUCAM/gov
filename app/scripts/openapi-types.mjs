// Typed request and response bodies for the OpenAPI description (architecture
// review I5). Reads the route files with the TypeScript compiler (the type
// checker the build already uses; no other dependency) and turns the types
// the handlers use into JSON Schema:
//
//  - request body: the type the handler gives the parsed JSON body: an `as`
//    type, a declared or inferred variable type, chamberBody<T>(), or the
//    parameter type of the function the body is passed to;
//  - responses: the type of each NextResponse.json(...) argument, grouped by
//    the status it is sent with (2xx bodies as one schema, errors as Error);
//  - named interfaces and type aliases of the app (lib/api/types.ts and the
//    stores) become components/schemas referenced with $ref; every exported
//    interface and alias of lib/api/types.ts is included.
//
// Used by scripts/build-openapi.mjs; slow (it type-checks the routes), so
// openapi.test.ts reuses the stored schemas and re-derives only a few routes.

import ts from 'typescript';
import path from 'node:path';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const MAX_DEPTH = 7;

function program(appDir, files) {
  const cfgPath = path.join(appDir, 'tsconfig.json');
  const cfg = ts.readConfigFile(cfgPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, appDir);
  return ts.createProgram({ rootNames: files, options: { ...parsed.options, noEmit: true, incremental: false, tsBuildInfoFile: undefined } });
}

/** The exported handler functions of a route file, by method. */
function handlers(sf) {
  const out = {};
  for (const st of sf.statements) {
    const exported = ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Export;
    if (!exported) continue;
    if (ts.isFunctionDeclaration(st) && st.name && METHODS.includes(st.name.text)) out[st.name.text] = st;
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && METHODS.includes(d.name.text) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) out[d.name.text] = d.initializer;
    }
  }
  return out;
}

function each(node, fn) { const v = n => { fn(n); ts.forEachChild(n, v); }; ts.forEachChild(node, v); }

const isAny = t => !!(t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown));

export function createSchemaBuilder(checker, appDir) {
  const schemas = {};
  const keyOfDecl = new Map();
  const srcDir = path.join(appDir, 'src') + path.sep;

  /** The declaration a named type comes from, when it is one of the app's own named types. */
  function namedDecl(t) {
    const alias = t.aliasSymbol && !(t.aliasTypeArguments?.length) ? t.aliasSymbol : undefined;
    const targs = t.objectFlags & ts.ObjectFlags.Reference ? checker.getTypeArguments(t).length : 0;
    const sym = alias ?? ((t.objectFlags & (ts.ObjectFlags.Interface | ts.ObjectFlags.Class)) && !targs ? t.symbol : undefined);
    const d = sym?.declarations?.[0];
    if (!d || !d.getSourceFile().fileName.startsWith(srcDir)) return undefined;
    if (!sym.name || sym.name.startsWith('__')) return undefined;
    return { sym, decl: d };
  }

  function keyFor(sym, decl) {
    if (keyOfDecl.has(decl)) return keyOfDecl.get(decl);
    let key = sym.name;
    if (schemas[key] !== undefined) {
      const rel = path.relative(srcDir, decl.getSourceFile().fileName).replace(/\.tsx?$/, '').split(path.sep).filter(s => s !== 'lib' && s !== 'data' && s !== 'app' && s !== 'api');
      key = `${sym.name}_${rel.map(s => s.replace(/[^A-Za-z0-9]/g, '')).join('_')}`;
      let i = 2; while (schemas[key] !== undefined) key = `${sym.name}_${i++}`;
    }
    keyOfDecl.set(decl, key);
    return key;
  }

  function describe(sym) {
    const doc = ts.displayPartsToString(sym.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim();
    return doc ? { description: doc } : {};
  }

  function toSchema(t, depth = 0) {
    if (!t || isAny(t)) return {};
    const f = t.flags;
    if (f & ts.TypeFlags.Never) return { not: {} };
    if (f & ts.TypeFlags.Null) return { type: 'null' };
    if (f & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) return {};
    if (f & ts.TypeFlags.StringLiteral) return { type: 'string', const: t.value };
    if (f & ts.TypeFlags.NumberLiteral) return { type: 'number', const: t.value };
    if (f & ts.TypeFlags.BooleanLiteral) return { type: 'boolean', const: t.intrinsicName === 'true' };
    if (f & ts.TypeFlags.StringLike) return { type: 'string' };
    if (f & ts.TypeFlags.NumberLike || f & ts.TypeFlags.BigIntLike) return { type: 'number' };
    if (f & ts.TypeFlags.BooleanLike) return { type: 'boolean' };
    if (f & ts.TypeFlags.TemplateLiteral) return { type: 'string' };
    if (f & ts.TypeFlags.Union) return union(t, depth);
    const named = namedDecl(t);
    if (named) return ref(named, t);
    return structural(t, depth);
  }

  function ref({ sym, decl }, t) {
    const key = keyFor(sym, decl);
    if (schemas[key] === undefined) {
      schemas[key] = null; // reserve: recursive references resolve to this key
      const body = structural(t, 0, true);
      schemas[key] = { ...describe(sym), ...body };
    }
    return { $ref: `#/components/schemas/${key}` };
  }

  function union(t, depth) {
    const parts = t.types.filter(x => !(x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)));
    if (parts.some(isAny)) return {};
    if (parts.length && parts.every(x => x.flags & ts.TypeFlags.StringLiteral)) return { type: 'string', enum: parts.map(x => x.value).sort() };
    if (parts.length && parts.every(x => x.flags & ts.TypeFlags.NumberLiteral)) return { type: 'number', enum: parts.map(x => x.value).sort((a, b) => a - b) };
    const bools = parts.filter(x => x.flags & ts.TypeFlags.BooleanLiteral);
    const rest = parts.filter(x => !(x.flags & ts.TypeFlags.BooleanLiteral));
    const out = [];
    if (bools.length === 2) out.push({ type: 'boolean' });
    else for (const b of bools) out.push(toSchema(b, depth));
    const lits = rest.filter(x => x.flags & ts.TypeFlags.StringLiteral);
    if (lits.length) out.push({ type: 'string', enum: lits.map(x => x.value).sort() });
    for (const x of rest.filter(x => !(x.flags & ts.TypeFlags.StringLiteral))) out.push(toSchema(x, depth));
    const seen = new Set();
    const uniq = out.filter(s => { const k = JSON.stringify(s); if (seen.has(k)) return false; seen.add(k); return true; });
    if (uniq.some(s => Object.keys(s).length === 0)) return {};
    return uniq.length === 1 ? uniq[0] : { anyOf: uniq.sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)) };
  }

  function structural(t, depth, top = false) {
    if (depth > MAX_DEPTH) return {};
    const name = t.symbol?.name;
    if (name === 'Date') return { type: 'string', format: 'date-time' };
    // A JSON module (e.g. this document itself, or bundled data): its literal type is the data, not a schema.
    if (t.symbol?.declarations?.[0]?.getSourceFile().fileName.endsWith('.json')) return { type: 'object' };
    if (checker.isArrayType(t) || name === 'ReadonlyArray' || name === 'Set' || name === 'ReadonlySet') {
      const [el] = checker.getTypeArguments(t);
      return { type: 'array', items: toSchema(el, depth + 1) };
    }
    if (checker.isTupleType(t)) {
      const els = checker.getTypeArguments(t);
      return { type: 'array', prefixItems: els.map(e => toSchema(e, depth + 1)), minItems: t.target?.minLength ?? els.length, maxItems: els.length };
    }
    if (name === 'Map' || name === 'ReadonlyMap') {
      const [, v] = checker.getTypeArguments(t);
      return { type: 'object', additionalProperties: toSchema(v, depth + 1) };
    }
    if (name === 'Promise') return toSchema(checker.getAwaitedType(t), depth);
    if (t.flags & ts.TypeFlags.NonPrimitive) return { type: 'object' };
    if (t.flags & ts.TypeFlags.Intersection && t.types.some(x => x.flags & ts.TypeFlags.Primitive)) return toSchema(t.types.find(x => x.flags & ts.TypeFlags.Primitive), depth);
    if (t.getCallSignatures().length && !checker.getPropertiesOfType(t).length) return {};
    const props = {};
    const required = [];
    // Mapped types (Record<Union, T>) list their keys in the order the checker met the union: sort them for a stable document.
    const all = checker.getPropertiesOfType(t);
    const ordered = t.objectFlags & ts.ObjectFlags.Mapped ? [...all].sort((a, b) => (a.name < b.name ? -1 : 1)) : all;
    for (const p of ordered) {
      if (p.name.startsWith('__')) continue;
      const pt = checker.getTypeOfSymbol(p);
      if (pt.getCallSignatures().length && !(pt.flags & ts.TypeFlags.Union) && !checker.getPropertiesOfType(pt).filter(x => !x.name.startsWith('__')).length) continue; // methods
      const s = toSchema(pt, depth + 1);
      props[p.name] = { ...s, ...(s.$ref ? {} : describe(p)) };
      const optional = (p.flags & ts.SymbolFlags.Optional) || (pt.flags & ts.TypeFlags.Union && pt.types.some(x => x.flags & ts.TypeFlags.Undefined));
      if (!optional) required.push(p.name);
    }
    const idx = checker.getIndexInfosOfType(t);
    const out = { type: 'object' };
    if (Object.keys(props).length) out.properties = props;
    if (required.length) out.required = required;
    if (idx.length) out.additionalProperties = toSchema(idx[0].type, depth + 1);
    void top;
    return out;
  }

  return { schemas, toSchema };
}

/** Climb from the parsed body (`req.json()`) to the type the handler gives it. */
function bodyType(checker, call, reqName) {
  let n = call;
  for (let i = 0; i < 12 && n.parent; i++) {
    const p = n.parent;
    if (ts.isAwaitExpression(p) || ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p)) { n = p; continue; }
    // req.json().catch(() => ({}))
    if (ts.isPropertyAccessExpression(p) && p.name.text === 'catch' && ts.isCallExpression(p.parent)) { n = p.parent; continue; }
    if (ts.isAsExpression(p) || ts.isSatisfiesExpression?.(p)) {
      const t = checker.getTypeFromTypeNode(p.type);
      if (!isAny(t)) return t;
      n = p; continue;
    }
    if (ts.isCallExpression(p) && p.arguments.includes(n)) {
      const callee = p.expression.getText();
      if (/^(withOfficial|chamberBody)$/.test(callee)) { n = p; continue; }
      const ct = checker.getContextualType(n);
      if (ct && !isAny(ct) && !(ct.flags & ts.TypeFlags.TypeParameter)) return ct;
      return undefined;
    }
    if (ts.isVariableDeclaration(p)) {
      if (p.type) { const t = checker.getTypeFromTypeNode(p.type); return isAny(t) ? undefined : t; }
      if (ts.isIdentifier(p.name)) {
        const t = checker.getTypeAtLocation(p.name);
        if (!isAny(t)) return t;
        // const raw = await req.json(); …withOfficial(raw) as T: follow the variable once.
        const name = p.name.text;
        let found;
        each(p.parent.parent.parent, x => {
          if (found || !ts.isIdentifier(x) || x.text !== name || x === p.name) return;
          const t2 = bodyType(checker, x, reqName);
          if (t2) found = t2;
        });
        return found;
      }
      const t = checker.getTypeAtLocation(p.name);
      return isAny(t) ? undefined : t;
    }
    return undefined;
  }
  return undefined;
}

function statusOf(checker, init) {
  if (!init || !ts.isObjectLiteralExpression(init)) return ['200'];
  const prop = init.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText() === 'status');
  if (!prop) return ['200'];
  if (ts.isNumericLiteral(prop.initializer)) return [prop.initializer.text];
  const t = checker.getTypeAtLocation(prop.initializer);
  const lits = t.flags & ts.TypeFlags.Union ? t.types : [t];
  if (lits.every(x => x.flags & ts.TypeFlags.NumberLiteral)) return lits.map(x => String(x.value));
  return ['default'];
}

/**
 * Typed bodies for the given route files: `{ schemas, ops }` where
 * `ops[file][METHOD] = { request?, responses? }` (schemas, often $refs into
 * `schemas`). `file` is relative to appDir with forward slashes.
 */
export function extractTypes(appDir, routeFiles, { includeApiTypes = true } = {}) {
  const typesFile = path.join(appDir, 'src/lib/api/types.ts');
  const abs = routeFiles.map(f => path.resolve(appDir, f));
  const prog = program(appDir, includeApiTypes ? [...abs, typesFile] : abs);
  const checker = prog.getTypeChecker();
  const { schemas, toSchema } = createSchemaBuilder(checker, appDir);
  const ops = {};
  for (const file of abs) {
    const sf = prog.getSourceFile(file);
    if (!sf) continue;
    const rel = path.relative(appDir, file).split(path.sep).join('/');
    for (const [method, fn] of Object.entries(handlers(sf))) {
      const reqName = fn.parameters?.[0]?.name?.getText();
      const op = {};
      if (method !== 'GET' && method !== 'DELETE') {
        let t;
        each(fn, n => {
          if (t || !ts.isCallExpression(n)) return;
          const e = n.expression;
          const isJson = ts.isPropertyAccessExpression(e) && e.name.text === 'json' && n.arguments.length === 0 && e.expression.getText() === reqName;
          const isChamber = ts.isIdentifier(e) && e.text === 'chamberBody';
          if (!isJson && !isChamber) return;
          t = isChamber ? (n.typeArguments?.[0] ? checker.getTypeFromTypeNode(n.typeArguments[0]) : undefined) : bodyType(checker, n, reqName);
        });
        if (t) { const s = toSchema(t); if (Object.keys(s).length) op.request = s; }
      }
      const byStatus = {};
      each(fn, n => {
        if (!ts.isCallExpression(n) || !n.arguments.length) return;
        const callee = n.expression.getText();
        if (callee !== 'NextResponse.json' && callee !== 'Response.json') return;
        for (const st of statusOf(checker, n.arguments[1])) (byStatus[st] ??= []).push(n.arguments[0]);
      });
      const responses = {};
      for (const [st, args] of Object.entries(byStatus)) {
        if (st === 'default' || Number(st) >= 400) continue;
        const seen = new Set();
        const parts = [];
        for (const a of args) {
          const s = toSchema(checker.getTypeAtLocation(a));
          const k = JSON.stringify(s);
          if (!seen.has(k)) { seen.add(k); parts.push(s); }
        }
        if (parts.some(s => Object.keys(s).length === 0)) responses[st] = {};
        else responses[st] = parts.length === 1 ? parts[0] : { anyOf: parts };
      }
      const typedResponses = Object.fromEntries(Object.entries(responses).filter(([, s]) => Object.keys(s).length));
      if (Object.keys(typedResponses).length) op.responses = typedResponses;
      if (Object.keys(op).length) (ops[rel] ??= {})[method] = op;
    }
  }
  if (includeApiTypes) {
    const sf = prog.getSourceFile(typesFile);
    for (const st of sf?.statements ?? []) {
      if (!(ts.getCombinedModifierFlags(st) & ts.ModifierFlags.Export)) continue;
      if ((ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) && !st.typeParameters?.length) toSchema(checker.getTypeAtLocation(st.name));
    }
  }
  // Remove reservations a failed conversion left behind, and sort for a stable document.
  const sorted = Object.fromEntries(Object.keys(schemas).sort().map(k => [k, schemas[k] ?? {}]));
  return { schemas: sorted, ops };
}
