import axios from 'axios';
import cron from 'node-cron';
import { resetAllManualRates } from './userService';

/**
 * Exchange Rate Service
 * Fetches BCV official, parallel, and EUR rates from dolarapi.com
 * Rate is fetched once daily at midnight and cached until the next update.
 */

const BASE_URL = 'https://ve.dolarapi.com/v1';

interface DolarApiRate {
  moneda: string;
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

export interface CachedRate {
  /** Official BCV rate (Bs per USD) */
  official: number | null;
  /** Parallel market rate (Bs per USD) */
  parallel: number | null;
  /** EUR to VES rate */
  eur: number | null;
  /** USD to EUR */
  usdToEur: number | null;
  updatedAt: string;
  fetchedDate: string;
}

let rateCache: CachedRate | null = null;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const todayStr = (): string => new Date().toISOString().split('T')[0];

/**
 * Fetch all exchange rates from dolarapi.com
 */
export const fetchExchangeRates = async (force: boolean = false): Promise<CachedRate> => {
  if (!force && rateCache && rateCache.fetchedDate === todayStr()) {
    console.log('📦 Returning cached exchange rates');
    return rateCache;
  }

  try {
    console.log('🌐 Fetching exchange rates from dolarapi.com...');

    // Fetch all three endpoints in parallel
    const [officialRes, parallelRes, eurRes] = await Promise.allSettled([
      axios.get<DolarApiRate>(`${BASE_URL}/dolares/oficial`, { timeout: 10000 }),
      axios.get<DolarApiRate>(`${BASE_URL}/dolares/paralelo`, { timeout: 10000 }),
      axios.get<DolarApiRate>(`${BASE_URL}/divisas/euro`, { timeout: 10000 }),
    ]);

    const official = officialRes.status === 'fulfilled' ? officialRes.value.data?.promedio : null;
    const parallel = parallelRes.status === 'fulfilled' ? parallelRes.value.data?.promedio : null;
    const eurRate = eurRes.status === 'fulfilled' ? eurRes.value.data?.venta : null;

    // Calculate USD→EUR if we have both rates
    let usdToEur: number | null = null;
    if (official && eurRate) {
      // eurRate is EUR→VES, official is USD→VES
      // So EUR→USD = official / eurRate
      usdToEur = round2(official / eurRate);
    }

    rateCache = {
      official: official ? round2(official) : null,
      parallel: parallel ? round2(parallel) : null,
      eur: eurRate ? round2(eurRate) : null,
      usdToEur,
      updatedAt: new Date().toISOString(),
      fetchedDate: todayStr(),
    };

    console.log(`✅ Rates: Official=${rateCache.official} Parallel=${rateCache.parallel} EUR=${rateCache.eur}`);
    return rateCache;
  } catch (error) {
    console.error('❌ Error fetching exchange rates:', error);

    if (rateCache) {
      console.warn('⚠️ Returning stale cached rates');
      return rateCache;
    }

    return {
      official: null,
      parallel: null,
      eur: null,
      usdToEur: null,
      updatedAt: new Date().toISOString(),
      fetchedDate: todayStr(),
    };
  }
};

/**
 * Get cached rates without triggering a fetch
 */
export const getCachedRates = (): CachedRate | null => rateCache;

/**
 * Schedule daily exchange rate update at midnight
 */
export const scheduleDailyRateUpdate = (): void => {
  fetchExchangeRates()
    .then((rate) => {
      console.log(`🗓️ Initial rates loaded: Official=${rate.official} Parallel=${rate.parallel}`);
    })
    .catch((err) => {
      console.error('❌ Failed to load initial rates:', err);
    });

  cron.schedule('0 0 * * *', async () => {
    console.log('🕛 Running scheduled exchange rate update...');
    try {
      // On Mondays, reset all manual exchange rates before fetching fresh ones
      const now = new Date();
      const caracasTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
      if (caracasTime.getDay() === 1) {
        console.log('🔄 Monday: resetting manual exchange rates...');
        const resetCount = await resetAllManualRates();
        console.log(`✅ Reset ${resetCount} manual exchange rates to auto`);
      }

      rateCache = null;
      const rate = await fetchExchangeRates();
      console.log(`✅ Daily rates updated: Official=${rate.official} Parallel=${rate.parallel}`);
    } catch (error) {
      console.error('❌ Failed scheduled rate update:', error);
    }
  }, {
    timezone: 'America/Caracas',
  });

  console.log('📅 Daily exchange rate scheduler registered (00:00 America/Caracas)');
};
