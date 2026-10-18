import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// The Situation Room map is the government's command theatre. Its redesign onto the
// nation's real map must keep every role, function and command the earlier theatre had
// (owner's instruction: never lesser in role, function, design or command).
const read = (f: string) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const theatre = read('Theatre.tsx');
const room = read('../SituationRoom.tsx');

describe('Situation Room command theatre keeps everything the earlier theatre had', () => {
  it.each([
    ['institutions as command nodes, each opening its workspace', theatre, /href=\{`\/gov\/ministry\/\$\{m\.ministryId\}`\}/],
    ['knock-on links between institutions, flowing faster with serious incidents', theatre, /edges\.slice\(0, 26\)[\s\S]*animate-dash-flow/],
    ['cascades from critical institutions into the regions', theatre, /cascades|cs\$\{m\.ministryId\}/],
    ['shock rings on institutions under pressure', theatre, /pressure >= 68/],
    ['incident chips beside the reporting institution', theatre, /CRITICAL' : inc\.severity === 'sev2'/],
    ['pressure diffusion over regions that are not stable', theatre, /pressure diffusion/],
    ['readiness rings and status callouts', theatre, /READINESS/],
    ['radar sweep over the capital', theatre, /animateTransform attributeName="transform" type="rotate"/],
    ['scanline, corner brackets, crosshair and vignette', theatre, /tactical framing: scanline, corner brackets, crosshair, vignette/],
    ['grid and terrain wash', theatre, /terrain-\$\{uid\}/],
    ['corridors with moving traffic', theatre, /corridors \(sample\)[\s\S]*animateMotion/],
    ['air lanes', theatre, /air lanes \(sample\)/],
    ['road, rail, grid and pipeline networks', theatre, /sampleNetworksOn/],
    ['infrastructure tiles with names for critical assets', theatre, /ASSET_LABEL\[a\.kind\]/],
    ['evacuation routes', theatre, /evacuation routes \(sample\)/],
    ['population', theatre, /population \(sample\)/],
    ['tactical, heat, grid and incident controls', theatre, /Tactical framing[\s\S]*Heat intensity[\s\S]*Grid overlay[\s\S]*Incident diffusion/],
    ['layers menu with every layer', room, /\['institutions', 'Institutions and knock-on links'\], \['incidents', 'Incidents'\], \['infra', 'Infrastructure'\], \['corridors', 'Corridors'\], \['grid', 'Grid'\], \['environment', 'Environment'\]/],
    ['full screen', room, /requestFullscreen/],
    ['activity banner', room, /Activity · \{critCount >= 3 \? 'very high' : 'high'\}/],
    ['regional pressure ladder', room, /Regional pressure/],
    ['operating strip', room, /Grid corridors[\s\S]*Goods moved[\s\S]*Telecom integrity[\s\S]*Strategic reserves[\s\S]*Coordination capacity/],
  ])('%s', (_name, src, re) => {
    expect(src).toMatch(re);
  });

  it('draws on the nation\'s real map, with its neighbours, and marks samples', () => {
    expect(room).toMatch(/variant="theatre"/);
    expect(theatre).toMatch(/SAMPLE|sample/);
    expect(room).toMatch(/SignalTag kind="sample"/);
  });
});
