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
            include: { paymentMethod: true }
        });

        if (!sale) {
            throw new Error('Venta no encontrada');
        }

        // 2. Obtener el nuevo método de pago
        const newPaymentMethod = await prisma.paymentMethod.findUnique({
            where: { id: paymentMethodId }
        });

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

                        // Ya no creamos un CashMovement aquí para evitar doble conteo.
                        // La sesión calculará automáticamente esto sumando las ventas en efectivo.
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

            return await tx.sale.update({
                where: { id: saleId },
                data: dataToUpdate
            });
        });
    }

    async addAbono(saleId, amount, paymentMethodId, userId) {
        return await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findUnique({
                where: { id: saleId },
                include: { paymentMethod: true, customer: true }
            });

            if (!sale) throw new Error('Venta no encontrada');
            if (!sale.customerId) throw new Error('La venta no está asociada a un cliente');
            if (amount <= 0 || amount > sale.finalAmount) throw new Error('Monto de abono inválido o superior al total de la factura');

            // Encontrar la sesión activa del usuario
            const activeSession = await tx.cashSession.findFirst({
                where: { userId, status: 'OPEN' }
            });

            if (!activeSession) {
                throw new Error('Debe tener una caja abierta para registrar un abono');
            }

            const paymentMethod = await tx.paymentMethod.findUnique({ where: { id: paymentMethodId } });

            // 1. Reducir deuda del cliente
            await tx.customer.update({
                where: { id: sale.customerId },
                data: { balance: { decrement: amount } }
            });

            // 2. Registrar el abono (PAYMENT)
            await tx.customerCredit.create({
                data: {
                    customerId: sale.customerId,
                    type: 'PAYMENT',
                    amount: amount,
                    description: `Abono a Factura #${sale.invoiceNumber || saleId}`,
                    saleId: sale.id,
                    paymentMethodId: paymentMethodId,
                    cashSessionId: activeSession.id
                }
            });

            // 3. Ya no creamos movimiento de caja extra aquí.
            // La función de caja (getHistory) sumariza automáticamente los abonos
            // en efectivo o tarjeta basándose en los registros de CustomerCredit.

            // 4. Modificar el valor de la factura
            let updateData;

            // Si es un pago TOTAL: restaurar finalAmount al valor original (totalAmount)
            // para que la factura quede como una factura normal completamente pagada
            if (Number(amount) === Number(sale.finalAmount)) {
                updateData = {
                    finalAmount: sale.totalAmount,  // Restaurar al monto original
                    paymentMethodId: paymentMethodId // Cambiar método de crédito al real
                };
            } else {
                // Abono PARCIAL: simplemente descontar del saldo pendiente
                updateData = { finalAmount: { decrement: amount } };
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
                            product: true
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

            // 2. Revertir stock de productos directos (trackStock)
            for (const d of sale.details) {
                if (d.product?.trackStock) {
                    await tx.product.update({
                        where: { id: d.productId },
                        data: { stock: { increment: d.quantity } }
                    });
                }
            }

            // 3. Revertir saldos de crédito de cliente si los hubo
            if (sale.customerId) {
                const debtCredits = (sale.customerCredits || []).filter(c => c.type === 'DEBT');
                const totalDebt = debtCredits.reduce((acc, c) => acc + parseFloat(c.amount || 0), 0);
                if (totalDebt > 0) {
                    await tx.customer.update({
                        where: { id: sale.customerId },
                        data: { balance: { decrement: totalDebt } }
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

            // 5. Eliminar la venta para retirarla de la sesión de caja y reportes
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