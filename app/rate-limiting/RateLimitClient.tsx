'use client';

import { useEffect, useRef, useState } from 'react';
import { initSdkWasm, requireSdkWasm } from '@vendor/web/sdk-bridge';
import { ArcCredentialManager } from '@vendor/web/credential-manager';
import { CashuBatPool, mintBatPool } from '@vendor/web/cashu-bat';
import {
  getArcPubkey,
  issueArcCredential,
  presentArc,
  presentCashu,
} from '@vendor/web/payment-client';

/** Must match the verifier's DEFAULT_REQUEST_CONTEXT and the dev-issuer. */
const REQUEST_CONTEXT = new TextEncoder().encode('bitcoin-pir-v1');
const DEFAULT_ISSUER = 'https://issuer.bitcoinpir.org';

type Kind = 'info' | 'ok' | 'err';
type LogLine = { ts: string; msg: string; kind: Kind };
const now = () => new Date().toLocaleTimeString();

function Meter({ remaining, total }: { remaining: number; total: number }) {
  return (
    <div className="my-2 flex min-h-[16px] flex-wrap gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`size-3.5 rounded-sm ${i < remaining ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
        />
      ))}
    </div>
  );
}

function Log({ lines }: { lines: LogLine[] }) {
  return (
    <div className="h-44 overflow-y-auto rounded-md bg-zinc-900 p-2 font-mono text-[11px] leading-relaxed">
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            l.kind === 'ok'
              ? 'text-emerald-300'
              : l.kind === 'err'
                ? 'text-red-300'
                : 'text-zinc-300'
          }
        >
          {l.ts} {l.msg}
        </div>
      ))}
    </div>
  );
}

const btn =
  'rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed';
const btnSecondary =
  'rounded-md border border-emerald-600 bg-transparent px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 disabled:opacity-40 disabled:cursor-not-allowed';

export function RateLimitClient() {
  const [issuer, setIssuer] = useState(DEFAULT_ISSUER);
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err' | 'checking'; text: string }>({
    kind: 'checking',
    text: 'Checking issuer…',
  });

  // ARC state
  const [arcLog, setArcLog] = useState<LogLine[]>([]);
  const [arcStatus, setArcStatus] = useState('No credential yet.');
  const [arcRemaining, setArcRemaining] = useState(0);
  const [arcTotal, setArcTotal] = useState(0);
  const [arcLimit, setArcLimit] = useState(8);
  const [arcCanPresent, setArcCanPresent] = useState(false);
  const [arcCanReplay, setArcCanReplay] = useState(false);

  // Cashu state
  const [cashuLog, setCashuLog] = useState<LogLine[]>([]);
  const [cashuStatus, setCashuStatus] = useState('No pool yet.');
  const [cashuRemaining, setCashuRemaining] = useState(0);
  const [cashuTotal, setCashuTotal] = useState(0);
  const [cashuCount, setCashuCount] = useState(5);
  const [cashuCanSpend, setCashuCanSpend] = useState(false);
  const [cashuCanReplay, setCashuCanReplay] = useState(false);

  const credMgr = useRef<ArcCredentialManager | null>(null);
  const lastArcFrame = useRef<Uint8Array | null>(null);
  const pool = useRef<CashuBatPool | null>(null);
  const lastBatFrame = useRef<Uint8Array | null>(null);

  const issuerUrl = () => issuer.trim().replace(/\/+$/, '');
  const arcAdd = (msg: string, kind: Kind = 'info') =>
    setArcLog((l) => [...l, { ts: now(), msg, kind }]);
  const cashuAdd = (msg: string, kind: Kind = 'info') =>
    setCashuLog((l) => [...l, { ts: now(), msg, kind }]);

  async function checkIssuer() {
    setBanner({ kind: 'checking', text: 'Checking issuer…' });
    try {
      const r = await fetch(`${issuerUrl()}/health`);
      setBanner(
        r.ok
          ? { kind: 'ok', text: `✓ Issuer reachable at ${issuerUrl()}` }
          : { kind: 'err', text: `Issuer responded HTTP ${r.status} — is this the issuer?` },
      );
    } catch {
      setBanner({
        kind: 'err',
        text: `✗ Issuer unreachable at ${issuerUrl()} — point at a running dev-issuer (see below)`,
      });
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void checkIssuer(); }, []);

  // ─── ARC ───────────────────────────────────────────────────────────────
  async function arcMint() {
    try {
      const limit = Math.max(1, arcLimit || 8);
      arcAdd(`Minting ARC credential (limit ${limit})…`);
      await initSdkWasm();
      const sdk = requireSdkWasm();
      const req = new sdk.WasmArcCredentialRequest(REQUEST_CONTEXT);
      arcAdd(`Built blinded credential request (${req.request_bytes().length} B).`);
      const pubkey = await getArcPubkey(issuerUrl());
      const resp = await issueArcCredential(issuerUrl(), req.request_bytes());
      arcAdd(`Issuer signed it (response ${resp.length} B).`);
      const cred = req.finalize(pubkey, resp);
      arcAdd(`Finalized → ${cred.length}-byte credential.`, 'ok');
      const presCtx = crypto.getRandomValues(new Uint8Array(32));
      credMgr.current = new ArcCredentialManager(cred, presCtx, limit);
      setArcTotal(limit);
      setArcRemaining(credMgr.current.remaining);
      setArcStatus(`Credential ready — ${credMgr.current.remaining}/${limit} presentations left`);
      setArcCanPresent(true);
    } catch (e) {
      arcAdd(`Mint failed: ${(e as Error).message}`, 'err');
    }
  }

  async function arcPresent() {
    const m = credMgr.current;
    if (!m) return;
    try {
      if (m.exhausted) {
        arcAdd('Credential exhausted — mint a new one.', 'err');
        return;
      }
      const frame = await m.buildPresentFrame(REQUEST_CONTEXT);
      lastArcFrame.current = frame;
      const res = await presentArc(issuerUrl(), frame);
      if (res.ok) arcAdd(`Presented #${m.used} → accepted ✓`, 'ok');
      else arcAdd(`Presented → rejected: ${res.reason}`, 'err');
      setArcRemaining(m.remaining);
      setArcStatus(`${m.remaining}/${m.limit} presentations left`);
      setArcCanReplay(true);
      if (m.exhausted) setArcCanPresent(false);
    } catch (e) {
      arcAdd(`Exhausted client-side: ${(e as Error).message}`, 'err');
      setArcCanPresent(false);
    }
  }

  async function arcReplay() {
    const f = lastArcFrame.current;
    if (!f) return;
    arcAdd('Re-presenting the last (already-used) presentation…');
    try {
      const res = await presentArc(issuerUrl(), f);
      if (res.ok) arcAdd('Accepted again?! (unexpected — replay not caught)', 'err');
      else arcAdd(`Rejected as expected: ${res.reason} ✓`, 'ok');
    } catch (e) {
      arcAdd(`Replay failed: ${(e as Error).message}`, 'err');
    }
  }

  async function arcRunAll() {
    await arcMint();
    const m = credMgr.current;
    if (!m) return;
    while (!m.exhausted) await arcPresent();
    arcAdd('Auto-run complete — credential exhausted.', 'ok');
  }

  // ─── Cashu ─────────────────────────────────────────────────────────────
  async function cashuMint() {
    try {
      const count = Math.max(1, cashuCount || 5);
      cashuAdd(`Minting a pool of ${count} BATs…`);
      pool.current = await mintBatPool(issuerUrl(), count);
      lastBatFrame.current = null;
      setCashuTotal(count);
      setCashuRemaining(pool.current.remaining);
      setCashuStatus(`Pool ready — ${pool.current.remaining} BATs`);
      setCashuCanSpend(true);
      setCashuCanReplay(false);
      cashuAdd(`Pool minted (${pool.current.remaining} single-use BATs).`, 'ok');
    } catch (e) {
      cashuAdd(`Mint failed: ${(e as Error).message}`, 'err');
    }
  }

  async function cashuSpend() {
    const p = pool.current;
    if (!p) return;
    try {
      if (p.exhausted) {
        cashuAdd('Pool empty — mint more BATs.', 'err');
        return;
      }
      const frame = p.buildPresentFrame();
      lastBatFrame.current = frame;
      const res = await presentCashu(issuerUrl(), frame);
      if (res.ok) cashuAdd(`Spent a BAT → accepted ✓ (${p.remaining} left)`, 'ok');
      else cashuAdd(`Rejected: ${res.reason}`, 'err');
      setCashuRemaining(p.remaining);
      setCashuStatus(`${p.remaining} BATs left`);
      setCashuCanReplay(true);
      if (p.exhausted) setCashuCanSpend(false);
    } catch (e) {
      cashuAdd(`Spend failed: ${(e as Error).message}`, 'err');
    }
  }

  async function cashuReplay() {
    const f = lastBatFrame.current;
    if (!f) return;
    cashuAdd('Re-presenting the last (already-spent) BAT…');
    try {
      const res = await presentCashu(issuerUrl(), f);
      if (res.ok) cashuAdd('Accepted again?! (unexpected — double-spend not caught)', 'err');
      else cashuAdd(`Rejected as expected: ${res.reason} ✓`, 'ok');
    } catch (e) {
      cashuAdd(`Replay failed: ${(e as Error).message}`, 'err');
    }
  }

  async function cashuRunAll() {
    await cashuMint();
    const p = pool.current;
    if (!p) return;
    while (!p.exhausted) await cashuSpend();
    cashuAdd('Auto-run complete — pool empty.', 'ok');
  }

  const bannerClass =
    banner.kind === 'ok'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : banner.kind === 'err'
        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
        : 'border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400';

  return (
    <div className="mt-6">
      {/* Issuer config + reachability */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold" htmlFor="issuer">Issuer URL</label>
        <input
          id="issuer"
          className="w-72 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
        />
        <button className={btnSecondary} onClick={() => void checkIssuer()}>Check</button>
      </div>
      <div className={`my-3 rounded-md border px-3 py-2 font-mono text-xs ${bannerClass}`}>
        {banner.text}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ARC */}
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">ARC</h2>
          <p className="mb-3 text-xs text-zinc-500">Multi-show: one credential → N unlinkable presentations.</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="arc-limit">limit</label>
            <input
              id="arc-limit"
              type="number"
              min={1}
              max={64}
              value={arcLimit}
              onChange={(e) => setArcLimit(parseInt(e.target.value, 10) || 8)}
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button className={btn} onClick={() => void arcMint()}>Mint credential</button>
            <button className={btnSecondary} onClick={() => void arcRunAll()}>Run to exhaustion</button>
          </div>
          <div className="mt-2 flex gap-2">
            <button className={btnSecondary} disabled={!arcCanPresent} onClick={() => void arcPresent()}>Present once</button>
            <button className={btnSecondary} disabled={!arcCanReplay} onClick={() => void arcReplay()}>Replay last (rejected)</button>
          </div>
          <p className="mt-3 text-sm font-semibold">{arcStatus}</p>
          <Meter remaining={arcRemaining} total={arcTotal} />
          <Log lines={arcLog} />
        </div>

        {/* Cashu */}
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Cashu Blind Auth</h2>
          <p className="mb-3 text-xs text-zinc-500">Single-show: a pool of one-time BATs, each spent once.</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm" htmlFor="cashu-count">count</label>
            <input
              id="cashu-count"
              type="number"
              min={1}
              max={64}
              value={cashuCount}
              onChange={(e) => setCashuCount(parseInt(e.target.value, 10) || 5)}
              className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button className={btn} onClick={() => void cashuMint()}>Mint BAT pool</button>
            <button className={btnSecondary} onClick={() => void cashuRunAll()}>Mint + spend all</button>
          </div>
          <div className="mt-2 flex gap-2">
            <button className={btnSecondary} disabled={!cashuCanSpend} onClick={() => void cashuSpend()}>Spend one</button>
            <button className={btnSecondary} disabled={!cashuCanReplay} onClick={() => void cashuReplay()}>Replay last (double-spend)</button>
          </div>
          <p className="mt-3 text-sm font-semibold">{cashuStatus}</p>
          <Meter remaining={cashuRemaining} total={cashuTotal} />
          <Log lines={cashuLog} />
        </div>
      </div>
    </div>
  );
}
