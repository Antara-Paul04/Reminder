import { ipcMain } from 'electron'
import type { IpcChannel, IpcContract } from '@shared/ipc'

/** Registers a typed handler for one IPC channel. */
export function handle<C extends IpcChannel>(
  channel: C,
  fn: (
    ...args: IpcContract[C]['req']
  ) => IpcContract[C]['res'] | Promise<IpcContract[C]['res']>
): void {
  ipcMain.handle(channel, (_event, ...args) => fn(...(args as IpcContract[C]['req'])))
}
