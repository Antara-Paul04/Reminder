/**
 * Host-capability ports for manual providers. The core stays free of
 * electron imports; the main process injects real implementations
 * (electron clipboard, shell.openExternal) at boot.
 */

export interface ClipboardPort {
  writeText(text: string): void
}

export interface OpenerPort {
  openExternal(url: string): void
}

/** Safe defaults for tests and headless use. */
export class NoopClipboard implements ClipboardPort {
  writeText(): void {}
}

export class NoopOpener implements OpenerPort {
  openExternal(): void {}
}
