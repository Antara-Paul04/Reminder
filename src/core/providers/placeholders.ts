import { PlaceholderProvider } from './Provider'

/**
 * The provider roadmap, registered as selectable-later placeholders.
 * Implementing any of these means replacing its placeholder with a real
 * class implementing `Provider` — registration stays identical.
 */
export function createPlaceholderProviders(): PlaceholderProvider[] {
  return [
    // Creative direction — ChatGPT/Claude/Gemini web are now real manual
    // providers (src/core/providers/manual); only API/CLI tiers remain here.
    new PlaceholderProvider('gpt-api', 'GPT API', 'api', ['creative-direction'],
      'OpenAI API for spec generation'),
    new PlaceholderProvider('gemini', 'Gemini', 'api', ['creative-direction'],
      'Google Gemini API for creative direction'),

    // Engineering — Claude Code is now a real provider (src/core/providers/claude-code)
    new PlaceholderProvider('codex-cli', 'Codex CLI', 'cli', ['engineering'],
      'OpenAI Codex CLI for implementation'),
    new PlaceholderProvider('gemini-cli', 'Gemini CLI', 'cli', ['engineering'],
      'Google Gemini CLI for implementation'),

    // Design QA
    new PlaceholderProvider('gpt-vision', 'GPT Vision', 'api', ['design-qa'],
      'Screenshot review via GPT vision models'),
    new PlaceholderProvider('gemini-vision', 'Gemini Vision', 'api', ['design-qa'],
      'Screenshot review via Gemini vision models'),
    new PlaceholderProvider('human-review', 'Human Review', 'manual', ['design-qa'],
      'Routes review to you — approve or reject builds yourself')
  ]
}
