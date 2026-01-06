import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, CheckCircle, AlertCircle, Clock, X, Loader2, Info, Code, FileText, TrendingUp, TrendingDown, DollarSign, PieChart, ArrowRight, Newspaper, BarChart3 } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Mock Data (Consolidated for brevity, same as source)
const MOCK_PORTFOLIO = {
  accounts: [
    { id: 'ACC001', name: 'Investment Account', type: 'Brokerage', balance: 1250000.00, currency: 'USD', performance: 12.5 },
    { id: 'ACC002', name: 'Retirement Account', type: '401(k)', balance: 850000.00, currency: 'USD', performance: 8.3 },
    { id: 'ACC003', name: 'Trading Account', type: 'Active Trading', balance: 450000.00, currency: 'USD', performance: -2.1 }
  ],
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', quantity: 2500, avgPrice: 150.00, currentPrice: 178.50, market: 'NASDAQ', currency: 'USD' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', quantity: 1200, avgPrice: 320.00, currentPrice: 378.91, market: 'NASDAQ', currency: 'USD' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 800, avgPrice: 125.00, currentPrice: 140.25, market: 'NASDAQ', currency: 'USD' },
    { symbol: 'TSLA', name: 'Tesla Inc.', quantity: 500, avgPrice: 200.00, currentPrice: 242.84, market: 'NASDAQ', currency: 'USD' },
    { symbol: 'NOVN', name: 'Novartis AG', quantity: 3000, avgPrice: 85.00, currentPrice: 95.20, market: 'SIX', currency: 'CHF' },
    { symbol: 'NESN', name: 'Nestlé S.A.', quantity: 2000, avgPrice: 92.00, currentPrice: 87.45, market: 'SIX', currency: 'CHF' }
  ],
  totalValue: 2550000.00,
  todayChange: 15420.00,
  todayChangePercent: 0.61
};

const MOCK_NEWS = [
  { id: 1, symbol: 'AAPL', title: 'Apple announces new AI features for iPhone', sentiment: 'positive', time: '2h ago' },
  { id: 2, symbol: 'MSFT', title: 'Microsoft Cloud revenue exceeds expectations', sentiment: 'positive', time: '4h ago' },
  { id: 3, symbol: 'TSLA', title: 'Tesla delivery numbers beat analyst estimates', sentiment: 'positive', time: '1d ago' },
  { id: 4, symbol: 'GOOGL', title: 'Alphabet faces regulatory challenges in EU', sentiment: 'negative', time: '1d ago' }
];

const SECURITIES = [
  { symbol: 'AAPL', market: 'NASDAQ', currency: 'USD', name: 'Apple Inc.', price: 178.50 },
  { symbol: 'GOOGL', market: 'NASDAQ', currency: 'USD', name: 'Alphabet Inc.', price: 140.25 },
  { symbol: 'MSFT', market: 'NASDAQ', currency: 'USD', name: 'Microsoft Corporation', price: 378.91 },
  { symbol: 'TSLA', market: 'NASDAQ', currency: 'USD', name: 'Tesla Inc.', price: 242.84 },
  { symbol: 'NOVN', market: 'SIX', currency: 'CHF', name: 'Novartis AG', price: 95.20 },
  { symbol: 'NESN', market: 'SIX', currency: 'CHF', name: 'Nestlé S.A.', price: 87.45 },
];

const MARKET_STATUS = {
  NASDAQ: { open: false, nextOpen: '2025-11-03 09:30' },
  SIX: { open: false, nextOpen: '2025-11-03 09:00' }
};

const WORKFLOW_STAGES = [
  { id: 'entry', label: 'Order Entry', icon: '📝' },
  { id: 'validation', label: 'Order Validation', icon: '✓' },
  { id: 'submission', label: 'Order Submission', icon: '📤' },
  { id: 'market', label: 'Market Order', icon: '📊' },
  { id: 'execution', label: 'Execution', icon: '✅' }
];

const ALGO_SUGGESTIONS = [
  { id: 'vwap', name: 'VWAP', description: 'Volume Weighted Average Price', useCase: 'Best for large orders' },
  { id: 'twap', name: 'TWAP', description: 'Time Weighted Average Price', useCase: 'Consistent execution' },
  { id: 'pov', name: 'POV', description: 'Percentage of Volume', useCase: 'Market rhythm execution' }
];

// API Service Functions
const apiService = {
  async parseOrder(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parse-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return response.ok ? await response.json() : this.parseOrderLocal(text);
    } catch { return this.parseOrderLocal(text); }
  },

  parseOrderLocal(text) {
    const inputLower = text.toLowerCase();
    const parsed = { security: null, quantity: null, price: null, time_in_force: 'DAY', contact_method: 'phone' };
    const securityMatch = SECURITIES.find(s => inputLower.includes(s.symbol.toLowerCase()));
    if (securityMatch) parsed.security = securityMatch;
    
    const qtyMatch = text.match(/(\d+)\s*shares?/i);
    if (qtyMatch) parsed.quantity = parseInt(qtyMatch[1]);
    
    const priceMatch = text.match(/at\s+\$?(\d+\.?\d*)/i);
    if (priceMatch) parsed.price = parseFloat(priceMatch[1]);
    
    return parsed;
  }
};

export default function UBSIntegratedApp() {
  const [currentView, setCurrentView] = useState('portfolio');
  const [showGeneiChat, setShowGeneiChat] = useState(false);
  const [geneiInput, setGeneiInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [orderForm, setOrderForm] = useState({
    security: null, quantity: '', price: '', timeInForce: 'DAY', gtdDate: '', traderText: ''
  });
  const [workflowStage, setWorkflowStage] = useState('entry');
  const [aiSuggestion, setAiSuggestion] = useState(null);

  // FIXED: handleGeneiSubmit to prevent duplicate messages
  const handleGeneiSubmit = async () => {
    if (!geneiInput.trim()) return;

    const userMessage = { type: 'user', message: geneiInput, timestamp: new Date().toISOString() };
    setChatHistory(prev => [...prev, userMessage]);

    const input = geneiInput;
    setGeneiInput('');
    setIsProcessing(true);

    setTimeout(async () => {
      let response = '';
      const lowerInput = input.toLowerCase();

      // Logic check to prevent double message appending
      if (lowerInput.includes('buy') || lowerInput.includes('sell')) {
        const parsed = await apiService.parseOrder(input);
        setOrderForm(prev => ({ 
          ...prev, 
          security: parsed.security || prev.security,
          quantity: parsed.quantity?.toString() || prev.quantity,
          price: parsed.price?.toString() || prev.price
        }));
        response = "I've updated the order form with those details. Navigating to order entry...";
        setTimeout(() => setCurrentView('orderEntry'), 1500);
      } else if (lowerInput.includes('portfolio') || lowerInput.includes('summary')) {
        response = `📊 Total Value: $${MOCK_PORTFOLIO.totalValue.toLocaleString()}\nToday's Change: +$${MOCK_PORTFOLIO.todayChange}`;
      } else {
        response = "I'm here to help with your portfolio or orders. What would you like to do?";
      }

      const assistantMessage = { type: 'assistant', message: response, timestamp: new Date().toISOString() };
      setChatHistory(prev => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 800);
  };

  // FIXED: Improved Validation Logic
  const validateOrder = () => {
    setIsProcessing(true);
    setWorkflowStage('validation');

    setTimeout(() => {
      if (!orderForm.security) {
        setAiSuggestion({ message: 'Please select a security first.' });
        setIsProcessing(false);
        return;
      }

      const marketStatus = MARKET_STATUS[orderForm.security.market];
      if (!marketStatus.open && orderForm.timeInForce === 'DAY') {
        setAiSuggestion({
          message: `The ${orderForm.security.market} market is closed. Convert to GTD for next opening (${marketStatus.nextOpen})?`,
          action: 'convert_to_gtd',
          nextDate: marketStatus.nextOpen
        });
        setIsProcessing(false);
      } else {
        setWorkflowStage('submission');
        setIsProcessing(false);
      }
    }, 1000);
  };

  const handleAiAccept = () => {
    if (aiSuggestion?.action === 'convert_to_gtd') {
      setOrderForm(prev => ({ 
        ...prev, 
        timeInForce: 'GTD', 
        gtdDate: aiSuggestion.nextDate.split(' ')[0] 
      }));
      setAiSuggestion(null);
      // Stay in validation stage instead of resetting to entry
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b-4 border-red-600 p-4 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-red-600">UBS</h1>
          <span className="text-gray-500">Wealth Management</span>
        </div>
        <button 
          onClick={() => setShowGeneiChat(!showGeneiChat)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
        >
          <div className="w-6 h-6 bg-white text-red-600 rounded-full flex items-center justify-center font-bold">X</div>
          Ask XAi
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* View Switcher Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {currentView === 'portfolio' ? (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Portfolio Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <p className="text-gray-500 text-sm">Total Value</p>
                  <p className="text-2xl font-bold">${MOCK_PORTFOLIO.totalValue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <p className="text-gray-500 text-sm">Today's Change</p>
                  <p className="text-2xl font-bold text-green-600">+{MOCK_PORTFOLIO.todayChangePercent}%</p>
                </div>
                <button onClick={() => setCurrentView('orderEntry')} className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 font-bold hover:bg-red-100 transition">
                  Place New Trade →
                </button>
              </div>
              <h3 className="font-bold mb-4">Current Holdings</h3>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {MOCK_PORTFOLIO.holdings.map(h => (
                  <div key={h.symbol} className="p-4 border-b flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-bold">{h.symbol}</p>
                      <p className="text-xs text-gray-500">{h.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${(h.quantity * h.currentPrice).toLocaleString()}</p>
                      <p className="text-xs text-green-600">+{h.quantity} shares</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">Order Management</h2>
                  <button onClick={() => setCurrentView('portfolio')} className="text-gray-400 hover:text-gray-600"><X /></button>
               </div>
               
               <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security</label>
                    <select 
                      className="w-full border rounded-lg p-3"
                      value={orderForm.security?.symbol || ''}
                      onChange={(e) => setOrderForm({...orderForm, security: SECURITIES.find(s => s.symbol === e.target.value) || null})}
                    >
                      <option value="">Select Security...</option>
                      {SECURITIES.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} - {s.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input 
                        type="number" 
                        className="w-full border rounded-lg p-3" 
                        value={orderForm.quantity}
                        onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                      <input 
                        type="number" 
                        className="w-full border rounded-lg p-3" 
                        placeholder="Market"
                        value={orderForm.price}
                        onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                      />
                    </div>
                  </div>

                  {aiSuggestion && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
                      <AlertCircle className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800">{aiSuggestion.message}</p>
                        {aiSuggestion.action && (
                          <button 
                            onClick={handleAiAccept}
                            className="mt-2 text-sm font-bold text-amber-700 underline"
                          >
                            Accept Suggestion
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={validateOrder}
                    disabled={isProcessing}
                    className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {isProcessing ? 'Processing...' : 'Review Order'}
                  </button>
               </div>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {showGeneiChat && (
          <aside className="w-96 border-l bg-white flex flex-col shadow-xl">
            <div className="p-4 bg-red-600 text-white font-bold flex justify-between">
              <span>XAi Assistant</span>
              <button onClick={() => setShowGeneiChat(false)}><X size={20}/></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.type === 'user' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input 
                className="flex-1 border rounded-lg p-2 text-sm" 
                placeholder="Type instructions..." 
                value={geneiInput}
                onChange={(e) => setGeneiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneiSubmit()}
              />
              <button onClick={handleGeneiSubmit} className="bg-red-600 text-white p-2 rounded-lg"><Send size={18}/></button>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
