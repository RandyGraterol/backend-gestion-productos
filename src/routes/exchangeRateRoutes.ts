import { Router } from 'express';
import { getExchangeRate } from '../controllers/exchangeRateController';

const router = Router();

/**
 * GET /api/exchange-rate
 * Returns current BCV and USDT exchange rates for USD→VES
 */
router.get('/', getExchangeRate);

export default router;
