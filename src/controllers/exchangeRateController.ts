import { Request, Response } from 'express';
import { fetchExchangeRates } from '../services/exchangeRateService';

/**
 * GET /api/exchange-rate
 * Returns the current BCV exchange rate (VES per USD).
 * Rate is updated daily at midnight and rounded to 2 decimal places.
 */
export const getExchangeRate = async (req: Request, res: Response): Promise<void> => {
  try {
    const force = req.query.force === 'true';
    const rates = await fetchExchangeRates(force);

    res.json({
      success: true,
      data: {
        bcv: rates.bcv,
        updatedAt: rates.updatedAt,
        fetchedDate: rates.fetchedDate,
        source: 'alcambio.app',
        currency: 'VES', // Venezuelan Bolívares
        base: 'USD',
      },
    });
  } catch (error) {
    console.error('Error in getExchangeRate controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exchange rates. Please try again later.',
    });
  }
};
