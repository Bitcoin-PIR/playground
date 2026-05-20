export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="container-wide flex h-14 items-center justify-between text-xs text-zinc-500">
        <span>MIT licensed · Bitcoin PIR contributors</span>
        <span>
          <a
            href="https://github.com/Bitcoin-PIR/Bitcoin-PIR"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Main repo
          </a>{' '}
          ·{' '}
          <a
            href="https://github.com/Bitcoin-PIR/playground"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            This site
          </a>
        </span>
      </div>
    </footer>
  );
}
