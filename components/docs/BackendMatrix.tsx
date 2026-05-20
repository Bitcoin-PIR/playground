/**
 * Decision matrix for the three PIR backends. Renders a table that
 * surfaces the trade-offs a wallet developer cares about. Numbers are
 * order-of-magnitude — exact figures live in benchmark notes.
 */
export function BackendMatrix() {
  const rows = [
    ['Servers needed', '2 (hint + query)', '2 (hint + query)', '1'],
    ['Non-collusion needed?', 'Yes', 'Yes', 'No'],
    ['Has FHE keys?', 'No', 'No', 'Yes (BFV)'],
    ['Stateful between queries?', 'No', 'Yes (hint cache)', 'No'],
    ['Query batch limit', '~75 INDEX / 80 CHUNK', '~75 INDEX / 80 CHUNK', '1 (per query frame)'],
    ['Hint refresh cadence', 'Never', 'After √n queries', 'Never'],
    ['Browser-friendly?', 'Yes (WASM)', 'Yes (WASM)', 'Yes (hand-rolled TS)'],
    ['Typical use', 'Bulk sync of a wallet', 'Long-lived session', 'Single-server deploys'],
  ] as const;

  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
            <th className="px-3 py-2 text-left font-semibold">Property</th>
            <th className="px-3 py-2 text-left font-semibold">DPF</th>
            <th className="px-3 py-2 text-left font-semibold">HarmonyPIR</th>
            <th className="px-3 py-2 text-left font-semibold">OnionPIR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([prop, a, b, c]) => (
            <tr key={prop} className="border-b border-zinc-200 dark:border-zinc-800">
              <td className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-200">{prop}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{a}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{b}</td>
              <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
