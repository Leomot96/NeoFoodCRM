const prisma = require('../../../config/prisma');

class InvoiceService {
    async getInvoices(filters = {}) {
        const { invoiceNumber, customerId, paymentMethodId, date } = filters;
        
        // Filtros dinámicos
        const where = {};
        if (invoiceNumber) where.invoiceNumber = { contains: invoiceNumber };
        if (customerId) where.customerId = customerId;
        if (paymentMethodId) where.paymentMethodId = paymentMethodId;
        if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        where.createdAt = { gte: start, lt: end };
        }

        return await prisma.sale.findMany({ 
        where,
        include: {
            customer: { select: { name: true, document: true } },
            paymentMethod: { select: { name: true } },
            order: { select: { table: { select: { name: true } } } },
            details: { 
                include: { 
                    product: { select: { name: true } } ,
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
        // 1. Obtener la venta original
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { paymentMethod: true, payments: true }
        });

        if (!sale) {
            throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });
        }

        // 2. Obtener el nuevo método de pago
        const newPaymentMethod = await prisma.paymentMethod.findUnique({
            where: { id: paymentMethodId }
        });

        if (!newPaymentMethod) {
            throw Object.assign(new Error('Método de pago no encontrado'), { statusCode: 404 });
        }

        const isOldCredit = sale.paymentMethod.name.toLowerCase().includes('crédito') || sale.paymentMethod.name.toLowerCase().includes('credito') || sale.paymentMethod.name.toLowerCase().includes('fiao');
        const isNewCredit = newPaymentMethod.name.toLowerCase().includes('crédito') || newPaymentMethod.name.toLowerCase().includes('credito') || newPaymentMethod.name.toLowerCase().includes('fiao');

        const dataToUpdate = { paymentMethodId };
        
        // Si enviaste una nueva fecha, la reemplaza
        if (date) {
            dataToUpdate.createdAt = new Date(date);
        }

        return await prisma.$transaction(async (tx) => {
            // Si cambia de Crédito a No-Crédito (ej. Efectivo o Nequi)
            if (isOldCredit && !isNewCredit && sale.customerId) {
                // Descontamos la deuda del cliente
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: { balance: { decrement: sale.finalAmount } }
                });

                // Eliminamos el registro de deuda en el historial de crédito para esa venta
                await tx.customerCredit.deleteMany({
                    where: { saleId: sale.id, type: 'DEBT' }
                });
                
                // Asignar el dinero a la CAJA ACTUAL si el usuario tiene una abierta y si es efectivo u otro
                // para que aparezca en el turno de hoy, no en el turno en que se generó la factura.
                if (userId) {
                    const activeSession = await tx.cashSession.findFirst({
                        where: { userId, status: 'OPEN' }
                    });
                    
                    if (activeSession) {
                        dataToUpdate.cashSessionId = activeSession.id;
                    }
                }
            }
            
            // Si cambia de No-Crédito a Crédito (Lo fiaron por error y lo corrigen)
            if (!isOldCredit && isNewCredit && sale.customerId) {
                // Aumentar la deuda
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: { balance: { increment: sale.finalAmount } }
                });
                
                // Crear la deuda
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

            // Si la venta tenía un único registro en SalePayment, sincronizar su paymentMethodId
            if (Array.isArray(sale.payments) && sale.payments.length === 1) {
                await tx.salePayment.update({
                    where: { id: sale.payments[0].id },
                    data: { paymentMethodId }
                });
            }

            return await tx.sale.update({
                where: { id: saleId },
                data: dataToUpdate
            });
        });
    }

    async addAbono(saleId, amount, paymentMethodId, userId) {
        const numericAmount = parseFloat(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            throw Object.assign(new Error('El monto del abono debe ser mayor a 0'), { statusCode: 400 });
        }

        return await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findUnique({
                where: { id: saleId },
                include: { paymentMethod: true, customer: true }
            });

            if (!sale) throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });
            if (!sale.customerId) throw Object.assign(new Error('La venta no está asociada a un cliente'), { statusCode: 400 });
            if (numericAmount > parseFloat(sale.finalAmount)) {
                throw Object.assign(new Error('Monto de abono inválido o superior al saldo pendiente de la factura'), { statusCode: 400 });
            }

            // Encontrar la sesión activa del usuario
            const activeSession = await tx.cashSession.findFirst({
                where: { userId, status: 'OPEN' }
            });

            if (!activeSession) {
                throw Object.assign(new Error('Debe tener una caja abierta para registrar un abono'), { statusCode: 400 });
            }

            const paymentMethod = await tx.paymentMethod.findUnique({ where: { id: paymentMethodId } });
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
        return await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findUnique({
                where: { id: saleId },
                include: {
                    details: {
                        include: {
                            product: {
                                include: {
                                    ingredients: true
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

            // 2. Revertir stock de productos directos (trackStock) y sub-productos en combos (linkedProductId)
            for (const d of sale.details) {
                if (d.product?.trackStock) {
                    await tx.product.update({
                        where: { id: d.productId },
                        data: { stock: { increment: d.quantity } }
                    });
                }
                if (d.product?.isCombo && Array.isArray(d.product.ingredients)) {
                    for (const comp of d.product.ingredients) {
                        if (comp.linkedProductId) {
                            const linkedProd = await tx.product.findUnique({
                                where: { id: comp.linkedProductId },
                                select: { id: true, trackStock: true }
                            });
                            if (linkedProd?.trackStock) {
                                const restoreQty = Math.round(parseFloat(comp.quantity || 1) * d.quantity);
                                await tx.product.update({
                                    where: { id: linkedProd.id },
                                    data: { stock: { increment: restoreQty } }
                                });
                            }
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
