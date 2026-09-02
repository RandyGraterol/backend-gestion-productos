import { Response } from 'express';
import { fetchExchangeRates } from '../services/exchangeRateService';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import User from '../models/User';

/**
 * GET /api/exchange-rate
 * Returns official, parallel, and EUR exchange rates.
 * If the authenticated user has exchangeRateMode='manual', returns their custom rate.
 */
export const getExchangeRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const force = req.query.force === 'true';

    // Try to get authenticated user's custom rate
    let customRate: number | null = null;
    let isCustom = false;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token) as { id: string } | null;
        if (decoded?.id) {
          const user = await User.findByPk(decoded.id, {
            attributes: ['exchangeRateMode', 'customExchangeRate', 'isActive'],
          });
          if (user && user.isActive && user.exchangeRateMode === 'manual' && user.customExchangeRate) {
            customRate = parseFloat(user.customExchangeRate.toString());
            isCustom = true;
          }
        }
      } catch {
        // Invalid token — proceed with API rate
      }
    }

    if (isCustom && customRate !== null) {
      res.json({
        success: true,
        data: {
          bcv: customRate,
          official: customRate,
          parallel: null,
          eur: null,
          usdToEur: null,
          updatedAt: new Date().toISOString(),
          fetchedDate: new Date().toISOString().split('T')[0],
          source: 'manual',
          currency: 'VES',
          base: 'USD',
          isCustom: true,
        },
      });
      return;
    }

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
        isCustom: false,
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
