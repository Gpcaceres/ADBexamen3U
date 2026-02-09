import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, DollarSign, CheckCircle, AlertCircle, Plus, History, LogOut, ArrowRight, Sparkles } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

export default function ClientApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  
  const [step, setStep] = useState('input');
  const [paymentCode, setPaymentCode] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);

  const [rechargeAmount, setRechargeAmount] = useState('');
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('deuna_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setView('home');
      refreshUserBalance(userData.userId);
    }
  }, []);

  const refreshUserBalance = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const updatedUser = { ...user, balance: data.balance };
        setUser(updatedUser);
        localStorage.setItem('deuna_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Error actualizando saldo:', err);
    }
  };

  const handleLogin = async () => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data);
        localStorage.setItem('deuna_user', JSON.stringify(data));
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
      const response = await fetch(`${API_URL}/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data);
        localStorage.setItem('deuna_user', JSON.stringify(data));
        setView('home');
      } else {
        setError(data.error || 'Error al registrarse');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  const handleRecharge = async () => {
    setError('');
    const amount = parseFloat(rechargeAmount);
    
    if (!amount || amount <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${user.userId}/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser({ ...user, balance: data.newUserBalance });
        localStorage.setItem('deuna_user', JSON.stringify({ ...user, balance: data.newUserBalance }));
        setRechargeAmount('');
        setView('home');
        alert(`¡Recarga exitosa! Nuevo saldo: $${data.newUserBalance.toFixed(2)}`);
      } else {
        setError(data.error || 'Error al recargar');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${user.userId}/transactions`);
      const data = await response.json();
      setTransactions(data.transactions || []);
      setView('history');
    } catch (err) {
      setError('Error al cargar historial');
    }
  };

  const queryPaymentCode = async () => {
    if (paymentCode.length !== 8) {
      setError('El código debe tener 8 dígitos');
      return;
    }

    setError('');
    setStep('processing');

    try {
      const response = await fetch(`${API_URL}/payments/query/${paymentCode}`);
      const data = await response.json();

      if (response.ok) {
        setOrderData(data);
        setStep('confirm');
      } else {
        setError(data.error || 'Código no encontrado');
        setStep('input');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setStep('input');
    }
  };

  const processPayment = async () => {
    setStep('processing');
    setError('');

    try {
      const response = await fetch(`${API_URL}/payments/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentCode,
          userId: user.userId,
          userName: user.name,
          paymentMethod: 'wallet'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentResult(data);
        setUser({ ...user, balance: data.newBalance });
        localStorage.setItem('deuna_user', JSON.stringify({ ...user, balance: data.newBalance }));
        setStep('success');
      } else {
        setError(data.error || 'Error al procesar el pago');
        setStep('error');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setStep('error');
    }
  };

  const resetPaymentFlow = () => {
    setStep('input');
    setPaymentCode('');
    setOrderData(null);
    setError('');
    setPaymentResult(null);
    setView('home');
  };

  const formatCode = (value) => {
    return value.replace(/\D/g, '').slice(0, 8);
  };

  const logout = () => {
    localStorage.removeItem('deuna_user');
    setUser(null);
    setView('login');
  };

  // ============ VISTA LOGIN ============
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">DEUNA</h1>
            <p className="text-gray-400">Tu billetera digital inteligente</p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre (para registro)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Tu nombre"
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
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={handleRegister}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 rounded-xl border border-zinc-700 transition-all"
              >
                Crear Cuenta
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              Cuenta demo: cliente@demo.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ VISTA HOME ============
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-md mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Hola,</p>
                <p className="text-white font-semibold">{user.name}</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-white transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <p className="text-emerald-100 text-sm mb-1">Balance disponible</p>
              <p className="text-white text-5xl font-bold mb-4">${user.balance.toFixed(2)}</p>
              <div className="flex items-center gap-2 text-emerald-100 text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Listo para pagar</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setView('recharge')}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-emerald-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition-colors">
                <Plus className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-white font-medium text-sm">Recargar</p>
              <p className="text-gray-500 text-xs mt-1">Agregar fondos</p>
            </button>

            <button
              onClick={loadTransactions}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-cyan-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-cyan-500/20 transition-colors">
                <History className="w-6 h-6 text-cyan-500" />
              </div>
              <p className="text-white font-medium text-sm">Historial</p>
              <p className="text-gray-500 text-xs mt-1">Ver actividad</p>
            </button>
          </div>

          <button
            onClick={() => setView('payment')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Pagar con código
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ============ VISTA RECARGA ============
  if (view === 'recharge') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-md mx-auto p-6">
          <button onClick={() => setView('home')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">
            ← Volver
          </button>
          
          <h2 className="text-3xl font-bold text-white mb-2">Recargar</h2>
          <p className="text-gray-400 mb-6">Agrega fondos a tu billetera</p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <p className="text-gray-400 text-sm mb-1">Saldo actual</p>
            <p className="text-white text-3xl font-bold">${user.balance.toFixed(2)}</p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">Monto a recargar</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="number"
                step="0.01"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 text-white text-xl rounded-2xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {[10, 25, 50, 100, 200, 500].map(amount => (
              <button
                key={amount}
                onClick={() => setRechargeAmount(amount.toString())}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/50 text-white py-3 rounded-xl font-medium transition-all"
              >
                ${amount}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            onClick={handleRecharge}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Confirmar Recarga
          </button>
        </div>
      </div>
    );
  }

  // ============ VISTA HISTORIAL ============
  if (view === 'history') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-md mx-auto p-6">
          <button onClick={() => setView('home')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">
            ← Volver
          </button>
          
          <h2 className="text-3xl font-bold text-white mb-2">Historial</h2>
          <p className="text-gray-400 mb-6">Tus transacciones recientes</p>

          <div className="space-y-3">
            {transactions.map(tx => (
              <div key={tx.transactionId} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-white font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(tx.createdAt).toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${tx.type === 'recharge' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'recharge' ? '+' : ''}{tx.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">${tx.balanceAfter.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}

            {transactions.length === 0 && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No hay transacciones aún</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ VISTA PAGO ============
  if (view === 'payment') {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-md mx-auto p-6">
          {step === 'input' && (
            <>
              <button onClick={() => setView('home')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">
                ← Volver
              </button>
              
              <h2 className="text-3xl font-bold text-white mb-2">Pagar</h2>
              <p className="text-gray-400 mb-6">Saldo: ${user.balance.toFixed(2)}</p>

              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Código de pago (8 dígitos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paymentCode}
                  onChange={(e) => setPaymentCode(formatCode(e.target.value))}
                  className="w-full px-4 py-6 bg-zinc-900 border border-zinc-800 text-white text-3xl font-mono text-center tracking-widest rounded-2xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="00000000"
                  maxLength={8}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={queryPaymentCode}
                disabled={paymentCode.length !== 8}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-gray-600 text-white font-semibold py-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none"
              >
                Consultar Pago
              </button>
            </>
          )}

          {step === 'confirm' && orderData && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Confirmar pago</h2>
                <p className="text-gray-400">Revisa los detalles</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <p className="text-gray-400 text-sm mb-1">Comercio</p>
                <p className="text-white text-xl font-bold mb-4">{orderData.merchantName}</p>
                
                <p className="text-gray-400 text-sm mb-1">Descripción</p>
                <p className="text-gray-300 mb-4">{orderData.description}</p>

                <div className="border-t border-zinc-800 pt-4">
                  <p className="text-gray-400 text-sm mb-2">Total a pagar</p>
                  <p className="text-white text-4xl font-bold">${orderData.amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tu saldo</span>
                  <span className="text-white font-bold text-lg">${user.balance.toFixed(2)}</span>
                </div>
                {user.balance < orderData.amount && (
                  <p className="text-sm text-red-400 mt-2">⚠️ Saldo insuficiente</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetPaymentFlow}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={processPayment}
                  disabled={user.balance < orderData.amount}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-gray-600 text-white font-semibold py-4 rounded-2xl transition-all"
                >
                  Pagar
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-20">
              <div className="w-20 h-20 border-4 border-zinc-800 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-xl font-semibold text-white">Procesando...</p>
              <p className="text-gray-500 mt-2">Un momento por favor</p>
            </div>
          )}

          {step === 'success' && paymentResult && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white mb-2">¡Pago exitoso!</h2>
                <p className="text-gray-400">Tu transacción se completó</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Monto</span>
                  <span className="text-white font-bold">${paymentResult.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Nuevo saldo</span>
                  <span className="text-emerald-500 font-bold">${paymentResult.newBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ID</span>
                  <span className="font-mono text-xs text-gray-500">
                    {paymentResult.paymentId.slice(0, 12)}...
                  </span>
                </div>
              </div>

              <button
                onClick={resetPaymentFlow}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 rounded-2xl transition-all"
              >
                Volver al inicio
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-12 h-12 text-red-500" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Error en el pago</h2>
                <p className="text-gray-400">{error}</p>
              </div>

              <button
                onClick={resetPaymentFlow}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 rounded-2xl transition-all"
              >
                Volver al inicio
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}