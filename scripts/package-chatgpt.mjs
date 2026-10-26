#!/usr/bin/env node
// Builds the ChatGPT plugin ZIP for the OpenAI Platform portal (Plugins → New plugin → upload), in
// the Agent Plugins layout:
//
//   cubrik/
//     plugin.json        $schema + identity at the root; listing (interface), review data and release
//                        notes under extensions."com.openai"
//     mcp.json           the remote MCP server: the ChatGPT door, https://mcp.cubrik.ai/chatgpt/mcp
//     skills/<name>/...  every skill of this repo but cubrik-trading
//     assets/logo.png, icon.png
//
// Output: dist/chatgpt/cubrik-<version>.zip (dist/ is gitignored).
// Usage:  node scripts/package-chatgpt.mjs [version]       (DEMO_URL=https://… to set the video)
//
// What shaped it — OpenAI's directory rules (developers.openai.com/apps-sdk/app-submission-guidelines):
// - No executing trades. So the package points at cubrik's ChatGPT door, which has no broker tool and
//   starts no agent that may trade, and leaves out the cubrik-trading skill.
// - No selling or promoting plans inside the app: the door strips upsell sentences, and nothing here
//   mentions a price.
// - The validator is strict ("Extra inputs are not permitted"): root plugin.json keys are only the ones
//   the Agent Plugins schema allows; everything OpenAI's is under extensions."com.openai".
// - Reviewer credentials are not in the ZIP: they go in the portal's Review information.
// - The first upload creates the plugin; later ones must keep the `name` the portal shows for it.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2] || JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8')).version;
const demoUrl = process.env.DEMO_URL || '';

// Until the portal gives the plugin an id of its own, its name is this; an update must keep the portal's.
const PACKAGE_NAME = process.env.PACKAGE_NAME || 'cubrik';
const MCP_SERVER = 'cubrik';
const MCP_URL = 'https://mcp.cubrik.ai/chatgpt/mcp';
/** The skills ChatGPT gets: all of them but the one about placing orders, which this door cannot do. */
const SKILLS = ['cubrik-setup', 'cubrik-agent-builder', 'cubrik-backtesting', 'cubrik-portfolio-check', 'cubrik-performance-review', 'cubrik-library', 'cubrik-skill-author'];

const longDescription = [
  'cubrik runs AI agents that trade the strategies you describe, on the brokers and exchanges you connect to your cubrik account. This app brings that account into ChatGPT.',
  'Describe an idea and ChatGPT writes it as rules and backtests it on historical candles: the equity curve, the return, the deepest drawdown, the win rate and the trades, month by month, with the assumptions behind the figures. When you want it live, it sets the idea up as a cubrik agent with your schedule and limits; agents that place orders are started in cubrik itself.',
  'Ask how you are doing and it reads your results and cubrik Analytics: profit and loss by agent, by session and by holding time, and the advice Analytics draws from each agent\'s own trades, which you can apply in one step. Ask what is open and it reads your balances and positions on every connected platform.',
  'Browse cubrik\'s Library of ready-made agents, each backtested over twelve months, compare them on return and drawdown together, and copy one into your account. Nothing in the Library is ranked or recommended.',
  'This version places no orders and moves no money. You sign in with your cubrik account and choose what ChatGPT may read and manage; you can disconnect it at any time in cubrik. Trading carries a risk of loss; cubrik does not give investment advice.',
].join('\n\n');

const positive = [
  {
    description: 'Backtest an indicator idea',
    prompt: 'Backtest a 4h EMA 20/50 crossover on BTC over the last 12 months, 2% stop, 6% target.',
    tools_triggered: 'run_backtest, get_backtest',
    expected_behavior: 'Writes the rules, queues the backtest and reads it back; the backtest card shows progress, then the equity curve, return, drawdown, win rate and trades, described as simulated.',
  },
  {
    description: 'Account check-in',
    prompt: 'What does my cubrik account look like right now?',
    tools_triggered: 'get_account, list_platforms, get_portfolio',
    expected_behavior: 'Summarises the plan and credits left, the connected platforms, and balances and open positions per platform; the portfolio card renders.',
  },
  {
    description: 'Performance review with advice',
    prompt: 'How did my agents do this month, and what does Analytics suggest changing?',
    tools_triggered: 'get_trading_results, get_analysis, get_advice',
    expected_behavior: 'Reports net result, trades and win rate by agent, the standout breakdown row, and the per-agent advice with its evidence; offers to apply one, and applies only on confirmation.',
  },
  {
    description: 'Library search',
    prompt: 'Show me ready-made cubrik agents that trade gold.',
    tools_triggered: 'search_library',
    expected_behavior: 'Lists Library agents trading XAUUSD with their 12-month backtest return, drawdown and win rate; the Library cards render with Copy buttons; nothing is called recommended.',
  },
  {
    description: 'Create a watch-only agent',
    prompt: 'Set up an agent that tells me every morning at 8 how my open positions are doing.',
    tools_triggered: 'create_agent, start_watch_agent',
    expected_behavior: 'Creates a paused agent with may_trade false and a daily 08:00 schedule, then starts it on confirmation; it places no orders.',
  },
];

const negative = [
  {
    description: 'Order placement: this version has no order tool. The assistant says orders are placed in cubrik or the broker, not here.',
    prompt: 'Buy 1 BTC with 10x leverage on my Binance account.',
  },
  {
    description: 'Withdrawal: no transfer or withdrawal tool exists. The assistant declines and offers no workaround.',
    prompt: 'Withdraw 500 USDT from my exchange to my wallet.',
  },
  {
    description: 'Personal investment advice: out of scope. The assistant may show data but does not recommend what to buy.',
    prompt: 'Should I put my savings into SOL?',
  },
];

const releaseNotes = 'First version: backtests with an equity-curve card, account and portfolio check, Analytics results and advice you can apply, the Library of ready-made agents, watch-only agents, and seven skills. No order placement and no money movement.';

const manifest = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  name: PACKAGE_NAME,
  version,
  description:
    "cubrik in ChatGPT: backtest trading ideas on historical candles, check your balances and positions, read your results and Analytics advice, browse and copy ready-made agents, and set up watch-only agents. Seven skills. Places no orders and moves no money. Not investment advice.",
  author: { name: 'cubrik', email: 'help@cubrik.ai', url: 'https://cubrik.ai' },
  homepage: 'https://cubrik.ai/en/mcp',
  repository: 'https://github.com/target1m/cubrik-mcp',
  license: 'MIT',
  keywords: ['trading', 'backtesting', 'portfolio', 'ai-agents', 'analytics', 'mcp'],
  extensions: {
    'com.openai': {
      interface: {
        displayName: 'cubrik',
        shortDescription: 'Backtests and trading agents',
        longDescription,
        developerName: 'Next Step L.L.C-FZ',
        category: 'Finance',
        websiteURL: 'https://cubrik.ai/en/mcp',
        supportURL: 'https://cubrik.ai/en/contact',
        privacyPolicyURL: 'https://cubrik.ai/en/legal/privacy',
        termsOfServiceURL: 'https://cubrik.ai/en/legal/terms',
        defaultPrompt: [
          'Backtest a 4h EMA 20/50 crossover on ETH over the last 12 months',
          'How are my cubrik agents doing this week?',
          'Show me ready-made agents that trade gold',
        ],
        brandColor: '#7c3aed',
        composerIcon: './assets/icon.png',
        logo: './assets/logo.png',
      },
      review: {
        test_cases: { positive, negative },
        ...(demoUrl ? { demo_recording_url: demoUrl } : {}),
        commerce: false,
      },
      publication: { release_notes: releaseNotes },
    },
  },
};

const mcp = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
  mcpServers: { [MCP_SERVER]: { type: 'streamable-http', url: MCP_URL } },
};

// The portal's limits, checked here so a bad package never reaches the upload.
const problems = [];
const ui = manifest.extensions['com.openai'].interface;
const oneLine = (s) => typeof s === 'string' && s.trim() !== '' && !/[\r\n]/.test(s);
if (!/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(manifest.name) || manifest.name.length > 64) problems.push('name');
if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push('version is not semver');
if (manifest.description.length > 1024) problems.push('description > 1024');
if (!oneLine(ui.displayName) || ui.displayName.length > 30) problems.push('displayName > 30');
if (!oneLine(ui.shortDescription) || ui.shortDescription.length > 30) problems.push('shortDescription > 30');
if (!ui.longDescription || ui.longDescription.length > 4000) problems.push('longDescription > 4000');
if (!oneLine(ui.developerName) || ui.developerName.length > 80) problems.push('developerName > 80');
if (ui.defaultPrompt.length > 3 || ui.defaultPrompt.some((p) => !oneLine(p) || p.length > 128 || p.includes('@'))) problems.push('defaultPrompt');
for (const key of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL'])
  if (!/^https:\/\//.test(ui[key] || '') || ui[key].length > 1024) problems.push(`${key} must be https`);
if (positive.length !== 5 || negative.length !== 3) problems.push('needs exactly 5 positive and 3 negative test cases');
for (const t of positive) if (!t.description || !t.prompt || !t.tools_triggered || !t.expected_behavior) problems.push(`positive case: ${t.prompt}`);
for (const skill of SKILLS) {
  if (!existsSync(join(root, 'skills', skill, 'SKILL.md'))) problems.push(`skill missing: ${skill}`);
  if (`${manifest.name}:${skill}`.length > 64) problems.push(`plugin-name:skill-name > 64 for ${skill}`);
}
// The ChatGPT door has none of these; a skill that names one would send the model looking for it.
// `start_agent` may be named only beside `start_watch_agent`, as the door each one belongs to.
const trading = /\b(run_agent_now|place_\w*order|set_\w*tp_sl|close_\w*position)\b/;
for (const skill of SKILLS) {
  const text = readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');
  if (trading.test(text)) problems.push(`${skill} names a tool the ChatGPT door does not have: ${text.match(trading)[0]}`);
  if (/\bstart_agent\b/.test(text) && !text.includes('start_watch_agent')) problems.push(`${skill} names start_agent without the ChatGPT door's start_watch_agent`);
}
if (problems.length) {
  console.error('Package rejected:\n- ' + problems.join('\n- '));
  process.exit(1);
}

const out = join(root, 'dist/chatgpt');
const pkg = join(out, 'build/cubrik');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(pkg, 'assets'), { recursive: true });
writeFileSync(join(pkg, 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(join(pkg, 'mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
for (const skill of SKILLS) {
  cpSync(join(root, 'skills', skill), join(pkg, 'skills', skill), { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
  // Each skill's dependency names the server it needs: here, the ChatGPT door.
  const yaml = join(pkg, 'skills', skill, 'agents/openai.yaml');
  if (existsSync(yaml)) writeFileSync(yaml, readFileSync(yaml, 'utf8').replace('https://mcp.cubrik.ai/mcp', MCP_URL));
}
cpSync(join(root, 'logo-512.png'), join(pkg, 'assets/logo.png'));
cpSync(join(root, 'logo-512.png'), join(pkg, 'assets/icon.png'));

const zip = join(out, `cubrik-${version}.zip`);
execFileSync('zip', ['-qrX', zip, 'cubrik', '-x', '*.DS_Store', '__MACOSX/*'], { cwd: join(out, 'build') });
console.log(`→ ${zip}`);
if (!demoUrl) console.log('  no DEMO_URL: add the demo video in the portal, or set DEMO_URL.');
