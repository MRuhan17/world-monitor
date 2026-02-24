import type { AviationServiceHandler } from '../../../../src/generated/server/world-monitor/aviation/v1/service_server';

import { listAirportDelays } from './list-airport-delays';

export const aviationHandler: AviationServiceHandler = {
  listAirportDelays,
};

