const UPSTREAM =
  "https://api.krystal.app/all/v2/lp/userPositions";

const ALLOWED_PARAMS = [
  "addresses",
  "walletAddress",
  "chainIds",
  "quoteSymbols",
  "offset",
  "limit",
  "orderBy",
  "positionStatus",
  "isIncludeSpamPosition",
  "refreshAll",
];

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function errorResponse(message, status = 400) {
  return Response.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function isInteger(value, min, max) {
  if (!/^(0|[1-9]\d*)$/.test(value ?? "")) return false;

  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max;
}

const worker = {
  async fetch(request) {
    const incoming = new URL(request.url);

    if (incoming.pathname !== "/user-positions") {
      return errorResponse("Not found.", 404);
    }

    if (request.method !== "GET") {
      return errorResponse("Method not allowed.", 405);
    }

    for (const name of incoming.searchParams.keys()) {
      if (!ALLOWED_PARAMS.includes(name)) {
        return errorResponse(`Unsupported parameter: ${name}`);
      }

      if (incoming.searchParams.getAll(name).length !== 1) {
        return errorResponse(`Duplicate parameter: ${name}`);
      }
    }

    const addresses = incoming.searchParams.get("addresses");
    const walletAddress = incoming.searchParams.get("walletAddress");
    const chainIds = incoming.searchParams.get("chainIds");
    const quoteSymbols = incoming.searchParams.get("quoteSymbols");
    const offset = incoming.searchParams.get("offset");
    const limit = incoming.searchParams.get("limit");
    const orderBy = incoming.searchParams.get("orderBy");
    const positionStatus = incoming.searchParams.get("positionStatus");
    const includeSpam = incoming.searchParams.get(
      "isIncludeSpamPosition",
    );
    const refreshAll = incoming.searchParams.get("refreshAll");

    if (
      !addresses ||
      !walletAddress ||
      !ADDRESS_PATTERN.test(addresses) ||
      !ADDRESS_PATTERN.test(walletAddress) ||
      addresses.toLowerCase() !== walletAddress.toLowerCase()
    ) {
      return errorResponse("Invalid wallet address.");
    }

    if (chainIds !== "4663" || quoteSymbols !== "usd") {
      return errorResponse("Unsupported chain or quote symbol.");
    }

    if (!isInteger(offset, 0, Number.MAX_SAFE_INTEGER)) {
      return errorResponse("Invalid offset.");
    }

    if (!isInteger(limit, 1, 500)) {
      return errorResponse("Invalid limit.");
    }

    const validPositionRequest =
      (positionStatus === "open" && orderBy === "liquidity") ||
      (positionStatus === "closed" && orderBy === "lastAction");

    if (!validPositionRequest) {
      return errorResponse("Invalid position status or ordering.");
    }

    if (
      includeSpam !== "false" ||
      !["true", "false"].includes(refreshAll ?? "")
    ) {
      return errorResponse("Invalid boolean parameter.");
    }

    const upstreamUrl = new URL(UPSTREAM);

    for (const name of ALLOWED_PARAMS) {
      upstreamUrl.searchParams.set(
        name,
        incoming.searchParams.get(name),
      );
    }

    try {
      const response = await fetch(upstreamUrl, {
        headers: { Accept: "application/json" },
      });

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type":
            response.headers.get("Content-Type") ??
            "application/json",
          "Cache-Control": "no-store",
          "X-Upstream-Status": String(response.status),
        },
      });
    } catch (cause) {
      return errorResponse(
        cause instanceof Error ? cause.message : "Upstream failed.",
        502,
      );
    }
  },
};

export default worker;
