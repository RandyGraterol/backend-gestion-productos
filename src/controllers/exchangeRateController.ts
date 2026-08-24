import { Request, Response } from 'express';
import { fetchExchangeRates } from '../services/exchangeRateService';

/**
 * GET /api/exchange-rate
 * Returns official, parallel, and EUR exchange rates.
 */
export const getExchangeRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const force = req.query.force === 'true';
    const rates = await fetchExchangeRates(force);

    res.json({
      success: true,
      data: {
        bcv: rates.official,
        official: rates.official,
        parallel: rates.parallel,
        eur: rates.eur,
        usdToEur: rates.usdToEur,
        updatedAt: rates.updatedAt,
        fetchedDate: rates.fetchedDate,
        source: 've.dolarapi.com',
        currency: 'VES',
        base: 'USD',
      },
    });
  } catch (error) {
    console.error('Error in getExchangeRate controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rates.',
    });
  }
};
