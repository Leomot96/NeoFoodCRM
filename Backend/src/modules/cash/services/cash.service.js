const prisma = require('../../../config/prisma');

class CashService {
  
  async openSession(userId, openingAmount, tenantId = null) {
    let effectiveTenantId = tenantId;
    if (!effectiveTenantId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true }
      });
      effectiveTenantId = user?.tenantId;
    }

    const activeSession = await prisma.cashSession.findFirst({
      where: { userId, status: 'OPEN' }
    });

    if (activeSession) {
      throw Object.assign(new Error('El usuario ya tiene una sesión de caja abierta'), { statusCode: 400 });
    }

    return await prisma.cashSession.create({
      data: {
        userId,
        tenantId: effectiveTenantId || null,
        openingAmount: parseFloat(openingAmount),
        status: 'OPEN'
      }
    });
  }

  async closeSession(sessionId, userId, closingAmount) {
    const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });

    if (!session) throw Object.assign(new Error('Sesión de caja no encontrada'), { statusCode: 404 });
    if (session.userId !== userId) throw Object.assign(new Error('Solo el titular puede cerrar esta caja'), { statusCode: 403 });
    if (session.status === 'CLOSED') throw Object.assign(new Error('La caja ya se encuentra cerrada'), { statusCode: 400 });

    return await prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closingAmount: parseFloat(closingAmount),
        closedAt: new Date()
      }
    });
  }

  async registerMovement(sessionId, userId, data) {
    const { type, amount, description } = data;

    const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });
    
    if (!session || session.status === 'CLOSED') {
      throw Object.assign(new Error('La sesión de caja no existe o está cerrada'), { statusCode: 400 });
    }
    
    if (session.userId !== userId) {
      throw Object.assign(new Error('No tiene permisos para registrar movimientos en esta caja'), { statusCode: 403 });
    }

    return await prisma.cashMovement.create({
      data: {
        cashSessionId: sessionId,
        type,
        amount: parseFloat(amount),
        description
      }
    });
  }

  async createAudit(sessionId, auditorId, data) {
    const { actualAmount, notes } = data;

    return await prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.findUnique({
        where: { id: sessionId },
        include: {
          sales: { include: { paymentMethod: true } },
          cashMovements: true
        }
      });

      if (!session) throw Object.assign(new Error('Sesión no encontrada'), { statusCode: 404 });
      if (session.status !== 'CLOSED') throw Object.assign(new Error('La caja debe estar cerrada para realizar el arqueo'), { statusCode: 400 });

      const existingAudit = await tx.cashAudit.findUnique({ where: { cashSessionId: sessionId } });
      if (existingAudit) throw Object.assign(new Error('Esta sesión ya fue arqueada'), { statusCode: 400 });

      let expectedCash = parseFloat(session.openingAmount);

      const cashSales = session.sales
        .filter(sale => sale.paymentMethod.name.toLowerCase().includes('efectivo'))
        .reduce((sum, sale) => sum + parseFloat(sale.finalAmount), 0);
      expectedCash += cashSales;

      const movementsIn = session.cashMovements
        .filter(m => m.type === 'IN')
        .reduce((sum, m) => sum + parseFloat(m.amount), 0);
      const movementsOut = session.cashMovements
        .filter(m => m.type === 'OUT')
        .reduce((sum, m) => sum + parseFloat(m.amount), 0);
      
      expectedCash = expectedCash + movementsIn - movementsOut;

      const actual = parseFloat(actualAmount);
      const difference = actual - expectedCash;

      const audit = await tx.cashAudit.create({
        data: {
          cashSessionId: sessionId,
          auditorId,
          cashierId: session.userId,
          expectedAmount: expectedCash,
          actualAmount: actual,
          difference,
          notes: notes || `Arqueo automático. Faltante/Sobrante: ${difference}`
        }
      });

      return audit;
    });
  }

  // --- MODIFICADO: Calculamos el Efectivo Esperado aquí para el Frontend ---
// --- MODIFICADO: Calculamos el Efectivo Esperado y Total de Ventas al vuelo ---
  async getHistory(filters = {}) {
    const { userId, status, startDate, endDate } = filters;
    const where = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.openedAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    // 1. OBTENER LAS SESIONES DE LA BASE DE DATOS (Esta era la línea que faltaba)
    const sessions = await prisma.cashSession.findMany({
      where,
      include: {
        user: { select: { name: true } },
        cashAudit: { select: { difference: true, actualAmount: true } },
        cashMovements: { orderBy: { createdAt: 'desc' } },
        sales: { include: { paymentMethod: true } }, // Necesario para sumar y desglosar las ventas
        customerCredits: { include: { paymentMethod: true } } // Añadido para incluir Abonos al total
      },
      orderBy: { openedAt: 'desc' },
      take: 50 // Límite para no saturar memoria en el historial
    });

    // 2. MAPEAMOS PARA CALCULAR RESÚMENES AL VUELO
    return sessions.map(session => {
      let expectedCash = parseFloat(session.openingAmount);
      
      // Ignorar movimientos automáticos antiguos para no duplicar sumas
      const movIn = session.cashMovements
        .filter(m => m.type === 'IN' && !m.description?.startsWith('Abono a Factura') && !m.description?.startsWith('Pago Factura') && !m.description?.startsWith('Abono de cliente'))
        .reduce((acc, m) => acc + parseFloat(m.amount), 0);
      const movOut = session.cashMovements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + parseFloat(m.amount), 0);
      
      // Calcular desglose de ventas y total general (excluyendo créditos)
      let totalSales = 0;
      let salesByMethod = {};

      session.sales.forEach(sale => {
        const methodName = sale.paymentMethod?.name || 'Desconocido';
        const isCredit = methodName.toLowerCase().includes('crédito') || methodName.toLowerCase().includes('credito') || methodName.toLowerCase().includes('fiao');
        
        if (!isCredit) {
          const amount = parseFloat(sale.finalAmount);
          totalSales += amount;
          salesByMethod[methodName] = (salesByMethod[methodName] || 0) + amount;
        }
      });

      // Sumar los abonos reales (CustomerCredit tipo PAYMENT) al total vendido
      if (session.customerCredits) {
        session.customerCredits.forEach(credit => {
          if (credit.type === 'PAYMENT') {
            const amount = parseFloat(credit.amount);
            const methodName = credit.paymentMethod?.name || 'Abono Crédito';
            totalSales += amount;
            salesByMethod[methodName] = (salesByMethod[methodName] || 0) + amount;
          }
        });
      }

      // Extraer solo el efectivo para sumar a la gaveta
      const cashSales = session.sales
        .filter(s => s.paymentMethod?.name?.toLowerCase().includes('efectivo'))
        .reduce((acc, s) => acc + parseFloat(s.finalAmount), 0);
        
      let cashAbonos = 0;
      if (session.customerCredits) {
        cashAbonos = session.customerCredits
          .filter(c => c.type === 'PAYMENT' && c.paymentMethod?.name?.toLowerCase().includes('efectivo'))
          .reduce((acc, c) => acc + parseFloat(c.amount), 0);
      }

      expectedCash = expectedCash + movIn - movOut + cashSales + cashAbonos;

      // Eliminamos el array masivo de ventas y creditos SOLO de las sesiones cerradas.
      // Si está ABIERTA, lo dejamos para que el frontend (React) pueda armar el desglose.
      if (session.status === 'CLOSED') {
        delete session.sales;
        delete session.customerCredits;
      }

      return {
        ...session,
        expectedCash,
        cashSalesCount: cashSales,
        totalSales,           // <-- Enviamos el total vendido
        salesByMethod         // <-- Enviamos el desglose por métodos
      };
    });
  }

  async getDailyReport(date) {
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const sessions = await prisma.cashSession.findMany({
      where: { openedAt: { gte: startOfDay, lte: endOfDay } },
      include: {
        user: { select: { name: true } },
        cashAudit: { select: { difference: true, actualAmount: true } },
        cashMovements: { orderBy: { createdAt: 'desc' } },
        sales: { include: { paymentMethod: true } },
        customerCredits: { include: { paymentMethod: true } }
      },
      orderBy: { openedAt: 'asc' }
    });

    let totalSales = 0;
    let totalIncomes = 0;
    let totalExpenses = 0;
    let totalDifferences = 0;
    let totalMissing = 0;
    let totalSurplus = 0;
    let salesByMethod = {};

    const formattedSessions = sessions.map(session => {
      let sessionTotalSales = 0;
      let sessionSalesByMethod = {};

      session.sales?.forEach(sale => {
        const methodName = sale.paymentMethod?.name || 'Desconocido';
        const isCredit = methodName.toLowerCase().includes('crédito') || methodName.toLowerCase().includes('credito') || methodName.toLowerCase().includes('fiao');
        if (!isCredit) {
          const amt = parseFloat(sale.finalAmount || 0);
          sessionTotalSales += amt;
          sessionSalesByMethod[methodName] = (sessionSalesByMethod[methodName] || 0) + amt;
          salesByMethod[methodName] = (salesByMethod[methodName] || 0) + amt;
        }
      });

      session.customerCredits?.forEach(credit => {
        if (credit.type === 'PAYMENT') {
          const amt = parseFloat(credit.amount || 0);
          const methodName = credit.paymentMethod?.name || 'Abono Crédito';
          sessionTotalSales += amt;
          sessionSalesByMethod[methodName] = (sessionSalesByMethod[methodName] || 0) + amt;
          salesByMethod[methodName] = (salesByMethod[methodName] || 0) + amt;
        }
      });

      totalSales += sessionTotalSales;

      const inc = session.cashMovements
        ?.filter(m => m.type === 'IN' && !m.description?.startsWith('Abono a Factura') && !m.description?.startsWith('Pago Factura') && !m.description?.startsWith('Abono de cliente'))
        .reduce((acc, m) => acc + parseFloat(m.amount || 0), 0) || 0;
      const exp = session.cashMovements
        ?.filter(m => m.type === 'OUT')
        .reduce((acc, m) => acc + parseFloat(m.amount || 0), 0) || 0;

      totalIncomes += inc;
      totalExpenses += exp;

      let expectedCash = parseFloat(session.openingAmount || 0);
      const cashSales = session.sales
        ?.filter(s => s.paymentMethod?.name?.toLowerCase().includes('efectivo'))
        .reduce((acc, s) => acc + parseFloat(s.finalAmount || 0), 0) || 0;
      const cashAbonos = session.customerCredits
        ?.filter(c => c.type === 'PAYMENT' && c.paymentMethod?.name?.toLowerCase().includes('efectivo'))
        .reduce((acc, c) => acc + parseFloat(c.amount || 0), 0) || 0;

      expectedCash = expectedCash + inc - exp + cashSales + cashAbonos;

      const diff = session.closingAmount !== null ? parseFloat(session.closingAmount) - expectedCash : 0;
      totalDifferences += diff;
      if (diff < 0) totalMissing += Math.abs(diff);
      if (diff > 0) totalSurplus += diff;

      return {
        id: session.id,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        user: session.user,
        openingAmount: parseFloat(session.openingAmount || 0),
        closingAmount: session.closingAmount !== null ? parseFloat(session.closingAmount) : null,
        expectedCash,
        difference: diff,
        totalSales: sessionTotalSales,
        salesByMethod: sessionSalesByMethod,
        incomes: inc,
        expenses: exp,
        cashMovements: session.cashMovements || []
      };
    });

    return {
      date,
      sessionsCount: formattedSessions.length,
      metrics: {
        totalSales,
        totalIncomes,
        totalExpenses,
        netCashFlow: totalSales + totalIncomes - totalExpenses,
        auditDifferences: totalDifferences,
        totalMissing,
        totalSurplus,
        salesByMethod
      },
      sessions: formattedSessions
    };
  }

  async getMonthlyReport(year, month) {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const sessions = await prisma.cashSession.findMany({
      where: { openedAt: { gte: startDate, lte: endDate } },
      include: {
        user: { select: { name: true } },
        cashAudit: { select: { difference: true, actualAmount: true } },
        cashMovements: { orderBy: { createdAt: 'desc' } },
        sales: { include: { paymentMethod: true } },
        customerCredits: { include: { paymentMethod: true } }
      },
      orderBy: { openedAt: 'asc' }
    });

    let totalSales = 0;
    let totalIncomes = 0;
    let totalExpenses = 0;
    let totalDifferences = 0;
    let totalMissing = 0;
    let totalSurplus = 0;
    let salesByMethod = {};
    const dailyMap = {};

    const formattedSessions = sessions.map(session => {
      let sessionTotalSales = 0;
      let sessionSalesByMethod = {};

      session.sales?.forEach(sale => {
        const methodName = sale.paymentMethod?.name || 'Desconocido';
        const isCredit = methodName.toLowerCase().includes('crédito') || methodName.toLowerCase().includes('credito') || methodName.toLowerCase().includes('fiao');
        if (!isCredit) {
          const amt = parseFloat(sale.finalAmount || 0);
          sessionTotalSales += amt;
          sessionSalesByMethod[methodName] = (sessionSalesByMethod[methodName] || 0) + amt;
          salesByMethod[methodName] = (salesByMethod[methodName] || 0) + amt;
        }
      });

      session.customerCredits?.forEach(credit => {
        if (credit.type === 'PAYMENT') {
          const amt = parseFloat(credit.amount || 0);
          const methodName = credit.paymentMethod?.name || 'Abono Crédito';
          sessionTotalSales += amt;
          sessionSalesByMethod[methodName] = (sessionSalesByMethod[methodName] || 0) + amt;
          salesByMethod[methodName] = (salesByMethod[methodName] || 0) + amt;
        }
      });

      totalSales += sessionTotalSales;

      const inc = session.cashMovements
        ?.filter(m => m.type === 'IN' && !m.description?.startsWith('Abono a Factura') && !m.description?.startsWith('Pago Factura') && !m.description?.startsWith('Abono de cliente'))
        .reduce((acc, m) => acc + parseFloat(m.amount || 0), 0) || 0;
      const exp = session.cashMovements
        ?.filter(m => m.type === 'OUT')
        .reduce((acc, m) => acc + parseFloat(m.amount || 0), 0) || 0;

      totalIncomes += inc;
      totalExpenses += exp;

      let expectedCash = parseFloat(session.openingAmount || 0);
      const cashSales = session.sales
        ?.filter(s => s.paymentMethod?.name?.toLowerCase().includes('efectivo'))
        .reduce((acc, s) => acc + parseFloat(s.finalAmount || 0), 0) || 0;
      const cashAbonos = session.customerCredits
        ?.filter(c => c.type === 'PAYMENT' && c.paymentMethod?.name?.toLowerCase().includes('efectivo'))
        .reduce((acc, c) => acc + parseFloat(c.amount || 0), 0) || 0;

      expectedCash = expectedCash + inc - exp + cashSales + cashAbonos;

      const diff = session.closingAmount !== null ? parseFloat(session.closingAmount) - expectedCash : 0;
      totalDifferences += diff;
      if (diff < 0) totalMissing += Math.abs(diff);
      if (diff > 0) totalSurplus += diff;

      const dayStr = new Date(session.openedAt).toISOString().split('T')[0];
      if (!dailyMap[dayStr]) {
        dailyMap[dayStr] = { date: dayStr, sales: 0, sessionsCount: 0, expenses: 0, incomes: 0, diff: 0 };
      }
      dailyMap[dayStr].sales += sessionTotalSales;
      dailyMap[dayStr].sessionsCount += 1;
      dailyMap[dayStr].expenses += exp;
      dailyMap[dayStr].incomes += inc;
      dailyMap[dayStr].diff += diff;

      return {
        id: session.id,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        user: session.user,
        openingAmount: parseFloat(session.openingAmount || 0),
        closingAmount: session.closingAmount !== null ? parseFloat(session.closingAmount) : null,
        expectedCash,
        difference: diff,
        totalSales: sessionTotalSales,
        salesByMethod: sessionSalesByMethod,
        incomes: inc,
        expenses: exp
      };
    });

    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      sessionsCount: formattedSessions.length,
      metrics: {
        totalSales,
        totalIncomes,
        totalExpenses,
        netCashFlow: totalSales + totalIncomes - totalExpenses,
        auditDifferences: totalDifferences,
        totalMissing,
        totalSurplus,
        netBalance: totalSurplus - totalMissing,
        salesByMethod
      },
      dailyBreakdown,
      sessions: formattedSessions
    };
  }
}

module.exports = new CashService();