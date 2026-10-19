// The WebGL half of the national-scale map layer (architecture review G4,
// R13). Raw WebGL 2 (WebGL 1 where that is all there is), no map library:
// one interleaved buffer of points (lib/map/gl-points.ts packPoints) drawn as
// GL points with a per-point status colour, a size by zoom, an optional
// category glyph from a texture atlas and the theatre's tile look; one
// triangle list of polygons; and a picking pass into an off-screen buffer
// where every point and polygon is drawn in a colour that encodes its index,
// so hover and click read one small block of pixels instead of searching.
// Shaders are GLSL ES 1.00, which both versions run. Browser only.

import { ATLAS_CELL, NO_GLYPH, POINT_STRIDE, POLY_STRIDE, atlasLayout, nearestPick, type PointStyle } from './gl-points';

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const POINT_VS = `
precision highp float;
attribute vec2 a_pos;
attribute vec4 a_meta;
attribute vec4 a_pick;
uniform mat3 u_matrix;
uniform float u_frame;
uniform vec4 u_tone0; uniform vec4 u_tone1; uniform vec4 u_tone2; uniform vec4 u_tone3;
varying vec4 v_colour;
varying vec4 v_pick;
varying float v_glyph;
varying float v_flags;
void main() {
  vec3 p = u_matrix * vec3(a_pos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  gl_PointSize = u_frame;
  float t = a_meta.x;
  v_colour = t < 0.5 ? u_tone0 : t < 1.5 ? u_tone1 : t < 2.5 ? u_tone2 : u_tone3;
  v_glyph = a_meta.y;
  v_flags = a_meta.z;
  v_pick = a_pick;
}`;

// Styles: 0 dot (status colour with a halo in the page's background colour),
// 1 tile (the theatre's glyph tile: surface fill, status edge, glow, glyph).
// u_ring > 0 draws only a ring (hover and selection) in u_ringColour.
const POINT_FS = `
precision highp float;
uniform float u_frame;
uniform float u_body;
uniform float u_style;
uniform float u_pickPass;
uniform float u_ring;
uniform vec4 u_ringColour;
uniform vec4 u_halo;
uniform vec4 u_surface;
uniform float u_useGlyph;
uniform float u_haloOn;
uniform float u_glowOn;
uniform sampler2D u_atlas;
uniform vec2 u_atlasGrid;
varying vec4 v_colour;
varying vec4 v_pick;
varying float v_glyph;
varying float v_flags;
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec4 over(vec4 top, vec4 under) { return top + under * (1.0 - top.a); }
void main() {
  vec2 px = (gl_PointCoord - 0.5) * u_frame;
  float aa = 1.0;
  if (u_ring > 0.5) {
    float r = length(px);
    float edge = u_frame * 0.5 - 1.5;
    float a = 1.0 - smoothstep(0.0, aa * 1.2, abs(r - edge) - 0.9);
    if (a <= 0.0) discard;
    gl_FragColor = vec4(u_ringColour.rgb, 1.0) * a;
    return;
  }
  if (u_style < 0.5) {
    float r = length(px);
    float R = u_body * 0.5;
    if (r > R + aa) discard;
    if (u_pickPass > 0.5) { gl_FragColor = v_pick; return; }
    float outer = 1.0 - smoothstep(R - aa, R, r);
    // a dot too small for its halo is all colour
    float inner = u_haloOn > 0.5 ? 1.0 - smoothstep(R - 1.0 - aa, R - 1.0, r) : outer;
    vec4 fill = vec4(v_colour.rgb, 1.0) * 0.9 * inner;
    vec4 halo = vec4(u_halo.rgb, 1.0) * (outer - inner);
    gl_FragColor = fill + halo;
    return;
  }
  float h = u_body * 0.5;
  float d = box(px, vec2(h), min(3.0, h * 0.34));
  if (u_pickPass > 0.5) { if (d > 1.0) discard; gl_FragColor = v_pick; return; }
  vec4 col = vec4(0.0);
  // a tile too small for a glyph: a speck in its status colour
  if (h < 4.0) {
    float a = 1.0 - smoothstep(-aa * 0.5, aa * 0.5, d);
    if (a <= 0.0) discard;
    gl_FragColor = vec4(v_colour.rgb, 1.0) * 0.85 * a;
    return;
  }
  // the glow (the SVG theatre's drop-shadow)
  if (d > 0.0 && u_glowOn > 0.5) {
    float g = exp(-d / 2.6) * 0.55;
    col = vec4(v_colour.rgb, 1.0) * g;
  }
  float bw = h > 6.0 ? 1.8 : 1.3;
  float inside = 1.0 - smoothstep(-aa * 0.5, aa * 0.5, d);
  vec4 body = vec4(u_surface.rgb, 1.0);
  if (u_useGlyph > 0.5 && v_glyph < 254.5) {
    vec2 uv = px / (u_body * 0.82) + 0.5;
    if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
      float cell = floor(v_glyph + 0.5);
      vec2 at = vec2(mod(cell, u_atlasGrid.x), floor(cell / u_atlasGrid.x));
      float m = texture2D(u_atlas, (at + uv) / u_atlasGrid).a;
      body = over(vec4(v_colour.rgb, 1.0) * m, body);
    }
  }
  float edge = 1.0 - smoothstep(bw - aa * 0.5, bw + aa * 0.5, -d);
  // a dashed edge for a generalised (restricted) site, as the SVG's 3 2 dash
  if (v_flags > 0.5) {
    float along = (abs(px.x) > abs(px.y) ? px.y : px.x) + h;
    if (mod(along, 5.0) > 3.0) edge = 0.0;
  }
  vec4 rim = vec4(v_colour.rgb, 1.0) * edge;
  col = over(over(rim, body) * inside, col);
  gl_FragColor = col;
}`;

const POLY_VS = `
precision highp float;
attribute vec2 a_pos;
attribute vec4 a_fill;
attribute vec4 a_pick;
uniform mat3 u_matrix;
varying vec4 v_fill;
varying vec4 v_pick;
void main() {
  vec3 p = u_matrix * vec3(a_pos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  v_fill = a_fill; v_pick = a_pick;
}`;
const POLY_FS = `
precision highp float;
uniform float u_pickPass;
varying vec4 v_fill;
varying vec4 v_pick;
void main() { gl_FragColor = u_pickPass > 0.5 ? v_pick : vec4(v_fill.rgb * v_fill.a, v_fill.a); }`;

function compile(gl: GL, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
  return s;
}
function program(gl: GL, vs: string, fs: string, attribs: string[]): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`program: ${gl.getProgramInfoLog(p)}`);
  return p;
}

/** A WebGL context for the map, version 2 where the browser has it. Null without WebGL. */
export function mapContext(canvas: HTMLCanvasElement): { gl: GL; version: 1 | 2 } | null {
  const opts: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'default' };
  const gl2 = canvas.getContext('webgl2', opts) as WebGL2RenderingContext | null;
  if (gl2) return { gl: gl2, version: 2 };
  const gl1 = (canvas.getContext('webgl', opts) ?? canvas.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
  return gl1 ? { gl: gl1, version: 1 } : null;
}

/** Whether this browser can draw the layer at all (checked once on a scratch canvas). */
let webglSupport: boolean | undefined;
export function hasWebGL(): boolean {
  if (webglSupport !== undefined) return webglSupport;
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const ctx = mapContext(c);
    webglSupport = !!ctx;
    (ctx?.gl.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null)?.loseContext?.();
  } catch { webglSupport = false; }
  return webglSupport;
}

export interface LayerColours { tones: [number, number, number, number][]; halo: [number, number, number, number]; surface: [number, number, number, number]; ring: [number, number, number, number]; select: [number, number, number, number] }
export interface DrawState {
  matrix: Float32Array;
  dpr: number;
  style: PointStyle;
  body: number;
  frame: number;
  glyph: boolean;
  /** Dots: draw the halo; tiles: draw the glow. */
  halo: boolean;
  glow: boolean;
  colours: LayerColours;
  /** Draw index of the hovered and the selected point (-1: none). */
  hover: number;
  selected: number;
}

/**
 * The layer on one canvas. Create it after the context is made (and again
 * after a lost context is restored); it holds no state that cannot be
 * re-uploaded from the packed buffers.
 */
export class GLMapLayer {
  readonly gl: GL;
  readonly version: 1 | 2;
  private pointProg: WebGLProgram;
  private polyProg: WebGLProgram;
  private pointBuf: WebGLBuffer;
  private polyBuf: WebGLBuffer;
  private atlas: WebGLTexture;
  private atlasGrid: [number, number] = [1, 1];
  private pickFbo: WebGLFramebuffer | null = null;
  private pickTex: WebGLTexture | null = null;
  private pickSize: [number, number] = [0, 0];
  private pickDirty = true;
  private points = 0;
  private polyVerts = 0;
  private last: DrawState | null = null;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private polyLoc: Record<string, WebGLUniformLocation | null> = {};

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = mapContext(canvas);
    if (!ctx) throw new Error('WebGL is not available');
    this.gl = ctx.gl; this.version = ctx.version;
    const gl = this.gl;
    this.pointProg = program(gl, POINT_VS, POINT_FS, ['a_pos', 'a_meta', 'a_pick']);
    this.polyProg = program(gl, POLY_VS, POLY_FS, ['a_pos', 'a_fill', 'a_pick']);
    for (const n of ['u_matrix', 'u_frame', 'u_body', 'u_style', 'u_pickPass', 'u_ring', 'u_ringColour', 'u_halo', 'u_surface', 'u_useGlyph', 'u_haloOn', 'u_glowOn', 'u_atlas', 'u_atlasGrid', 'u_tone0', 'u_tone1', 'u_tone2', 'u_tone3']) this.loc[n] = gl.getUniformLocation(this.pointProg, n);
    for (const n of ['u_matrix', 'u_pickPass']) this.polyLoc[n] = gl.getUniformLocation(this.polyProg, n);
    this.pointBuf = gl.createBuffer()!;
    this.polyBuf = gl.createBuffer()!;
    this.atlas = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  /** Upload packed points (lib/map/gl-points.ts packPoints). */
  setPoints(data: ArrayBuffer, count: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.points = count; this.pickDirty = true;
  }

  /** Upload packed polygon triangles (packPolygons). */
  setPolygons(data: ArrayBuffer, vertices: number): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.polyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.polyVerts = vertices; this.pickDirty = true;
  }

  /** Draw the glyphs (white on transparent) into the atlas texture. */
  setGlyphs(glyphs: string[], font = '22px system-ui, sans-serif'): void {
    const gl = this.gl;
    const { cols, rows, width, height } = atlasLayout(Math.max(1, glyphs.length));
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const g = c.getContext('2d');
    if (g) {
      g.clearRect(0, 0, width, height);
      g.fillStyle = 'white'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
      glyphs.forEach((s, i) => g.fillText(s, (i % cols) * ATLAS_CELL + ATLAS_CELL / 2, Math.floor(i / cols) * ATLAS_CELL + ATLAS_CELL / 2 + 1));
    }
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.atlasGrid = [cols, rows];
  }

  private bindPoints(): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, POINT_STRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, POINT_STRIDE, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, POINT_STRIDE, 12);
  }
  private bindPolys(): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.polyBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, POLY_STRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, POLY_STRIDE, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, POLY_STRIDE, 12);
  }

  private pass(s: DrawState, pick: boolean): void {
    const gl = this.gl;
    if (this.polyVerts) {
      gl.useProgram(this.polyProg);
      this.bindPolys();
      gl.uniformMatrix3fv(this.polyLoc.u_matrix!, false, s.matrix);
      gl.uniform1f(this.polyLoc.u_pickPass!, pick ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, this.polyVerts);
    }
    if (!this.points) return;
    gl.useProgram(this.pointProg);
    this.bindPoints();
    const L = this.loc;
    gl.uniformMatrix3fv(L.u_matrix!, false, s.matrix);
    gl.uniform1f(L.u_frame!, s.frame * s.dpr);
    gl.uniform1f(L.u_body!, s.body * s.dpr);
    gl.uniform1f(L.u_style!, s.style === 'tile' ? 1 : 0);
    gl.uniform1f(L.u_pickPass!, pick ? 1 : 0);
    gl.uniform1f(L.u_ring!, 0);
    gl.uniform1f(L.u_useGlyph!, s.glyph ? 1 : 0);
    gl.uniform1f(L.u_haloOn!, s.halo ? 1 : 0);
    gl.uniform1f(L.u_glowOn!, s.glow ? 1 : 0);
    s.colours.tones.forEach((c, i) => gl.uniform4fv(L[`u_tone${i}`]!, c));
    gl.uniform4fv(L.u_halo!, s.colours.halo);
    gl.uniform4fv(L.u_surface!, s.colours.surface);
    gl.uniform2f(L.u_atlasGrid!, this.atlasGrid[0], this.atlasGrid[1]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.uniform1i(L.u_atlas!, 0);
    gl.drawArrays(gl.POINTS, 0, this.points);
    if (pick) return;
    // hover and selection rings, one point each
    const ring = (k: number, colour: [number, number, number, number], scale: number) => {
      if (k < 0 || k >= this.points) return;
      gl.uniform1f(L.u_ring!, 1);
      gl.uniform4fv(L.u_ringColour!, colour);
      gl.uniform1f(L.u_frame!, Math.max(s.body * 2.2, s.body + 8) * scale * s.dpr);
      gl.drawArrays(gl.POINTS, k, 1);
    };
    ring(s.selected, s.colours.select, 1.15);
    ring(s.hover, s.colours.ring, 1);
  }

  /** Draw at the canvas's current pixel size. */
  draw(s: DrawState): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    this.last = s; this.pickDirty = true;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.pass(s, false);
  }

  private ensurePickTarget(): void {
    const gl = this.gl, w = this.canvas.width, h = this.canvas.height;
    if (this.pickFbo && this.pickSize[0] === w && this.pickSize[1] === h) return;
    if (this.pickTex) gl.deleteTexture(this.pickTex);
    if (this.pickFbo) gl.deleteFramebuffer(this.pickFbo);
    this.pickTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.pickTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.pickFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTex, 0);
    this.pickSize = [w, h]; this.pickDirty = true;
  }

  /**
   * What is under a canvas pixel (device pixels, y down): the nearest point
   * within `radius` device pixels, else the polygon there. Indices are the
   * caller's own (the pick colour carries them).
   */
  pick(x: number, y: number, radius: number): { point: number | null; polygon: number | null } {
    const gl = this.gl;
    if (!this.last || gl.isContextLost()) return { point: null, polygon: null };
    this.ensurePickTarget();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo);
    // One picking pass (polygons under points; polygon ids follow the point ids),
    // drawn again only when the drawing changed: hovering reads pixels and nothing more.
    if (this.pickDirty) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.BLEND);
      this.pass(this.last, true);
      this.pickDirty = false;
    }
    const r = Math.max(1, Math.round(radius)), size = r * 2 + 1;
    const px = new Uint8Array(size * size * 4);
    gl.readPixels(Math.round(x) - r, this.canvas.height - 1 - Math.round(y) - r, size, size, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const n = this.points;
    const point = n ? nearestPick(px, size, r, id => id < n) : null;
    const centre = nearestPick(px.subarray(((r * size) + r) * 4, ((r * size) + r) * 4 + 4), 1, 0.5);
    const polygon = centre != null && centre >= n ? centre - n : null;
    // The picking buffer is off screen: what the viewer sees is untouched.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.enable(gl.BLEND);
    return { point, polygon };
  }

  /** Points drawn now (for checks). */
  get count(): number { return this.points; }
  get dirty(): boolean { return this.pickDirty; }

  dispose(): void {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    gl.deleteBuffer(this.pointBuf); gl.deleteBuffer(this.polyBuf); gl.deleteTexture(this.atlas);
    if (this.pickTex) gl.deleteTexture(this.pickTex);
    if (this.pickFbo) gl.deleteFramebuffer(this.pickFbo);
    gl.deleteProgram(this.pointProg); gl.deleteProgram(this.polyProg);
  }
}

export { NO_GLYPH };
