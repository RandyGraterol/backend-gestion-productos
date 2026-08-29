/**
 * Tests: Stock Movement Exchange Rate Handling
 *
 * Verifies that createStockMovement:
 *  1. Uses the cached rate when available
 *  2. Fetches fresh rates when cache is empty (null / official=null)
 *  3. Calculates totalAmountUSD correctly based on product currency + rate
 *  4. Falls back to rate=1 only if fetch also fails
 *
 * Uses mocked DB layer — no SQLite/Postgres required.
 */

// ─── Mock ALL heavy modules before any imports ──────────────────

jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn(),
    }),
    getQueryInterface: jest.fn(),
    authenticate: jest.fn(),
    close: jest.fn(),
  },
}));

// Mock models to return lightweight fakes
const mockProductData = new Map<string, any>();
const mockMovementItems: any[] = [];
let mockMovementId = 0;

jest.mock('../../models', () => {
  return {
    StockMovement: {
      create: jest.fn(async (data: any, _opts?: any) => {
        mockMovementId++;
        const id = `mov-${mockMovementId}`;
        return {
          id,
          ...data,
          toJSON() { return { id, ...this }; },
          reload: jest.fn(async () => {}),
        };
      }),
      findOne: jest.fn(),
      findAndCountAll: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      destroy: jest.fn(),
    },
    StockMovementItem: {
      create: jest.fn(async (data: any) => {
        const item = { ...data, id: `item-${Date.now()}-${Math.random()}` };
        mockMovementItems.push(item);
        return { ...item, toJSON() { return item; } };
      }),
      findAll: jest.fn(async () => []),
      destroy: jest.fn(),
    },
    Product: {
      create: jest.fn(async (data: any) => {
        const id = `prod-${Date.now()}-${Math.random()}`;
        const product = { id, ...data, stock: data.stock ?? 100 };
        mockProductData.set(id, product);
        return {
          ...product,
          update: jest.fn(async (updates: any) => {
            Object.assign(product, updates);
          }),
          reload: jest.fn(async () => {}),
          toJSON() { return product; },
        };
      }),
      findAll: jest.fn(async (opts: any) => {
        // Return products matching the where.id array
        const ids = opts?.where?.id?.in || opts?.where?.id || [];
        return Array.from(mockProductData.values()).filter(
          (p: any) => ids.includes(p.id) || (opts?.where?.userId && p.userId === opts.where.userId)
        );
      }),
      findOne: jest.fn(),
      destroy: jest.fn(async () => { mockProductData.clear(); }),
    },
    Category: {
      create: jest.fn(async (data: any) => ({ id: 'cat-1', ...data })),
      destroy: jest.fn(),
    },
    User: {
      create: jest.fn(async (data: any) => ({ id: 'user-1', ...data })),
      destroy: jest.fn(),
    },
    Notification: { findAll: jest.fn(), destroy: jest.fn() },
    AppVersion: { findAll: jest.fn(), destroy: jest.fn() },
    MembershipPayment: { findAll: jest.fn(), destroy: jest.fn() },
    ProductImage: { findAll: jest.fn(), destroy: jest.fn() },
    DonationMethod: { findAll: jest.fn() },
    Donation: { findAll: jest.fn() },
    DownloadLog: { findAll: jest.fn() },
    DownloadVerification: { findAll: jest.fn() },
    ContactMessage: { findAll: jest.fn() },
  };
});

jest.mock('../../services/notificationService', () => ({
  notifyMovementSummary: jest.fn(),
  getIO: jest.fn(() => null),
}));

// Mock exchange rate service — controllable per test
const mockGetCachedRates = jest.fn();
const mockFetchExchangeRates = jest.fn();

jest.mock('../../services/exchangeRateService', () => ({
  get getCachedRates() { return mockGetCachedRates; },
  get fetchExchangeRates() { return mockFetchExchangeRates; },
}));

// ─── NOW import the service under test ──────────────────────────

import * as stockService from '../stockService';
import { Product } from '../../models';

// ─── Helpers ─────────────────────────────────────────────────────

function makeRate(rate: number) {
  return {
    official: rate,
    parallel: rate + 0.5,
    eur: rate * 1.2,
    usdToEur: 0.87,
    updatedAt: new Date().toISOString(),
    fetchedDate: new Date().toISOString().split('T')[0],
  };
}

function makeNullRate() {
  return {
    official: null,
    parallel: null,
    eur: null,
    usdToEur: null,
    updatedAt: new Date().toISOString(),
    fetchedDate: new Date().toISOString().split('T')[0],
  };
}

function seedProduct(overrides: Record<string, any> = {}) {
  const id = overrides.id || `prod-${Date.now()}-${Math.random()}`;
  const product = {
    id,
    sku: 'SKU-TEST',
    name: 'Test Product',
    price: 100,
    cost: 50,
    currency: 'VES',
    stock: 500,
    minStock: 10,
    userId: 'user-1',
    ...overrides,
  };
  mockProductData.set(id, product);
  return product;
}

// ─── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockProductData.clear();
  mockMovementItems.length = 0;
  mockMovementId = 0;

  // Default: Product.findAll returns seeded products matching userId
  // The real code uses: Product.findAll({ where: { id: productIds, userId } })
  // Op.in is a Sequelize symbol, so we match by userId and return all seeded products
  (Product.findAll as jest.Mock).mockImplementation(async (_opts: any) => {
    return Array.from(mockProductData.values()).map((p: any) => ({
      ...p,
      update: jest.fn(async (updates: any) => {
        Object.assign(p, updates);
      }),
      toJSON() { return p; },
    }));
  });
});

// ─── Tests ───────────────────────────────────────────────────────

describe('Stock Service - Exchange Rate Handling', () => {

  describe('Rate from cache', () => {
    it('should use cached official rate when available', async () => {
      const product = seedProduct({ price: 1000, currency: 'VES', stock: 500 });
      mockGetCachedRates.mockReturnValue(makeRate(36.5));

      const result = await stockService.createStockMovement({
        type: 'in',
        reason: 'Test entry',
        userId: 'user-1',
        items: [{ productId: product.id, quantity: 10 }],
      });

      // Rate should be 36.5
      expect(result.movement.exchangeRate).toBe(36.5);

      // totalAmountVES = 1000 * 10 = 10000
      expect(Number(result.movement.totalAmountVES)).toBe(10000);

      // totalAmountUSD = 10000 / 36.5 ≈ 273.97
      expect(Number(result.movement.totalAmountUSD)).toBeCloseTo(273.97, 0);

      // fetchExchangeRates should NOT have been called (cache was available)
      expect(mockFetchExchangeRates).not.toHaveBeenCalled();
    });

    it('should use cached rate for USD-priced products', async () => {
      const product = seedProduct({ price: 50, currency: 'USD', stock: 200 });
      mockGetCachedRates.mockReturnValue(makeRate(36.5));

      const result = await stockService.createStockMovement({
        type: 'in',
        userId: 'user-1',
        items: [{ productId: product.id, quantity: 5 }],
      });

      // totalAmountUSD = 50 * 5 = 250
      expect(Number(result.movement.totalAmountUSD)).toBe(250);

      // totalAmountVES = 250 * 36.5 = 9125
      expect(Number(result.movement.totalAmountVES)).toBe(9125);
    });
  });

  describe('Rate fetch fallback when cache is empty', () => {
    it('should fetch fresh rates when getCachedRates returns null', async () => {
      const product = seedProduct({ price: 500, currency: 'VES', stock: 300 });
      mockGetCachedRates.mockReturnValue(null);
      mockFetchExchangeRates.mockResolvedValue(makeRate(38.25));

      const result = await stockService.createStockMovement({
        type: 'in',
        userId: 'user-1',
        items: [{ productId: product.id, quantity: 4 }],
      });

      // fetchExchangeRates should have been called with force=true
      expect(mockFetchExchangeRates).toHaveBeenCalledWith(true);

      // Rate should be the fetched one
      expect(result.movement.exchangeRate).toBe(38.25);

      // totalAmountVES = 500 * 4 = 2000
      expect(Number(result.movement.totalAmountVES)).toBe(2000);

      // totalAmountUSD = 2000 / 38.25 ≈ 52.29
      expect(Number(result.movement.totalAmountUSD)).toBeCloseTo(52.29, 0);
    });

    it('should fetch fresh rates when cached.official is null', async () => {
      const product = seedProduct({ price: 200, currency: 'VES', stock: 100 });
      mockGetCachedRates.mockReturnValue(makeNullRate());
      mockFetchExchangeRates.mockResolvedValue(makeRate(35.0));

      const result = await stockService.createStockMovement({
        type: 'in',
        userId: 'user-1',
        items: [{ productId: product.id, quantity: 3 }],
      });

      expect(mockFetchExchangeRates).toHaveBeenCalledWith(true);
      expect(result.movement.exchangeRate).toBe(35.0);
    });

    it('should fall back to rate=1 if fetch also fails', async () => {
      const product = seedProduct({ price: 100, currency: 'VES', stock: 100 });
      mockGetCachedRates.mockReturnValue(null);
      mockFetchExchangeRates.mockRejectedValue(new Error('Network error'));

      const result = await stockService.createStockMovement({
        type: 'in',
        userId: 'user-1',
        items: [{ productId: product.id, quantity: 2 }],
      });

      // Rate defaults to 1
      expect(result.movement.exchangeRate).toBe(1);

      // With rate=1: USD = VES (100*2 / 1 = 200)
      expect(Number(result.movement.totalAmountUSD)).toBe(200);
      expect(Number(result.movement.totalAmountVES)).toBe(200);
    });
  });

  describe('Mixed currency totals', () => {
    it('should sum USD and VES products correctly', async () => {
      const vesProduct = seedProduct({ id: 'ves-1', price: 1000, currency: 'VES', stock: 500 });
      const usdProduct = seedProduct({ id: 'usd-1', price: 20, currency: 'USD', stock: 300 });
      mockGetCachedRates.mockReturnValue(makeRate(36.0));

      const result = await stockService.createStockMovement({
        type: 'in',
        userId: 'user-1',
        items: [
          { productId: vesProduct.id, quantity: 2 },  // 2000 VES
          { productId: usdProduct.id, quantity: 3 },   // 60 USD
        ],
      });

      // VES product: 1000 * 2 = 2000 VES → 2000/36 = 55.56 USD
      // USD product: 20 * 3 = 60 USD → 60*36 = 2160 VES
      // Total: 55.56 + 60 = 115.56 USD, 2000 + 2160 = 4160 VES
      const totalUSD = Number(result.movement.totalAmountUSD);
      const totalVES = Number(result.movement.totalAmountVES);

      expect(totalUSD).toBeCloseTo(115.56, 0);
      expect(totalVES).toBe(4160);

      expect(result.items).toHaveLength(2);
    });
  });

  describe('Movement types stock updates', () => {
    it('should increase stock for "in" movements', async () => {
      const product = seedProduct({ stock: 100 });
      mockGetCachedRates.mockReturnValue(makeRate(36.0));

      await stockService.createStockMovement({
        type: 'in', userId: 'user-1',
        items: [{ productId: product.id, quantity: 25 }],
      });

      expect(product.stock).toBe(125);
    });

    it('should decrease stock for "out" movements', async () => {
      const product = seedProduct({ stock: 100 });
      mockGetCachedRates.mockReturnValue(makeRate(36.0));

      await stockService.createStockMovement({
        type: 'out', userId: 'user-1',
        items: [{ productId: product.id, quantity: 30 }],
      });

      expect(product.stock).toBe(70);
    });

    it('should not change stock for "credit" movements', async () => {
      const product = seedProduct({ stock: 100 });
      mockGetCachedRates.mockReturnValue(makeRate(36.0));

      await stockService.createStockMovement({
        type: 'credit', userId: 'user-1',
        items: [{ productId: product.id, quantity: 10 }],
      });

      expect(product.stock).toBe(100);
    });

    it('should reject "out" when stock is insufficient', async () => {
      const product = seedProduct({ stock: 5 });
      mockGetCachedRates.mockReturnValue(makeRate(36.0));

      await expect(
        stockService.createStockMovement({
          type: 'out', userId: 'user-1',
          items: [{ productId: product.id, quantity: 10 }],
        })
      ).rejects.toThrow();

      expect(product.stock).toBe(5);
    });
  });

  describe('Movement items stored correctly', () => {
    it('should store unitPrice, totalPrice, currency, and exchangeRateSnapshot per item', async () => {
      const product = seedProduct({ price: 250, currency: 'VES', stock: 200 });
      mockGetCachedRates.mockReturnValue(makeRate(40.0));

      const result = await stockService.createStockMovement({
        type: 'in', userId: 'user-1',
        items: [{ productId: product.id, quantity: 4 }],
      });

      expect(result.items).toHaveLength(1);
      const item = result.items[0];

      expect(item.unitPrice).toBe(250);
      expect(item.totalPrice).toBe(1000); // 250 * 4
      expect(item.currency).toBe('VES');
      expect(item.exchangeRateSnapshot).toBe(40.0);
      expect(item.previousStock).toBe(200);
      expect(item.newStock).toBe(204);
    });
  });
});
