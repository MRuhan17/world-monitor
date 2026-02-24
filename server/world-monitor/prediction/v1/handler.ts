import type { PredictionServiceHandler } from '../../../../src/generated/server/world-monitor/prediction/v1/service_server';

import { listPredictionMarkets } from './list-prediction-markets';

export const predictionHandler: PredictionServiceHandler = {
  listPredictionMarkets,
};

