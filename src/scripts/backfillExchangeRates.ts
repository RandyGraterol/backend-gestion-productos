import { sequelize } from '../config/database';
import { StockMovement } from '../models';
import axios from 'axios';
import { Op } from 'sequelize';

const HISTORICAL_API = 'https://bcv-api.rafnixg.dev/rates';

interface HistoricalRate {
  dollar?: number;
  bcv?: number;
  promedio?: number;
}

async function fetchRateForDate(dateStr: string): Promise<number | null> {
  // Try bcv-api.rafnixg.dev first
  try {
    const res = await axios.get<HistoricalRate>(`${HISTORICAL_API}/${dateStr}`, {
      timeout: 8000,
    });
    const rate = res.data?.dollar;
    if (rate && rate > 0) return Math.round(rate * 100) / 100;
  } catch {
    // fall through
  }

  // Fallback: dolarapi only returns current rate, not historical — skip
  return null;
}

async function backfill() {
  try {
    console.log('🔍 Buscando movimientos sin tasa de cambio...\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    const movements = await StockMovement.findAll({
      where: { exchangeRate: null as any },
      attributes: ['id', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    if (movements.length === 0) {
      console.log('✅ No hay movimientos pendientes de backfill.\n');
      return;
    }

    console.log(`📦 ${movements.length} movimientos sin tasa.\n`);

    // Group by date
    const byDate = new Map<string, string[]>();
    for (const m of movements) {
      const dateStr = new Date(m.createdAt).toISOString().split('T')[0];
      const ids = byDate.get(dateStr) || [];
      ids.push(m.id);
      byDate.set(dateStr, ids);
    }

    console.log(`📅 ${byDate.size} fechas únicas para consultar.\n`);

    let updatedCount = 0;
    let failedDates: string[] = [];

    for (const [dateStr, ids] of byDate) {
      const rate = await fetchRateForDate(dateStr);

      if (rate !== null) {
        await StockMovement.update(
          { exchangeRate: rate },
          { where: { id: { [Op.in]: ids } } }
        );
        updatedCount += ids.length;
        console.log(`  ✅ ${dateStr} → Bs. ${rate} (${ids.length} movimientos)`);
      } else {
        failedDates.push(dateStr);
        console.log(`  ❌ ${dateStr} → No se encontró tasa (${ids.length} movimientos)`);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   • Actualizados: ${updatedCount} movimientos`);
    console.log(`   • Sin tasa:     ${failedDates.length} fechas`);

    if (failedDates.length > 0) {
      console.log(`\n⚠️  Fechas sin tasa disponible:`);
      failedDates.forEach((d) => console.log(`   - ${d}`));
      console.log(`\n   Puedes intentar ejecutar el script nuevamente más tarde.`);
    }

  } catch (error) {
    console.error('❌ Error durante el backfill:', error);
  } finally {
    await sequelize.close();
    console.log('\n👋 Conexión cerrada');
  }
}

backfill()
  .then(() => {
    console.log('✅ Backfill completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
