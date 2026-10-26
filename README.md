# cubrik MCP

Use your [cubrik](https://cubrik.ai) account from Claude, ChatGPT, Claude Code, Codex, Cursor,
VS Code, Gemini CLI and any app that speaks the Model Context Protocol: create, test and run AI
trading agents on the brokers you connected, backtest ideas on historical candles, read your
portfolio, results and Analytics, copy ready-made agents from the Library, and trade on your
connected platforms.

```
https://mcp.cubrik.ai/mcp
```

Sign in with your cubrik account (OAuth) the first time the app calls it; there is no key to copy.
Every cubrik plan includes it, the free Demo plan too. Your plan's limits apply as they do in cubrik.

## Install

**Claude** (claude.ai, desktop, phone) — Settings → Connectors → Add custom connector, paste the
address.

**Claude Code** — as a plugin, with the skills:

```bash
/plugin marketplace add target1m/cubrik-mcp
/plugin install cubrik@cubrik-mcp
```

or just the server:

```bash
claude mcp add --transport http cubrik https://mcp.cubrik.ai/mcp
```

then `/mcp` to sign in.

**ChatGPT** — Settings → Apps → turn on developer mode, then create an app with the address (on the
ChatGPT plans that allow custom apps). The version listed in ChatGPT's app directory uses
`https://mcp.cubrik.ai/chatgpt/mcp` and places no orders.

**Codex** — `codex plugin add target1m/cubrik-mcp`, or add the server to `~/.codex/config.toml`:

```toml
[mcp_servers.cubrik]
url = "https://mcp.cubrik.ai/mcp"
```

**Cursor** — Settings → MCP → Add, or this repository as a plugin (`.cursor-plugin/`).

**VS Code** — run “MCP: Add Server”, choose HTTP, paste the address.

**Gemini CLI** — `gemini extensions install https://github.com/target1m/cubrik-mcp`.

## What it can do

| Area | Tools |
|---|---|
| Account and portfolio | `get_account`, `list_platforms`, `get_portfolio`, `get_trade_history`, `get_trading_results`, `connect_platform` |
| Agents | `list_agents`, `get_agent`, `get_agent_runs`, `list_agent_templates`, `create_agent`, `update_agent`, `start_agent`, `pause_agent`, `pause_all_agents`, `test_agent`, `run_agent_now`, `delete_agent` |
| Backtests | `run_backtest`, `get_backtest`, `check_rules_now` |
| Library | `search_library`, `get_library_agent`, `copy_library_agent` |
| Analytics | `get_analysis`, `get_advice`, `apply_advice` |
| Markets | `get_price`, `get_candles`, `list_instruments`, `get_news`, `get_economic_calendar`, `get_market_overview` |
| Notifications and runs | `list_notifications`, `mark_notifications_read`, `get_conversation` |
| Skills | `list_skills`, `get_skill`, `save_skill`, `delete_skill` |
| Your brokers | each connected platform's own tools, as `<platform>_<tool>` — balances, positions, orders, stops, closing |

In Claude and ChatGPT, backtests, agents, the portfolio, the Library and Analytics appear as
interactive cards. Prompts: `daily_brief`, `new_agent`, `backtest_idea`, `weekly_review`,
`emergency_stop`.

## Skills

| Skill | What it does |
|---|---|
| `cubrik-setup` | First steps: the account, the plan, connecting a platform |
| `cubrik-agent-builder` | An idea → questions → backtest → a paused agent → started on your word |
| `cubrik-backtesting` | Rules written right, run, and read honestly |
| `cubrik-portfolio-check` | Balances, positions, agents and what is coming up |
| `cubrik-performance-review` | Results, Analytics and advice you can apply |
| `cubrik-library` | Find, compare and copy ready-made agents |
| `cubrik-trading` | Orders, stops and closing positions, platform by platform |
| `cubrik-skill-author` | Write and save your own cubrik skills |

## Safety

- You choose what each app may do when you sign it in: read, manage agents, trade.
- No tool moves money into or out of any account.
- Your broker keys stay with cubrik; the app gets a cubrik token for what you allowed.
- Disconnect any app at any time: cubrik → Settings → AI apps.

Trading carries a risk of losing capital. cubrik is software that runs strategies you define; it
does not give investment advice. Past results, backtests included, do not predict future ones.

[Privacy](https://cubrik.ai/en/legal/privacy) · [Terms](https://cubrik.ai/en/legal/terms) ·
[help@cubrik.ai](mailto:help@cubrik.ai)
