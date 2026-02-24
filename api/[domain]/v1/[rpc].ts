/**
 * Vercel edge function for sebuf RPC routes.
 *
 * Matches /api/{domain}/v1/{rpc} via Vercel dynamic segment routing.
 * CORS headers are applied to every response (200, 204, 403, 404).
 */

export const config = { runtime: 'edge' };

import { createRouter } from '../../../server/router';
import { getCorsHeaders, isDisallowedOrigin } from '../../../server/cors';
// @ts-expect-error — JS module, no declaration file
import { validateApiKey } from '../../_api-key.js';
import { mapErrorToResponse } from '../../../server/error-mapper';
import { createSeismologyServiceRoutes } from '../../../src/generated/server/world-monitor/seismology/v1/service_server';
import { seismologyHandler } from '../../../server/world-monitor/seismology/v1/handler';
import { createWildfireServiceRoutes } from '../../../src/generated/server/world-monitor/wildfire/v1/service_server';
import { wildfireHandler } from '../../../server/world-monitor/wildfire/v1/handler';
import { createClimateServiceRoutes } from '../../../src/generated/server/world-monitor/climate/v1/service_server';
import { climateHandler } from '../../../server/world-monitor/climate/v1/handler';
import { createPredictionServiceRoutes } from '../../../src/generated/server/world-monitor/prediction/v1/service_server';
import { predictionHandler } from '../../../server/world-monitor/prediction/v1/handler';
import { createDisplacementServiceRoutes } from '../../../src/generated/server/world-monitor/displacement/v1/service_server';
import { displacementHandler } from '../../../server/world-monitor/displacement/v1/handler';
import { createAviationServiceRoutes } from '../../../src/generated/server/world-monitor/aviation/v1/service_server';
import { aviationHandler } from '../../../server/world-monitor/aviation/v1/handler';
import { createResearchServiceRoutes } from '../../../src/generated/server/world-monitor/research/v1/service_server';
import { researchHandler } from '../../../server/world-monitor/research/v1/handler';
import { createUnrestServiceRoutes } from '../../../src/generated/server/world-monitor/unrest/v1/service_server';
import { unrestHandler } from '../../../server/world-monitor/unrest/v1/handler';
import { createConflictServiceRoutes } from '../../../src/generated/server/world-monitor/conflict/v1/service_server';
import { conflictHandler } from '../../../server/world-monitor/conflict/v1/handler';
import { createMaritimeServiceRoutes } from '../../../src/generated/server/world-monitor/maritime/v1/service_server';
import { maritimeHandler } from '../../../server/world-monitor/maritime/v1/handler';
import { createCyberServiceRoutes } from '../../../src/generated/server/world-monitor/cyber/v1/service_server';
import { cyberHandler } from '../../../server/world-monitor/cyber/v1/handler';
import { createEconomicServiceRoutes } from '../../../src/generated/server/world-monitor/economic/v1/service_server';
import { economicHandler } from '../../../server/world-monitor/economic/v1/handler';
import { createInfrastructureServiceRoutes } from '../../../src/generated/server/world-monitor/infrastructure/v1/service_server';
import { infrastructureHandler } from '../../../server/world-monitor/infrastructure/v1/handler';
import { createMarketServiceRoutes } from '../../../src/generated/server/world-monitor/market/v1/service_server';
import { marketHandler } from '../../../server/world-monitor/market/v1/handler';
import { createNewsServiceRoutes } from '../../../src/generated/server/world-monitor/news/v1/service_server';
import { newsHandler } from '../../../server/world-monitor/news/v1/handler';
import { createIntelligenceServiceRoutes } from '../../../src/generated/server/world-monitor/intelligence/v1/service_server';
import { intelligenceHandler } from '../../../server/world-monitor/intelligence/v1/handler';
import { createMilitaryServiceRoutes } from '../../../src/generated/server/world-monitor/military/v1/service_server';
import { militaryHandler } from '../../../server/world-monitor/military/v1/handler';

import type { ServerOptions } from '../../../src/generated/server/world-monitor/seismology/v1/service_server';

const serverOptions: ServerOptions = { onError: mapErrorToResponse };

const allRoutes = [
  ...createSeismologyServiceRoutes(seismologyHandler, serverOptions),
  ...createWildfireServiceRoutes(wildfireHandler, serverOptions),
  ...createClimateServiceRoutes(climateHandler, serverOptions),
  ...createPredictionServiceRoutes(predictionHandler, serverOptions),
  ...createDisplacementServiceRoutes(displacementHandler, serverOptions),
  ...createAviationServiceRoutes(aviationHandler, serverOptions),
  ...createResearchServiceRoutes(researchHandler, serverOptions),
  ...createUnrestServiceRoutes(unrestHandler, serverOptions),
  ...createConflictServiceRoutes(conflictHandler, serverOptions),
  ...createMaritimeServiceRoutes(maritimeHandler, serverOptions),
  ...createCyberServiceRoutes(cyberHandler, serverOptions),
  ...createEconomicServiceRoutes(economicHandler, serverOptions),
  ...createInfrastructureServiceRoutes(infrastructureHandler, serverOptions),
  ...createMarketServiceRoutes(marketHandler, serverOptions),
  ...createNewsServiceRoutes(newsHandler, serverOptions),
  ...createIntelligenceServiceRoutes(intelligenceHandler, serverOptions),
  ...createMilitaryServiceRoutes(militaryHandler, serverOptions),
];

const router = createRouter(allRoutes);

export default async function handler(request: Request): Promise<Response> {
  // Origin check first — skip CORS headers for disallowed origins (M-2 fix)
  if (isDisallowedOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(request);
  } catch {
    corsHeaders = { 'Access-Control-Allow-Origin': '*' };
  }

  // OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // API key validation (origin-aware)
  const keyCheck = validateApiKey(request);
  if (keyCheck.required && !keyCheck.valid) {
    return new Response(JSON.stringify({ error: keyCheck.error }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Route matching
  const matchedHandler = router.match(request);
  if (!matchedHandler) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Execute handler with top-level error boundary (H-1 fix)
  let response: Response;
  try {
    response = await matchedHandler(request);
  } catch (err) {
    console.error('[gateway] Unhandled handler error:', err);
    response = new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Merge CORS headers into response
  const mergedHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    mergedHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders,
  });
}
