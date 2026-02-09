import React, { useState, useEffect } from 'react';
import { Store, DollarSign, Clock, CheckCircle, XCircle, LogOut, Sparkles, QrCode } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

export default function MerchantApp() {
  const [merchant, setMerchant] = useState(null);
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedMerchant = localStorage.getItem('deuna_merchant');
    if (savedMerchant) {
      const merchantData = JSON.parse(savedMerchant);
      setMerchant(merchantData);
      setView('home');
    }
  }, []);

  useEffect(() => {
    if (!currentOrder) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/orders/${currentOrder.orderId}/status`);
        const data = await response.json();
        setOrderStatus(data);

        if (data.status === 'completed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error al consultar estado:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentOrder]);

  const handleLogin = async () => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/merchants/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setMerchant(data);
        localStorage.setItem('deuna_merchant', JSON.stringify(data));
        setView('home');
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!name || !email) {
      setError('Completa todos los campos');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/merchants/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setMerchant(data);
        localStorage.setItem('deuna_merchant', JSON.stringify(data));
        setView('home');
      } else {
        setError(data.error || 'Error al registrarse');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  const createPaymentOrder = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant.merchantId,
          merchantName: merchant.name,
          amount: parseFloat(amount),
          description: description || 'Compra en tienda'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentOrder(data);
        setOrderStatus({ status: 'pending' });
      } else {
        alert('Error al crear orden');
      }
    } catch (error) {
      alert('Error de conexión con el servidor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetOrder = () => {
    setCurrentOrder(null);
    setOrderStatus(null);
    setAmount('');
    setDescription('');
  };

  const logout = () => {
    localStorage.removeItem('deuna_merchant');
    setMerchant(null);
    setView('login');
    resetOrder();
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-emerald-500';
      case 'expired': return 'text-red-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed': return 'Pago Completado';
      case 'expired': return 'Expirado';
      case 'pending': return 'Esperando Pago';
      default: return status;
    }
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl mb-4">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">DEUNA Business</h1>
            <p className="text-gray-400">Panel para comercios</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                  placeholder="comercio@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Comercio (para registro)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                  placeholder="Mi Tienda"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={handleRegister}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 rounded-xl border border-zinc-700 transition-all"
              >
                Registrar Comercio
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Cuenta demo: comercio@demo.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{merchant.name}</h1>
              <p className="text-gray-500 text-sm">Sistema de cobro</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>

        {!currentOrder ? (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <h2 className="text-xl font-bold text-white">Crear nuevo cobro</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monto a cobrar (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 text-white text-xl rounded-xl focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                    placeholder="Ej: Compra de productos"
                  />
                </div>

                <button
                  onClick={createPaymentOrder}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-gray-600 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      Generar Código de Pago
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3">Cómo funciona</h3>
              <ol className="space-y-2 text-gray-400 text-sm">
                <li className="flex gap-2">
                  <span className="text-violet-500 font-bold">1.</span>
                  Ingresa el monto a cobrar
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-500 font-bold">2.</span>
                  Se genera un código de 8 dígitos
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-500 font-bold">3.</span>
                  El cliente ingresa el código en su app
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-500 font-bold">4.</span>
                  Recibes el pago instantáneamente
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-6 h-6" />
                  <p className="text-sm font-medium opacity-90">Código de Pago</p>
                </div>
                <div className="text-7xl font-bold tracking-wider mb-4 font-mono text-center">
                  {currentOrder.paymentCode}
                </div>
                <p className="text-sm text-center opacity-75">El cliente debe ingresar este código</p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-gray-400">Monto</span>
                <span className="text-white text-3xl font-bold">
                  ${currentOrder.amount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Estado</span>
                <div className="flex items-center gap-2">
                  {orderStatus?.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  )}
                  {orderStatus?.status === 'expired' && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  {orderStatus?.status === 'pending' && (
                    <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                  )}
                  <span className={`font-semibold ${getStatusColor(orderStatus?.status)}`}>
                    {getStatusText(orderStatus?.status)}
                  </span>
                </div>
              </div>

              {orderStatus?.status === 'pending' && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm text-yellow-400">
                    <p className="font-semibold">Esperando pago del cliente</p>
                    <p className="text-yellow-500/80 mt-1">
                      El código expira en 15 minutos
                    </p>
                  </div>
                </div>
              )}

              {orderStatus?.status === 'completed' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div className="text-sm text-emerald-400">
                    <p className="font-semibold">¡Pago recibido exitosamente!</p>
                    <p className="text-emerald-500/80 mt-1">
                      ID: {orderStatus.paymentId?.slice(0, 16)}...
                    </p>
                  </div>
                </div>
              )}

              {orderStatus?.status === 'expired' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="text-sm text-red-400">
                    <p className="font-semibold">El código ha expirado</p>
                    <p className="text-red-500/80 mt-1">
                      Genera un nuevo código para cobrar
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={resetOrder}
              className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold py-4 rounded-xl transition-all"
            >
              Nuevo Cobro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}