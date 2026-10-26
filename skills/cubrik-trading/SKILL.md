---
name: cubrik-trading
description: Place, change and close orders on the brokers and exchanges the user connected to cubrik, through each platform's own tools (named <platform>_<tool>, e.g. hyperliquid_place_futures_order, okx_set_futures_tp_sl). Use when the user explicitly asks to open or close a position, place a limit order, set or move a stop-loss or take-profit, cancel an order, or change leverage on a connected platform. Restates every order in one line before sending it, checks the platform's minimums and rules, and never trades on its own initiative.
---

cubrik passes the user's connected platforms' own tools through, on the full server
(`mcp.cubrik.ai/mcp`) and only with the trade permission. They act on the user's real account with
real money. You place an order only because the user asked for that order.

## 1. Know what you are trading on

- `list_platforms` — which platforms are connected and their ids.
- `get_portfolio` — balances and open positions, so you know the free margin and what is already open.
- The platform's own tools appear as `<platform>_<tool>`: for example `<platform>_list_futures_positions`,
  `<platform>_place_futures_order`, `<platform>_set_futures_tp_sl`, `<platform>_close_futures_position`,
  `<platform>_cancel_futures_order`, and their spot and CFD counterparts. Read the tool's own
  description and schema before the first call: platforms differ in units (contracts, coins, lots,
  USDT), in how a stop is expressed (a price, or a percentage whose direction is in the field's
  name) and in what they refuse.

## 2. Settle the order completely

Before any write, the order must have: platform, market, side, size (in the unit the tool takes),
order type and price for a limit, leverage and margin mode where it applies, stop and target if the
user wants them. Ask for what is missing in one message. Never choose a size, a leverage or a margin
mode for the user. When they give a stop or target as a percentage, compute the absolute price and
show it.

Then restate it in one line — "Hyperliquid: buy 0.02 BTC-PERP at market, 5× isolated, stop 91,200,
target 98,000" — and send it. Most AI apps also ask the user before running a tool that changes
something; that is the app's confirmation, not a substitute for a settled order.

## 3. After the call

Read the answer: report the fill (price, size) or the refusal exactly as the platform gave it. A
refusal is not retried with a different size or leverage unless the user says so. Confirm a new
stop or target by reading the positions or orders back.

## Platform notes

Details per platform — minimum sizes, missing order types, isolated-only markets, unified
balances — are in `references/platform-notes.md`. Read the section for the platform before its
first order in a conversation.

## Rules

- No order without the user's explicit request for that order in this conversation. An agent's
  trades are the agent's: do not "help" an agent by trading beside it.
- Never move money: there is no deposit, withdrawal or transfer tool, and do not look for one.
- Never widen a stop or remove one on your own; a stop only moves when the user says so.
- Leverage multiplies losses as well as gains: when the user picks high leverage, state the
  approximate distance to liquidation in one line, once.
- This is execution of the user's own decision, not advice.
