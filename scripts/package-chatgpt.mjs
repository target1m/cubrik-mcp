#!/usr/bin/env node
// Builds the ChatGPT plugin ZIP for the OpenAI Platform portal (platform.openai.com/plugins → Upload new
// or existing plugin), in the Agent Plugins layout:
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
// What shaped it — OpenAI's directory rules (developers.openai.com/plugins/plugin-guidelines and
// /plugins/deploy/submission, read again on 4 Nov 2026):
// - No executing trades. So the package points at cubrik's ChatGPT door, which has no broker tool and
//   starts no agent that may trade, and leaves out the cubrik-trading skill.
// - No selling or promoting plans inside the app: the door strips upsell sentences, and nothing here
//   mentions a price.
// - The validator is strict ("Extra inputs are not permitted"): root plugin.json keys are only the ones
//   the Agent Plugins schema allows; everything OpenAI's is under extensions."com.openai".
// - Reviewer credentials are not in the ZIP (it refuses test_credentials and reviewer_instructions):
//   they go in the portal's Review information → Review details.
// - Every public URL in the package is checked: it must answer and name the same publisher. So no
//   `repository` until github.com/target1m/cubrik-mcp is public (REPOSITORY=… puts it back).
// - The demo video is left to the portal unless DEMO_URL is set: a value in the ZIP makes the
//   dashboard's field read-only.
// - The first upload creates the plugin; later ones must keep the `name` the portal shows for it.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2] || JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8')).version;
const demoUrl = process.env.DEMO_URL || '';
const repository = process.env.REPOSITORY || '';

// Until the portal gives the plugin an id of its own, its name is this; an update must keep the portal's.
const PACKAGE_NAME = process.env.PACKAGE_NAME || 'cubrik';
const MCP_SERVER = 'cubrik';
const MCP_URL = 'https://mcp.cubrik.ai/chatgpt/mcp';
/** The skills ChatGPT gets: all of them but the one about placing orders, which this door cannot do. */
const SKILLS = ['cubrik-setup', 'cubrik-agent-builder', 'cubrik-backtesting', 'cubrik-portfolio-check', 'cubrik-performance-review', 'cubrik-library', 'cubrik-skill-author'];

const longDescription = [
  'cubrik runs AI agents that trade the strategies you describe, on the brokers and exchanges you connect to your cubrik account. This plugin brings that account into ChatGPT.',
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
    expected_behavior: "Reports net result, trades and win rate by agent, the standout breakdown row, and Analytics' advice for each agent with its evidence, or says it has none yet when there are too few closed trades; offers to apply a piece of advice, and applies it only on confirmation.",
  },
  {
    description: 'Library search',
    // XRP, not gold (4 Nov 2026): the Library's agents are crypto ones, and a case must find something.
    prompt: 'Show me ready-made cubrik agents that trade XRP.',
    tools_triggered: 'search_library',
    expected_behavior: 'Lists Library agents trading XRP/USDT with their 12-month backtest return, drawdown and win rate; the Library cards render with Copy buttons; nothing is called recommended.',
  },
  {
    description: 'Create a watch-only agent',
    prompt: 'Set up an agent that tells me every morning at 8 how my open positions are doing.',
    tools_triggered: 'list_agents, create_agent, start_watch_agent',
    expected_behavior: 'Creates a paused agent with may_trade false and a daily 08:00 schedule, then starts it on confirmation; it places no orders. When the account already runs such a report, says so instead of making a duplicate.',
  },
];

const negative = [
  {
    description: 'Order placement: this version has no order tool, and connecting a platform does not add one. The assistant says cubrik cannot place the order and that it is placed in cubrik or on the platform itself.',
    prompt: 'Buy 1 BTC with 10x leverage on my Binance account.',
  },
  {
    description: 'Withdrawal: no transfer or withdrawal tool exists. The assistant says cubrik cannot transfer or withdraw funds and that the transfer is made on the exchange itself; nothing is sent.',
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
  ...(repository ? { repository } : {}),
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
        capabilities: [
          'Backtest trading ideas on historical candles',
          'Read balances and open positions',
          'Review results and Analytics advice',
          'Browse and copy ready-made agents',
          'Set up watch-only agents',
        ],
        websiteURL: 'https://cubrik.ai/en/mcp',
        supportURL: 'https://cubrik.ai/en/contact',
        privacyPolicyURL: 'https://cubrik.ai/en/legal/privacy',
        termsOfServiceURL: 'https://cubrik.ai/en/legal/terms',
        defaultPrompt: [
          'Backtest a 4h EMA 20/50 crossover on ETH over the last 12 months',
          'How are my cubrik agents doing this week?',
          'Show me ready-made agents that trade XRP',
        ],
        brandColor: '#7c3aed',
        composerIcon: './assets/icon.png',
        logo: './assets/logo.png',
      },
      // Runs after install: reads the account and walks the person to a first backtest or agent.
      onboardingSkill: './skills/cubrik-setup/SKILL.md',
      review: {
        test_cases: { positive, negative },
        ...(demoUrl ? { demo_recording_url: demoUrl } : {}),
        commerce: false,
        commerce_description: 'This plugin sells nothing and processes no payments: it shows no plans or prices and links to no checkout.',
      },
      publication: { release_notes: releaseNotes },
    },
  },
};

// The portal reads how to sign in from here, not from a form. The door's 401 names its protected
// resource metadata, and api.cubrik.ai's metadata offers both CIMD and DCR, the scopes and PKCE. The
// upload refuses OAuth that leaves the rest to that discovery all the same (6 Nov 2026: "Declare both
// authorizationUrl and tokenUrl for OAuth", then "Declare client.mode for OAuth"), though
// /plugins/build/plugins calls every one of them optional. So the endpoints are the ones api.cubrik.ai's
// metadata names, and the client is CIMD — the way ChatGPT's own connector signed in on 4 Nov — which
// still falls back to DCR. The portal's own sign-in comes back on
// https://platform.openai.com/apps-manage/oauth, which is on core-api's redirect allowlist.
// The portal's own sign-in (6 Nov) sends no `resource` and no `scope` at authorize — neither a
// `resource` here nor a `?resource=` in authorizationUrl changed that: its address is built from
// `POST /v1/dashapi/versions/<v>/mcp/link` with client id, callback, PKCE and state only. core-api
// therefore gives an OpenAI callback that names no door ChatGPT's (`unnamedDoorOf`, 99886197), whose
// scopes are read and agents. And no `resource` here at all: a finished scan rewrites the version's
// stored OAuth settings from discovery, which keeps none, and Reconnect then refuses with "The stored
// OAuth settings on this app version differ from its mcp.json declaration". For the same reason the
// default scopes are written out as discovery stores them: the ChatGPT door's, read and agents.
const OAUTH = {
  type: 'oauth',
  client: { mode: 'cimd' },
  authorizationUrl: 'https://api.cubrik.ai/oauth/authorize',
  tokenUrl: 'https://api.cubrik.ai/oauth/token',
  defaultScopes: ['cubrik.read', 'cubrik.agents'],
};
const mcp = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
  mcpServers: {
    [MCP_SERVER]: { type: 'streamable-http', url: MCP_URL, extensions: { 'com.openai': { auth: OAUTH } } },
  },
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
if (ui.capabilities.length > 20 || ui.capabilities.some((c) => !oneLine(c) || c.length > 120)) problems.push('capabilities');
const onboarding = manifest.extensions['com.openai'].onboardingSkill;
if (!SKILLS.some((skill) => onboarding === `./skills/${skill}/SKILL.md`)) problems.push('onboardingSkill is not a packaged skill');
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
