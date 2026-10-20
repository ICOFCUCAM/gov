// Types for scripts/self-host-lib.mjs (used by its tests).

export interface CronJob { name: string; schedule: string; method: 'GET' | 'POST'; substrate: boolean }
export interface SelfHostArgs {
  command: 'start' | 'backup' | 'status'; data: string; port: number; host: string; url?: string;
  printEnv: boolean; showSecrets: boolean; build: boolean; help: boolean; portSet: boolean; hostSet: boolean; mode?: 'demo';
}
export interface Setting { key: string; make: () => string; note?: string }
export interface KeyPairLike { privateKey: { export(o: { type: 'pkcs8'; format: 'pem' }): string | Buffer } }

export const APP_DIR: string;
export const ENV_FILE: string;
export const RUN_FILE: string;
export const SCHEDULER_FILE: string;
export const SUBDIRS: string[];
export const DEFAULT_PORT: number;
export const DEFAULT_HOST: string;
export const MIN_NODE_MAJOR: number;
export const SETUP_TOKEN_LENGTH: number;
export const SECRET_KEYS: Set<string>;
export const USAGE: string;

export function parseArgs(argv: string[]): SelfHostArgs | { error: string };
export function exposed(host: string): boolean;
export function internalUrl(host: string, port: number): string;
export function parseEnvText(text: string): Map<string, string>;
export function setupToken(rand?: (n: number) => Buffer): string;
export function settingsFor(o: { dataDir: string; url: string; mode?: string; rand?: (n: number) => Buffer; keyPair?: () => KeyPairLike }): Setting[];
export function restrict(p: string, mode: number, platform?: string): boolean;
export function ownerOnly(p: string, platform?: string): boolean;
export function ensureDataDirs(dataDir: string, platform?: string): string;
export function ensureEnvFile(o: { dataDir: string; url?: string; mode?: string; rand?: (n: number) => Buffer; keyPair?: () => KeyPairLike; platform?: string; now?: Date }): {
  file: string; created: boolean; added: string[]; conflicts: { key: string; kept?: string; requested: string }[]; env: Record<string, string>;
};
export function printableEnv(env: Record<string, string>, showSecrets?: boolean): string;
export function mergeEnv(fileEnv: Record<string, string>, processEnv?: Record<string, string | undefined>): { env: Record<string, string | undefined>; overridden: string[] };
export function loadJobs(appDir?: string): CronJob[];
export function substrateConfigured(env: Record<string, string | undefined>): boolean;
export function jobsFor(jobs: CronJob[], env: Record<string, string | undefined>): CronJob[];
export function parseCron(expr: string): unknown;
export function cronMatches(expr: string, at: Date): boolean;
export function dueJobs(jobs: CronJob[], at: Date): CronJob[];
export function msToNextMinute(now?: number): number;
export function nodeOk(version?: string): boolean;
