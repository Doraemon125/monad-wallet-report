/**
 * Vercel Serverless Function
 *
 * Proxies Etherscan V2 requests so ETHERSCAN_API_KEY never reaches the
 * browser bundle. Configure ETHERSCAN_API_KEY in Vercel Environment Variables.
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== 'GET') {
      return Response.json(
        {
          status: '0',
          message: 'Method not allowed',
          result: 'Only GET is supported'
        },
        { status: 405 }
      );
    }

    const apiKey = process.env.ETHERSCAN_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          status: '0',
          message: 'Server configuration error',
          result: 'ETHERSCAN_API_KEY is not configured'
        },
        { status: 500 }
      );
    }

    const allowedParams = [
      'chainid',
      'module',
      'action',
      'address',
      'startblock',
      'endblock',
      'page',
      'offset',
      'sort'
    ];

    const query = new URLSearchParams();

    for (const key of allowedParams) {
      const value = url.searchParams.get(key);

      if (value) {
        query.set(key, value);
      }
    }

    query.set('apikey', apiKey);

    const response = await fetch(
      `https://api.etherscan.io/v2/api?${query.toString()}`
    );

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
