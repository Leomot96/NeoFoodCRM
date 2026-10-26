const prisma = require('../../../config/prisma');
const { getTenantId } = require('../../../context/tenantContext');

class InvoiceService {
    async getInvoices(filters = {}) {
        const { invoiceNumber, customerId, paymentMethodId, date } = filters;
        const tenantId = getTenantId();

        // Filtros dinámicos
        const where = {};
        if (tenantId) where.tenantId = tenantId;
        if (invoiceNumber) where.invoiceNumber = { contains: invoiceNumber };
        if (customerId) where.customerId = customerId;
        if (paymentMethodId) where.paymentMethodId = paymentMethodId;
        if (date) {
            const start = new Date(date);
            if (!Number.isNaN(start.getTime())) {
                const end = new Date(date);
                end.setDate(end.getDate() + 1);
                where.createdAt = { gte: start, lt: end };
            }
        }

        return await prisma.sale.findMany({ 
            where,
            include: {
                customer: { select: { name: true, document: true } },
                paymentMethod: { select: { name: true } },
                payments: {
                    include: { paymentMethod: { select: { id: true, name: true } } }
                },
                order: { select: { table: { select: { name: true } } } },
                details: { 
                    include: { 
                        product: { select: { name: true } },
                        saleDetailAdditions: { include: { addition: { select: { name: true } } } },
                        saleDetailVariations: { include: { variation: { select: { name: true } } } }
                    } 
                },
                // Historial de abonos para mostrar el detalle de créditos
                customerCredits: {
                    orderBy: { createdAt: 'asc' },
                    include: { paymentMethod: { select: { name: true } } }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
    }

    async updatePaymentMethod(saleId, paymentMethodId, date, userId) {
        const tenantId = getTenantId();

        // 1. Obtener la venta original
        const sale = await prisma.sale.findFirst({
            where: { id: saleId, ...(tenantId ? { tenantId } : {}) },
            include: { paymentMethod: true, payments: true, customerCredits: true, customer: true }
        });

        if (!sale) {
            throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });
        }

        // 2. Obtener el nuevo método de pago
        const newPaymentMethod = await prisma.paymentMethod.findFirst({
            where: { id: paymentMethodId, ...(tenantId ? { tenantId } : {}) }
        });

        if (!newPaymentMethod) {
            throw Object.assign(new Error('Método de pago no encontrado'), { statusCode: 404 });
        }

        const isOldCredit = sale.paymentMethod.name.toLowerCase().includes('crédito') || sale.paymentMethod.name.toLowerCase().includes('credito') || sale.paymentMethod.name.toLowerCase().includes('fiao');
        const isNewCredit = newPaymentMethod.name.toLowerCase().includes('crédito') || newPaymentMethod.name.toLowerCase().includes('credito') || newPaymentMethod.name.toLowerCase().includes('fiao');

        const isGenericCustomer = !sale.customerId ||
            sale.customer?.document === '222222222222' ||
            (sale.customer?.name || '').trim().toLowerCase() === 'consumidor final';

        if (!isOldCredit && isNewCredit && isGenericCustomer) {
            throw Object.assign(new Error('No se puede cambiar a Crédito una factura sin un cliente real asignado (distinto a Consumidor Final)'), { statusCode: 400 });
        }

        const dataToUpdate = { paymentMethodId };
        
        // Si enviaste una nueva fecha válida, la reemplaza
        if (date) {
            const parsedDate = new Date(date);
            if (Number.isNaN(parsedDate.getTime())) {
                throw Object.assign(new Error('Fecha proporcionada inválida'), { statusCode: 400 });
            }
            dataToUpdate.createdAt = parsedDate;
        }

        return await prisma.$transaction(async (tx) => {
            // Si cambia de Crédito a No-Crédito (ej. Efectivo o Nequi)
            if (isOldCredit && !isNewCredit && sale.customerId) {
                const debtCredits = (sale.customerCredits || []).filter(c => c.type === 'DEBT');
                const paymentCredits = (sale.customerCredits || []).filter(c => c.type === 'PAYMENT');
                const totalDebt = debtCredits.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);
                const totalPaid = paymentCredits.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);
                const netUnpaidDebt = totalDebt > 0
                    ? Math.max(0, totalDebt - totalPaid)
                    : Math.max(0, parseFloat(sale.finalAmount || 0));

                if (netUnpaidDebt > 0) {
                    await tx.customer.update({
                        where: { id: sale.customerId },
                        data: { balance: { decrement: netUnpaidDebt } }
                    });
                }

                // Eliminamos los registros de crédito asociados a esa venta y restauramos finalAmount al totalAmount
                await tx.customerCredit.deleteMany({
                    where: { saleId: sale.id }
                });
                dataToUpdate.finalAmount = sale.totalAmount;
                
                // Asignar el dinero a la CAJA ACTUAL si el usuario tiene una abierta
                if (userId) {
                    const activeSession = await tx.cashSession.findFirst({
                        where: { userId, status: 'OPEN', ...(tenantId ? { tenantId } : {}) }
                    });
                    
                    if (activeSession) {
                        dataToUpdate.cashSessionId = activeSession.id;
                    }
                }
            }
            
            // Si cambia de No-Crédito a Crédito (Lo fiaron por error y lo corrigen)
            if (!isOldCredit && isNewCredit && sale.customerId) {
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: { balance: { increment: sale.finalAmount } }
                });
                
                await tx.customerCredit.create({
                    data: {
                        customerId: sale.customerId,
                        type: 'DEBT',
                        amount: sale.finalAmount,
                        description: `Corrección a Crédito Factura #${sale.invoiceNumber}`,
                        saleId: sale.id,
                        paymentMethodId: paymentMethodId,
                        cashSessionId: sale.cashSessionId
                    }
                });
            }

            // Sincronizar los registros de SalePayment con el nuevo método de pago
            await tx.salePayment.deleteMany({
                where: { saleId: sale.id }
            });
            await tx.salePayment.create({
                data: {
                    saleId: sale.id,
                    paymentMethodId,
                    amount: sale.totalAmount,
                    notes: 'Actualización de método de pago en factura'
                }
            });

            return await tx.sale.update({
                where: { id: saleId },
                data: dataToUpdate
            });
        });
    }

    async addAbono(saleId, amount, paymentMethodId, userId, date = null) {
        const numericAmount = parseFloat(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            throw Object.assign(new Error('El monto del abono debe ser mayor a 0'), { statusCode: 400 });
        }

        let parsedPaymentDate = null;
        if (date) {
            const rawDate = String(date).trim();
            parsedPaymentDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
                ? new Date(`${rawDate}T12:00:00.000Z`)
                : new Date(rawDate);
            if (Number.isNaN(parsedPaymentDate.getTime())) {
                throw Object.assign(new Error('Fecha proporcionada inválida'), { statusCode: 400 });
            }
        }

        const tenantId = getTenantId();

        return await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findFirst({
                where: { id: saleId, ...(tenantId ? { tenantId } : {}) },
                include: { paymentMethod: true, customer: true }
            });

            if (!sale) throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });
            if (!sale.customerId) throw Object.assign(new Error('La venta no está asociada a un cliente'), { statusCode: 400 });
            if (numericAmount > parseFloat(sale.finalAmount)) {
                throw Object.assign(new Error('Monto de abono inválido o superior al saldo pendiente de la factura'), { statusCode: 400 });
            }

            // Encontrar la sesión activa del usuario
            const activeSession = await tx.cashSession.findFirst({
                where: { userId, status: 'OPEN', ...(tenantId ? { tenantId } : {}) }
            });

            if (!activeSession) {
                throw Object.assign(new Error('Debe tener una caja abierta para registrar un abono'), { statusCode: 400 });
            }

            const paymentMethod = await tx.paymentMethod.findFirst({
                where: { id: paymentMethodId, ...(tenantId ? { tenantId } : {}) }
            });
            if (!paymentMethod) {
                throw Object.assign(new Error('Método de pago no encontrado'), { statusCode: 404 });
            }

            // 1. Reducir deuda del cliente
            await tx.customer.update({
                where: { id: sale.customerId },
                data: { balance: { decrement: numericAmount } }
            });

            // 2. Registrar el abono (PAYMENT)
            await tx.customerCredit.create({
                data: {
                    customerId: sale.customerId,
                    type: 'PAYMENT',
                    amount: numericAmount,
                    description: `Abono a Factura #${sale.invoiceNumber || saleId}`,
                    saleId: sale.id,
                    paymentMethodId: paymentMethodId,
                    cashSessionId: activeSession.id
                }
            });

            // 4. Modificar el valor de la factura
            let updateData;

            // Si es un pago TOTAL: restaurar finalAmount al valor original (totalAmount)
            // para que la factura quede como una factura normal completamente pagada
            if (Math.abs(numericAmount - parseFloat(sale.finalAmount)) < 0.01) {
                updateData = {
                    finalAmount: sale.totalAmount,  // Restaurar al monto original
                    paymentMethodId: paymentMethodId // Cambiar método de crédito al real
                };
                if (parsedPaymentDate) {
                    updateData.createdAt = parsedPaymentDate;
                }
                // Sincronizar SalePayment para que la factura refleje el medio de pago real
                await tx.salePayment.deleteMany({
                    where: { saleId: sale.id }
                });
                await tx.salePayment.create({
                    data: {
                        saleId: sale.id,
                        paymentMethodId,
                        amount: sale.totalAmount,
                        notes: 'Pago total de crédito vía abono'
                    }
                });
            } else {
                // Abono PARCIAL: simplemente descontar del saldo pendiente
                updateData = { finalAmount: { decrement: numericAmount } };
            }

            return await tx.sale.update({
                where: { id: saleId },
                data: updateData
            });
        });
    }

    async cancelInvoice(saleId, userId, reason = 'Venta de prueba / Anulación por error') {
        const tenantId = getTenantId();

        return await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findFirst({
                where: { id: saleId, ...(tenantId ? { tenantId } : {}) },
                include: {
                    details: {
                        include: {
                            product: {
                                include: {
                                    ingredients: true
                                }
                            },
                            saleDetailVariations: {
                                include: {
                                    variation: {
                                        include: {
                                            linkedProduct: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    payments: true,
                    customerCredits: true,
                    order: true
                }
            });

            if (!sale) {
                throw Object.assign(new Error('La factura no existe o ya fue anulada'), { statusCode: 404 });
            }

            // 1. Revertir inventario de insumos (Ingredients)
            if (sale.invoiceNumber) {
                const movements = await tx.inventoryMovement.findMany({
                    where: {
                        reason: { contains: sale.invoiceNumber },
                        type: 'OUT'
                    }
                });

                for (const mov of movements) {
                    await tx.ingredient.update({
                        where: { id: mov.ingredientId },
                        data: { currentStock: { increment: mov.quantity } }
                    });

                    await tx.inventoryMovement.create({
                        data: {
                            tenantId: mov.tenantId || sale.tenantId,
                            ingredientId: mov.ingredientId,
                            userId,
                            type: 'IN',
                            quantity: mov.quantity,
                            reason: `Reingreso por anulación de Factura ${sale.invoiceNumber}: ${reason}`
                        }
                    });
                }
            }

            // 2. Revertir stock de productos directos (trackStock) y sub-productos en combos (saleDetailVariations.variation.linkedProduct)
            for (const d of sale.details) {
                if (d.product?.trackStock) {
                    await tx.product.update({
                        where: { id: d.productId },
                        data: { stock: { increment: d.quantity } }
                    });
                }
                if (Array.isArray(d.saleDetailVariations)) {
                    for (const sdv of d.saleDetailVariations) {
                        const linkedProd = sdv.variation?.linkedProduct;
                        if (linkedProd?.trackStock) {
                            await tx.product.update({
                                where: { id: linkedProd.id },
                                data: { stock: { increment: d.quantity } }
                            });
                        }
                    }
                }
            }

            // 3. Revertir saldos de crédito de cliente descontando únicamente la deuda neta pendiente (totalDebt - totalPaid)
            if (sale.customerId) {
                const debtCredits = (sale.customerCredits || []).filter(c => c.type === 'DEBT');
                const paymentCredits = (sale.customerCredits || []).filter(c => c.type === 'PAYMENT');
                const totalDebt = debtCredits.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);
                const totalPaid = paymentCredits.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);
                const netUnpaidDebt = Math.max(0, totalDebt - totalPaid);

                if (netUnpaidDebt > 0) {
                    await tx.customer.update({
                        where: { id: sale.customerId },
                        data: { balance: { decrement: netUnpaidDebt } }
                    });
                }
                await tx.customerCredit.deleteMany({
                    where: { saleId: sale.id }
                });
            }

            // 4. Actualizar estado del pedido a CANCELLED
            if (sale.orderId) {
                await tx.order.update({
                    where: { id: sale.orderId },
                    data: {
                        status: 'CANCELLED',
                        notes: `${sale.order?.notes || ''} [Factura ${sale.invoiceNumber} Anulada: ${reason}]`.trim()
                    }
                });
            }

            // 5. Eliminar hijos de venta y la venta para retirarla de la sesión de caja y reportes
            const detailIds = (sale.details || []).map(d => d.id);
            if (detailIds.length > 0) {
                await tx.saleDetailAddition.deleteMany({ where: { saleDetailId: { in: detailIds } } });
                await tx.saleDetailVariation.deleteMany({ where: { saleDetailId: { in: detailIds } } });
                await tx.saleDetail.deleteMany({ where: { id: { in: detailIds } } });
            }
            await tx.salePayment.deleteMany({ where: { saleId: sale.id } });
            await tx.sale.delete({
                where: { id: sale.id }
            });

            return {
                success: true,
                invoiceNumber: sale.invoiceNumber,
                message: `Factura ${sale.invoiceNumber} anulada correctamente. Se restauraron los insumos al stock y se removió de la caja.`
            };
        });
    }
}

module.exports = new InvoiceService();
