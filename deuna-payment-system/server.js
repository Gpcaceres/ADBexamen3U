const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const MONGODB_URI = 'mongodb+srv://avillacres:1234AZ@cluster0.ppg8sv5.mongodb.net/';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch(err => console.error('Error conectando a MongoDB:', err));

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const merchantSchema = new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    paymentCode: { type: String, required: true, unique: true, index: true },
    merchantId: { type: String, required: true },
    merchantName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, default: 'Pago' },
    status: {
        type: String,
        enum: ['pending', 'completed', 'expired', 'cancelled'],
        default: 'pending'
    },
    paymentId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
});

const paymentSchema = new mongoose.Schema({
    paymentId: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    merchantId: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: {
        type: String,
        enum: ['completed', 'failed', 'refunded'],
        default: 'completed'
    },
    processedAt: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    type: {
        type: String,
        enum: ['recharge', 'payment', 'refund'],
        required: true
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String },
    relatedId: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const bankSchema = new mongoose.Schema({
    bankId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    balance: { type: Number, required: true, min: 0 },
    updatedAt: { type: Date, default: Date.now }
});

const bankTransactionSchema = new mongoose.Schema({
    bankTransactionId: { type: String, required: true, unique: true },
    type: {
        type: String,
        enum: ['user_creation', 'user_recharge', 'initial_deposit'],
        required: true
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String },
    relatedUserId: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Bank = mongoose.model('Bank', bankSchema);
const BankTransaction = mongoose.model('BankTransaction', bankTransactionSchema);
const User = mongoose.model('User', userSchema);
const Merchant = mongoose.model('Merchant', merchantSchema);
const Order = mongoose.model('Order', orderSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

function generatePaymentCode() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

// Inicializar banco si no existe
async function initializeBank() {
    try {
        let bank = await Bank.findOne();
        if (!bank) {
            const initialBalance = 100000;
            bank = new Bank({
                bankId: generateId(),
                name: 'Banco Central Deuna',
                balance: initialBalance
            });
            await bank.save();

            // Registrar transacción inicial del banco
            const bankTransaction = new BankTransaction({
                bankTransactionId: generateId(),
                type: 'initial_deposit',
                amount: initialBalance,
                balanceBefore: 0,
                balanceAfter: initialBalance,
                description: 'Depósito inicial del banco'
            });
            await bankTransaction.save();

            console.log('✅ Banco inicializado con $100,000');
        } else {
            console.log(`✅ Banco encontrado con balance: $${bank.balance}`);
        }
        return bank;
    } catch (error) {
        console.error('Error inicializando banco:', error);
    }
}

// Inicializar banco al arrancar
initializeBank();

// ENDPOINT: Crear usuario con balance inicial desde el banco
app.post('/api/users/create', async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Nombre y email son requeridos' });
        }

        // Verificar que existe el banco
        const bank = await Bank.findOne();
        if (!bank) {
            return res.status(500).json({ error: 'Sistema bancario no inicializado' });
        }

        const userId = generateId();
        const initialBalance = 100; // Balance inicial para nuevos usuarios

        // Verificar que el banco tiene fondos suficientes
        if (bank.balance < initialBalance) {
            return res.status(400).json({ 
                error: 'El banco no tiene fondos suficientes para crear nuevos usuarios',
                bankBalance: bank.balance,
                required: initialBalance
            });
        }

        const bankBalanceBefore = bank.balance;

        // Crear usuario con balance inicial
        const user = new User({
            userId,
            name,
            email,
            balance: initialBalance
        });

        // Descontar del banco
        bank.balance -= initialBalance;
        bank.updatedAt = new Date();
        
        await bank.save();
        await user.save();

        // Registrar transacción del banco
        const bankTransaction = new BankTransaction({
            bankTransactionId: generateId(),
            type: 'user_creation',
            amount: -initialBalance,
            balanceBefore: bankBalanceBefore,
            balanceAfter: bank.balance,
            description: `Balance inicial para usuario ${name}`,
            relatedUserId: userId
        });
        await bankTransaction.save();

        // Registrar transacción del usuario
        const transaction = new Transaction({
            transactionId: generateId(),
            userId,
            type: 'recharge',
            amount: initialBalance,
            balanceBefore: 0,
            balanceAfter: initialBalance,
            description: 'Balance inicial de bienvenida'
        });
        await transaction.save();

        res.json({
            success: true,
            userId,
            name,
            email,
            balance: initialBalance,
            bankBalance: bank.balance,
            message: `Cuenta creada con $${initialBalance} de bienvenida`
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// ENDPOINT: Obtener información de usuario
app.get('/api/users/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            userId: user.userId,
            name: user.name,
            email: user.email,
            balance: user.balance,
            createdAt: user.createdAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuario' });
    }
});

// ENDPOINT: Obtener transacciones de usuario
app.get('/api/users/:userId/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
});

// ENDPOINT: Login de usuario
app.post('/api/users/login', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            userId: user.userId,
            name: user.name,
            email: user.email,
            balance: user.balance
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar usuario' });
    }
});

// ENDPOINT: Recargar saldo de usuario desde el banco
app.post('/api/users/:userId/recharge', async (req, res) => {
    try {
        const { userId } = req.params;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Monto inválido' });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const bank = await Bank.findOne();
        if (!bank) {
            return res.status(500).json({ error: 'Banco no inicializado' });
        }

        // Verificar que el banco tiene fondos suficientes
        if (bank.balance < amount) {
            return res.status(400).json({
                error: 'Fondos insuficientes en el banco',
                bankBalance: bank.balance,
                requested: amount,
                missing: amount - bank.balance
            });
        }

        const userBalanceBefore = user.balance;
        const bankBalanceBefore = bank.balance;

        // Actualizar saldos
        user.balance += amount;
        user.updatedAt = new Date();
        bank.balance -= amount;
        bank.updatedAt = new Date();

        await user.save();
        await bank.save();

        // Registrar transacción del banco
        const bankTransaction = new BankTransaction({
            bankTransactionId: generateId(),
            type: 'user_recharge',
            amount: -amount,
            balanceBefore: bankBalanceBefore,
            balanceAfter: bank.balance,
            description: `Recarga para usuario ${user.name}`,
            relatedUserId: userId
        });
        await bankTransaction.save();

        // Registrar transacción del usuario
        const transaction = new Transaction({
            transactionId: generateId(),
            userId,
            type: 'recharge',
            amount,
            balanceBefore: userBalanceBefore,
            balanceAfter: user.balance,
            description: 'Recarga desde banco',
            relatedId: bankTransaction.bankTransactionId
        });
        await transaction.save();

        res.json({
            success: true,
            amountAdded: amount,
            newUserBalance: user.balance,
            bankBalance: bank.balance,
            transactionId: transaction.transactionId,
            message: `Se recargaron $${amount} a tu cuenta Deuna`
        });

    } catch (error) {
        console.error('Error en recarga:', error);
        res.status(500).json({ error: 'Error al procesar recarga' });
    }
});

// ENDPOINT: Obtener estado del banco
app.get('/api/bank/status', async (req, res) => {
    try {
        const bank = await Bank.findOne();
        if (!bank) {
            return res.status(404).json({ error: 'Banco no encontrado' });
        }

        res.json({
            success: true,
            bankId: bank.bankId,
            name: bank.name,
            balance: bank.balance,
            updatedAt: bank.updatedAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estado del banco' });
    }
});

// ENDPOINT: Obtener transacciones del banco
app.get('/api/bank/transactions', async (req, res) => {
    try {
        const transactions = await BankTransaction.find()
            .sort({ createdAt: -1 })
            .limit(100);

        const bank = await Bank.findOne();

        res.json({
            success: true,
            currentBalance: bank ? bank.balance : 0,
            transactions
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener transacciones del banco' });
    }
});

// ENDPOINT: Crear comercio
app.post('/api/merchants/create', async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Nombre y email son requeridos' });
        }

        const merchantId = generateId();
        const merchant = new Merchant({
            merchantId,
            name,
            email,
            balance: 0
        });

        await merchant.save();
        res.json({
            success: true,
            merchantId,
            name,
            email
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        res.status(500).json({ error: 'Error al crear comercio' });
    }
});

// ENDPOINT: Login de comercio
app.post('/api/merchants/login', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email es requerido' });
        }

        const merchant = await Merchant.findOne({ email });

        if (!merchant) {
            return res.status(404).json({ error: 'Comercio no encontrado' });
        }

        res.json({
            success: true,
            merchantId: merchant.merchantId,
            name: merchant.name,
            email: merchant.email,
            balance: merchant.balance
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar comercio' });
    }
});

// ENDPOINT: Crear orden de pago
app.post('/api/orders/create', async (req, res) => {
    try {
        const { merchantId, amount, description, merchantName } = req.body;

        if (!merchantId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        const merchant = await Merchant.findOne({ merchantId });
        if (!merchant) {
            return res.status(404).json({ error: 'Comercio no encontrado' });
        }

        const orderId = generateId();
        const paymentCode = generatePaymentCode();

        const order = new Order({
            orderId,
            paymentCode,
            merchantId,
            merchantName: merchantName || merchant.name,
            amount: parseFloat(amount),
            description: description || 'Pago',
            status: 'pending',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        await order.save();

        res.json({
            success: true,
            orderId,
            paymentCode,
            amount: order.amount,
            expiresAt: order.expiresAt
        });
    } catch (error) {
        console.error('Error creando orden:', error);
        res.status(500).json({ error: 'Error al crear orden' });
    }
});

// ENDPOINT: Consultar estado de orden
app.get('/api/orders/:orderId/status', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });

        if (!order) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        if (order.status === 'pending' && new Date() > order.expiresAt) {
            order.status = 'expired';
            await order.save();
        }

        res.json({
            orderId: order.orderId,
            status: order.status,
            amount: order.amount,
            paymentId: order.paymentId,
            createdAt: order.createdAt,
            expiresAt: order.expiresAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar orden' });
    }
});

// ENDPOINT: Consultar pago por código
app.get('/api/payments/query/:paymentCode', async (req, res) => {
    try {
        const order = await Order.findOne({ paymentCode: req.params.paymentCode });

        if (!order) {
            return res.status(404).json({ error: 'Código de pago no encontrado' });
        }

        if (order.status === 'pending' && new Date() > order.expiresAt) {
            order.status = 'expired';
            await order.save();
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                error: `La orden está ${order.status === 'expired' ? 'expirada' : 'ya procesada'}`
            });
        }

        res.json({
            orderId: order.orderId,
            merchantName: order.merchantName,
            amount: order.amount,
            description: order.description,
            expiresAt: order.expiresAt
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar pago' });
    }
});

// ENDPOINT: Procesar pago
app.post('/api/payments/process', async (req, res) => {
    try {
        const { paymentCode, userId, userName, paymentMethod } = req.body;

        if (!paymentCode || !userId || !paymentMethod) {
            return res.status(400).json({ error: 'Datos incompletos' });
        }

        const order = await Order.findOne({ paymentCode });
        if (!order) {
            return res.status(404).json({ error: 'Código de pago no encontrado' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'La orden ya fue procesada o expiró' });
        }

        if (new Date() > order.expiresAt) {
            order.status = 'expired';
            await order.save();
            return res.status(400).json({ error: 'El código de pago ha expirado' });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (user.balance < order.amount) {
            return res.status(400).json({
                error: 'Saldo insuficiente',
                currentBalance: user.balance,
                required: order.amount,
                missing: order.amount - user.balance
            });
        }

        const paymentId = generateId();
        const userBalanceBefore = user.balance;

        user.balance -= order.amount;
        user.updatedAt = new Date();
        await user.save();

        const merchant = await Merchant.findOne({ merchantId: order.merchantId });
        if (merchant) {
            merchant.balance += order.amount;
            merchant.updatedAt = new Date();
            await merchant.save();
        }

        const payment = new Payment({
            paymentId,
            orderId: order.orderId,
            userId,
            userName: userName || user.name,
            merchantId: order.merchantId,
            amount: order.amount,
            paymentMethod,
            status: 'completed'
        });
        await payment.save();

        const transaction = new Transaction({
            transactionId: generateId(),
            userId,
            type: 'payment',
            amount: -order.amount,
            balanceBefore: userBalanceBefore,
            balanceAfter: user.balance,
            description: `Pago a ${order.merchantName}`,
            relatedId: paymentId
        });
        await transaction.save();

        order.status = 'completed';
        order.paymentId = paymentId;
        await order.save();

        res.json({
            success: true,
            paymentId,
            orderId: order.orderId,
            amount: order.amount,
            newBalance: user.balance,
            status: 'completed',
            processedAt: payment.processedAt
        });
    } catch (error) {
        console.error('Error procesando pago:', error);
        res.status(500).json({ error: 'Error al procesar pago' });
    }
});

// ENDPOINT: Consultar pago por ID
app.get('/api/payments/:paymentId', async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });

        if (!payment) {
            return res.status(404).json({ error: 'Pago no encontrado' });
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar pago' });
    }
});

// ENDPOINT: Seed inicial
app.post('/api/seed', async (req, res) => {
    try {
        let bank = await Bank.findOne();
        if (!bank) {
            bank = new Bank({ 
                bankId: generateId(),
                name: 'Banco Central Deuna',
                balance: 100000 
            });
            await bank.save();

            const bankTransaction = new BankTransaction({
                bankTransactionId: generateId(),
                type: 'initial_deposit',
                amount: 100000,
                balanceBefore: 0,
                balanceAfter: 100000,
                description: 'Depósito inicial del banco'
            });
            await bankTransaction.save();
        }

        let user = await User.findOne({ email: 'cliente@demo.com' });
        if (!user) {
            const initialBalance = 100;
            const bankBalanceBefore = bank.balance;
            
            user = new User({
                userId: generateId(),
                name: 'Cliente Demo',
                email: 'cliente@demo.com',
                balance: initialBalance
            });
            
            bank.balance -= initialBalance;
            await bank.save();
            await user.save();

            const bankTransaction = new BankTransaction({
                bankTransactionId: generateId(),
                type: 'user_creation',
                amount: -initialBalance,
                balanceBefore: bankBalanceBefore,
                balanceAfter: bank.balance,
                description: 'Balance inicial para Cliente Demo',
                relatedUserId: user.userId
            });
            await bankTransaction.save();
        }

        let merchant = await Merchant.findOne({ email: 'comercio@demo.com' });
        if (!merchant) {
            merchant = new Merchant({
                merchantId: generateId(),
                name: 'Mi Tienda Demo',
                email: 'comercio@demo.com',
                balance: 0
            });
            await merchant.save();
        }

        res.json({
            success: true,
            bank: {
                bankId: bank.bankId,
                name: bank.name,
                balance: bank.balance
            },
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                balance: user.balance
            },
            merchant: {
                merchantId: merchant.merchantId,
                name: merchant.name,
                email: merchant.email,
                balance: merchant.balance
            }
        });
    } catch (error) {
        console.error('Error en seed:', error);
        res.status(500).json({ error: 'Error en seed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 API disponible en http://localhost:${PORT}/api`);
    console.log(`🗄️  Conectado a MongoDB`);
    console.log(`🏦 Sistema bancario activo`);
    console.log(`\n💡 Endpoints disponibles:`);
    console.log(`   POST /api/seed - Crear datos de prueba`);
    console.log(`   GET  /api/bank/status - Ver estado del banco`);
    console.log(`   GET  /api/bank/transactions - Ver transacciones del banco`);
    console.log(`   POST /api/users/create - Crear usuario (descuenta del banco)`);
    console.log(`   POST /api/users/:userId/recharge - Recargar saldo (descuenta del banco)`);
});

module.exports = app;