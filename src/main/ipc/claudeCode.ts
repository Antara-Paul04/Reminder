import {
  checkClaudeCodeHealth,
  getClaudeCodeConfig,
  setClaudeCodeConfig
} from '../runtime/claudeCode'
import { handle } from './registry'

export function registerClaudeCodeHandlers(): void {
  handle('claudecode:config:get', () => getClaudeCodeConfig())
  handle('claudecode:config:set', (partial) => setClaudeCodeConfig(partial))
  handle('claudecode:health', () => checkClaudeCodeHealth())
}
