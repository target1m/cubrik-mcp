# Platform notes

What each platform's tools do differently. The tool's own description and schema are always the
final word; these are the cases where a valid-looking call is refused or does something unexpected.

## Hyperliquid

- **The account is the account's address; the key is an API wallet's.** Reads are about the
  account. If balances read as empty, the connection may be on the API wallet's own address — the
  user fixes it in cubrik.
- **No true market order.** A market order is an IOC limit set about 5% through the current mid.
  It fills like a market order in normal conditions.
- **Minimum order value: 10 USDC**, measured as size × price (not margin). A 0.0001 BTC order is
  refused.
- **HIP-3 markets** (stocks, indices, commodities, currencies — e.g. `xyz:TSLA`) live on separate
  perp dexes, each margined in its own collateral (USDC, USDH, USDE, USDT0), and **most take
  isolated margin only**. A cross order on them is refused.
- **Unified accounts** margin every perpetual from the spot balance: a dex's balance shows only its
  positions' margin; a resting HIP-3 order shows in the collateral's spot "hold".

## Binance

- One key covers spot and USDⓈ-M futures; writes only work in the books the key allows.
- Stops and targets are placed on Binance's algo (conditional) order service, so they appear as
  separate orders, not as fields on the position.
- Closed trades are priced by Binance's own realised P&L.

## OKX

- Positions may be in net mode, where the position's size is signed and the side reads "net": the
  sign tells long from short.

## MoonX

- On the **Unified Balance**, opening tools bring what an order needs from the user's other wallets
  automatically: size against the unified available balance. Other accounts trade from what the
  futures or forex wallet already holds.
- If an order fails for insufficient balance, say so; deposits happen in MoonX, not here.

## MetaTrader 4 / 5 (through MetaApi)

- Sizes are in **lots**; check the symbol's contract size and minimum lot first.
- Stops and targets are prices. A modify call that carries a comment can be refused by some
  brokers: change only the stop or target.
- Markets follow the broker's session hours; an order outside them is refused.

## Bitget, Kraken, Coinbase

- Spot and futures availability depends on the key's permissions; a book the key cannot write is
  refused, not silently ignored.
