import axios from 'axios';
import cron from 'node-cron';

/**
 * Exchange Rate Service
 * Fetches BCV (Banco Central de Venezuela) exchange rate from alcambio.app's GraphQL API.
 * Rate is fetched once daily at midnight (00:00) and cached until the next update.
 */

const DOLAR_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

interface DolarApiResponse {
  moneda: string;
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

export interface CachedRate {
  bcv: number | null;
  updatedAt: string;
  fetchedDate: string; // YYYY-MM-DD of the day it was fetched
}

let rateCache: CachedRate | null = null;

/**
 * Round to exactly 2 decimal places
 */
const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Get today's date string YYYY-MM-DD
 */
const todayStr = (): string => new Date().toISOString().split('T')[0];

/**
 * Fetch exchange rates from dolarapi.com
 */
export const fetchExchangeRates = async (force: boolean = false): Promise<CachedRate> => {
  // Return cached data if it was fetched today and force is false
  if (!force && rateCache && rateCache.fetchedDate === todayStr()) {
    console.log('📦 Returning today\'s cached exchange rate (BCV):', rateCache.bcv);
    return rateCache;
  }

  try {
    console.log('🌐 Fetching official BCV exchange rate from dolarapi.com...');

    const response = await axios.get<DolarApiResponse>(DOLAR_API_URL, {
      timeout: 10000,
    });

    const bcvRate = response.data?.promedio;

    rateCache = {
      bcv: bcvRate ? round2(bcvRate) : null,
      updatedAt: new Date().toISOString(),
      fetchedDate: todayStr(),
    };

    console.log(`✅ Exchange rate fetched: BCV=${rateCache.bcv} Bs/USD (${rateCache.fetchedDate})`);
    return rateCache;
  } catch (error) {
    console.error('❌ Error fetching exchange rates from dolarapi.com:', error);

    // Return stale cache if available (better than nothing)
    if (rateCache) {
      console.warn('⚠️  Returning stale cached exchange rate due to fetch error');
      return rateCache;
    }

    // Return fallback if no cache at all
    return {
      bcv: null,
      updatedAt: new Date().toISOString(),
      fetchedDate: todayStr(),
    };
  }
};

/**
 * Get the cached exchange rate data without triggering a fetch
 */
export const getCachedRates = (): CachedRate | null => rateCache;

/**
 * Schedule a daily exchange rate update at midnight (00:00)
 * Also performs an initial fetch immediately on call.
 */
export const scheduleDailyRateUpdate = (): void => {
  // Fetch immediately on server start
  fetchExchangeRates()
    .then((rate) => {
      console.log(`🗓️  Initial exchange rate loaded: BCV=${rate.bcv} Bs/USD`);
    })
    .catch((err) => {
      console.error('❌ Failed to load initial exchange rate:', err);
    });

  // Schedule daily update at 00:00 (midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('🕛 Running scheduled daily exchange rate update...');
    try {
      // Clear cache to force a fresh fetch
      rateCache = null;
      const rate = await fetchExchangeRates();
      console.log(`✅ Daily exchange rate updated: BCV=${rate.bcv} Bs/USD`);
    } catch (error) {
      console.error('❌ Failed scheduled exchange rate update:', error);
    }
  }, {
    timezone: 'America/Caracas',
  });

  console.log('📅 Daily exchange rate scheduler registered (00:00 America/Caracas)');
};
