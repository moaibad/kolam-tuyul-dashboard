import type {
  CalendarPositionPnl,
  PortfolioCalendarMonth,
} from "@/lib/portfolio-calendar";

const positions = {
  eth: positionBase("eth-usdc-v4", "ETH / USDC", 1, "Ethereum", "uniswapv4", "Uniswap", "v4"),
  wbtc: positionBase("wbtc-usdc-v3", "WBTC / USDC", 42161, "Arbitrum One", "uniswapv3", "Uniswap", "v3"),
  arb: positionBase("arb-eth-v3", "ARB / ETH", 42161, "Arbitrum One", "camelotv3", "Camelot", "v3"),
  index: positionBase("index-usdg-v4", "INDEX / USDG", 4663, "Robinhood Chain", "uniswapv4", "Uniswap", "v4"),
} as const;

function positionBase(
  id: string,
  pair: string,
  chainId: number,
  chainName: string,
  protocolKey: string,
  protocolName: string,
  protocolVersion: string,
) {
  return { id, pair, chainId, chainName, protocolKey, protocolName, protocolVersion };
}

function position(
  base: Omit<CalendarPositionPnl, "pnl">,
  pnl: number,
  index: number,
): CalendarPositionPnl {
  const depositedUsdg = 800 + index * 250;
  const claimedFeesUsdg = Math.max(4, Math.abs(pnl) * 0.18);
  return {
    ...base,
    pnl,
    kind: "closure",
    depositedUsdg,
    withdrawnUsdg: depositedUsdg + pnl - claimedFeesUsdg,
    claimedFeesUsdg,
  };
}

const july: Array<[number, number[]]> = [
  [1, [32.4, 18.2, -7.6]],
  [2, [46.8, -11.2, 9.5]],
  [3, [-28.4, -16.7, 5.2]],
  [5, [62.3, 24.5, 11.8]],
  [6, [39.6, 18.4, -8.1]],
  [7, [71.2, 33.8, 14.6]],
  [8, [-42.5, 12.6, -9.4]],
  [9, [54.7, 22.3, 8.9]],
  [10, [24.2, -6.8, 5.1]],
  [12, [-18.6, -12.1, 4.4]],
  [13, [65.4, 28.7, 12.3]],
  [14, [88.5, 36.2, 18.4]],
  [15, [42.8, 16.5, 7.2]],
  [16, [-31.7, -9.8, 6.4]],
  [17, [47.6, 19.9, 10.1]],
  [19, [73.4, 29.8, 15.2]],
  [20, [34.1, 12.6, -4.7]],
  [21, [-56.8, -21.4, 8.9]],
  [22, [91.7, 41.2, 17.8]],
  [23, [58.3, 22.6, 13.4]],
  [24, [26.8, 10.3, 4.6]],
  [25, [-37.4, -14.8, 6.1]],
  [26, [68.9, 25.7, 12.5]],
];

function createDays(
  yearMonth: string,
  values: Array<[number, number[]]>,
) {
  const bases = [positions.eth, positions.wbtc, positions.arb, positions.index];
  return values.map(([day, pnlValues]) => ({
    date: `${yearMonth}-${String(day).padStart(2, "0")}`,
    positions: pnlValues.map((pnl, index) =>
      position(bases[index], pnl, index),
    ),
  }));
}

export const portfolioCalendarMock: PortfolioCalendarMonth[] = [
  {
    month: "2026-06",
    days: createDays("2026-06", [
      [2, [31.2, 14.8, -5.4]],
      [4, [48.6, 21.1, 7.2]],
      [7, [-26.4, -12.8, 4.1]],
      [9, [62.7, 28.4, 9.8]],
      [13, [37.5, 16.2, 5.7]],
      [17, [-41.8, -18.2, 6.3]],
      [20, [74.2, 31.6, 11.4]],
      [23, [46.9, 19.7, 7.8]],
      [27, [58.4, 24.1, 8.6]],
    ]),
  },
  { month: "2026-07", days: createDays("2026-07", july) },
  {
    month: "2026-08",
    days: createDays("2026-08", [
      [1, [42.1, 17.4, 6.8]],
      [3, [-19.7, -8.5, 3.2]],
      [5, [56.8, 22.9, 8.7]],
      [8, [71.4, 29.6, 12.1]],
      [11, [-33.2, -14.1, 5.6]],
      [14, [64.9, 27.2, 10.4]],
    ]),
  },
];
