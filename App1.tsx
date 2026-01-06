import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, CheckCircle, AlertCircle, Clock, X, Loader2, Info, Code, FileText, TrendingUp, TrendingDown, DollarSign, PieChart, ArrowRight, Newspaper, BarChart3 } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Mock Portfolio Data
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
  { id: 'twap', name: 'TWAP', description: 'Time Weighted Average Price', useCase: 'Ideal for consistent execution' },
  { id: 'pov', name: 'POV', description: 'Percentage of Volume', useCase: 'Good for market rhythm' },
  { id: 'implementation_shortfall', name: 'Implementation Shortfall', description: 'Balances urgency and impact', useCase: 'Optimal for alpha strategies' }
];

// API Service
const apiService = {
  parseOrderLocal(text) {
    const inputLower = text.toLowerCase();
    const parsed = { security: null, quantity: null, price: null, time_in_force: 'DAY', contact_method: 'phone' };
    
    const securityMatch = SECURITIES.find(s => 
      inputLower.includes(s.symbol.toLowerCase()) || inputLower.includes(s.name.toLowerCase())
    );
    if (securityMatch) parsed.security = securityMatch;
    
    const qtyPatterns = [/(\d+)\s*shares?/i, /(\d+)\s*units?/i, /buy\s+(\d+)/i, /sell\s+(\d+)/i];
    for (const pattern of qtyPatterns) {
      const match = text.match(pattern);
      if (match) {
        parsed.quantity = parseInt(match[1]);
        break;
      }
    }
    
    const pricePatterns = [/at\s+\$?(\d+\.?\d*)/i, /price\s+\$?(\d+\.?\d*)/i, /\$(\d+\.?\d*)/i];
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        const price = parseFloat(match[1]);
        if (price > 0 && price < 10000) {
          parsed.price = price;
          break;
        }
      }
    }
    
    if (inputLower.includes('gtc')) parsed.time_in_force = 'GTC';
    else if (inputLower.includes('gtd')) parsed.time_in_force = 'GTD';
    else if (inputLower.includes('fok')) parsed.time_in_force = 'FOK';
    
    return parsed;
  }
};

// ============================================================================
// PORTFOLIO XAI CHAT COMPONENT
// ============================================================================
function PortfolioXAiChat({ onNavigateToTrade, onShowNews, setNewsFilter }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([{
    type: 'assistant',
    message: 'Hello! I\'m XAi, your portfolio assistant. I can help you with:\n\n📊 Portfolio insights\n📰 Market news\n💼 Placing trades\n📈 Investment analysis',
    timestamp: new Date().toISOString()
  }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const calculateGainLoss = (holding) => {
    const totalCost = holding.quantity * holding.avgPrice;
    const currentValue = holding.quantity * holding.currentPrice;
    const gainLoss = currentValue - totalCost;
    const gainLossPercent = ((currentValue - totalCost) / totalCost) * 100;
    return { gainLoss, gainLossPercent };
  };

  const generatePortfolioSummary = () => {
    const totalGainLoss = MOCK_PORTFOLIO.holdings.reduce((sum, h) => sum + calculateGainLoss(h).gainLoss, 0);
    const totalGainLossPercent = (totalGainLoss / (MOCK_PORTFOLIO.totalValue - totalGainLoss)) * 100;
    const topPerformer = MOCK_PORTFOLIO.holdings.reduce((best, h) => {
      const pct = calculateGainLoss(h).gainLossPercent;
      return !best || pct > calculateGainLoss(best).gainLossPercent ? h : best;
    }, null);
    
    return `📊 Portfolio Summary:\n\n💰 Total: $${MOCK_PORTFOLIO.totalValue.toLocaleString()}\n📈 Gain/Loss: $${Math.abs(totalGainLoss).toLocaleString()} (${totalGainLossPercent.toFixed(2)}%)\n📅 Today: $${MOCK_PORTFOLIO.todayChange.toLocaleString()} (${MOCK_PORTFOLIO.todayChangePercent.toFixed(2)}%)\n🎯 Top: ${topPerformer?.symbol}\n\n📁 ${MOCK_PORTFOLIO.holdings.length} securities • 💼 ${MOCK_PORTFOLIO.accounts.length} accounts`;
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    const userMsg = { type: 'user', message: input, timestamp: new Date().toISOString() };
    setHistory(prev => [...prev, userMsg]);
    
    const userInput = input;
    setInput('');
    setIsProcessing(true);

    setTimeout(() => {
      let response = '';
      const lower = userInput.toLowerCase();

      if (lower.match(/\b(buy|sell|trade|order)\b/)) {
        const parsed = apiService.parseOrderLocal(userInput);
        const traderText = lower.includes('vwap') ? 'VWAP Market Close' : 
                          lower.includes('twap') ? 'TWAP over 2 hours' : 
                          lower.includes('pov') ? 'POV 10% participation' : '';
        
        response = '✓ Order parsed:\n';
        if (parsed.security) response += `\n• ${parsed.security.symbol} - ${parsed.security.name}`;
        if (parsed.quantity) response += `\n• Quantity: ${parsed.quantity}`;
        if (parsed.price) response += `\n• Price: $${parsed.price}`;
        if (traderText) response += `\n• Strategy: ${traderText}`;
        response += '\n\nNavigating to order entry...';
        
        setHistory(prev => [...prev, { type: 'assistant', message: response, timestamp: new Date().toISOString() }]);
        
        setTimeout(() => {
          onNavigateToTrade({ parsed, traderText });
        }, 2000);
        
        setIsProcessing(false);
        return;
      }
      
      if (lower.match(/\b(portfolio|summary|overview)\b/)) {
        response = generatePortfolioSummary();
      } else if (lower.match(/\b(news|latest|headlines)\b/)) {
        const symbol = MOCK_PORTFOLIO.holdings.find(h => lower.includes(h.symbol.toLowerCase()))?.symbol;
        response = `📰 Recent News${symbol ? ` for ${symbol}` : ''}:\n\n`;
        const news = symbol ? MOCK_NEWS.filter(n => n.symbol === symbol) : MOCK_NEWS;
        news.forEach(n => {
          response += `${n.sentiment === 'positive' ? '✅' : '⚠️'} ${n.symbol}: ${n.title}\n`;
        });
        if (symbol) {
          setNewsFilter(symbol);
          onShowNews(true);
        }
      } else if (lower.match(/\b(analyz|recommend)\b/)) {
        response = '📊 Portfolio Analysis:\n\n✅ Strengths:\n• Diversified sectors\n• Strong tech performers\n\n⚠️ Considerations:\n• NESN underperforming\n• High tech concentration\n\n💡 Suggestions:\n• Consider rebalancing\n• Review NESN position';
      } else {
        response = 'I can help with:\n\n📊 "Show portfolio"\n📰 "News on AAPL"\n💼 "Buy 100 MSFT"\n📈 "Analyze holdings"';
      }

      setHistory(prev => [...prev, { type: 'assistant', message: response, timestamp: new Date().toISOString() }]);
      setIsProcessing(false);
    }, 800);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl">
      <div className="p-4 border-b bg-gradient-to-r from-red-600 to-red-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 font-bold">X</div>
          <div>
            <div className="font-semibold text-white">XAi</div>
            <div className="text-xs text-red-100">Portfolio Assistant</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'assistant' && (
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mr-2">X</div>
            )}
            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.type === 'user' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
              <div className={`text-xs mt-1 ${msg.type === 'user' ? 'text-red-100' : 'text-gray-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSubmit()}
            placeholder="Ask about your portfolio..."
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => setInput('Show portfolio')} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">📊 Portfolio</button>
          <button onClick={() => setInput('Latest news')} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100">📰 News</button>
          <button onClick={() => setInput('Buy 100 AAPL')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">💼 Trade</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ORDER ENTRY XAI CHAT COMPONENT
// ============================================================================
function OrderEntryXAiChat({ orderForm, setOrderForm, onValidate }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([{
    type: 'assistant',
    message: 'Hello! I\'m XAi for order entry. I can help:\n\n📝 Fill order details\n✓ Validate order\n🔄 Modify parameters',
    timestamp: new Date().toISOString()
  }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    
    const userMsg = { type: 'user', message: input, timestamp: new Date().toISOString() };
    setHistory(prev => [...prev, userMsg]);
    
    const userInput = input;
    setInput('');
    setIsProcessing(true);

    setTimeout(() => {
      let response = '';
      const lower = userInput.toLowerCase();

      if (lower.match(/\b(validate|check|verify)\b/)) {
        if (!orderForm.security || !orderForm.quantity) {
          response = '⚠️ Cannot validate:\n';
          if (!orderForm.security) response += '\n• Security required';
          if (!orderForm.quantity) response += '\n• Quantity required';
        } else {
          response = `✓ Validating order:\n\n• ${orderForm.security.symbol}\n• ${orderForm.quantity} shares\n• ${orderForm.price || 'Market'}\n\nTriggering validation...`;
          setHistory(prev => [...prev, { type: 'assistant', message: response, timestamp: new Date().toISOString() }]);
          setTimeout(() => onValidate(), 1000);
          setIsProcessing(false);
          return;
        }
      } else if (lower.match(/\b(change|modify|set|update)\b/) || lower.match(/\b(buy|sell)\b/)) {
        const parsed = apiService.parseOrderLocal(userInput);
        const updates = {};
        
        // Handle quantity changes
        if (parsed.quantity) {
          updates.quantity = String(parsed.quantity);
        } else {
          // Try to extract just a number for quantity changes
          const qtyMatch = userInput.match(/\b(\d+)\b/);
          if (qtyMatch && lower.match(/\b(quantity|shares?|units?)\b/)) {
            updates.quantity = qtyMatch[1];
          }
        }
        
        // Handle price changes
        if (parsed.price) {
          updates.price = String(parsed.price);
        } else {
          // Try to extract price from patterns like "to 180" or "price 180"
          const priceMatch = userInput.match(/(?:to|price)\s+(\d+\.?\d*)/i);
          if (priceMatch) {
            updates.price = priceMatch[1];
          }
        }
        
        if (parsed.security) updates.security = parsed.security;
        if (parsed.time_in_force) updates.timeInForce = parsed.time_in_force;
        
        const traderText = lower.includes('vwap') ? 'VWAP Market Close' : 
                          lower.includes('twap') ? 'TWAP over 2 hours' : 
                          lower.includes('pov') ? 'POV 10% participation' : '';
        if (traderText) updates.traderText = traderText;
        
        setOrderForm(prev => ({ ...prev, ...updates }));
        
        response = '✓ Updated:\n';
        if (parsed.security) response += `\n• Security: ${parsed.security.symbol}`;
        if (updates.quantity) response += `\n• Quantity: ${updates.quantity}`;
        if (updates.price) response += `\n• Price: ${updates.price}`;
        if (parsed.time_in_force) response += `\n• Time in Force: ${parsed.time_in_force}`;
        if (traderText) response += `\n• Strategy: ${traderText}`;
        response += '\n\nReady to validate!';
      } else if (lower.match(/\b(cancel|clear|reset)\b/)) {
        setOrderForm({
          security: null,
          contactMethod: 'phone',
          quantity: '',
          price: '',
          timeInForce: 'DAY',
          gtdDate: '',
          traderText: ''
        });
        response = '✓ Form cleared';
      } else {
        response = 'I can help:\n\n📝 "Buy 100 AAPL at $180"\n✓ "Validate order"\n🔄 "Change quantity to 200"\n❌ "Clear form"';
      }

      setHistory(prev => [...prev, { type: 'assistant', message: response, timestamp: new Date().toISOString() }]);
      setIsProcessing(false);
    }, 800);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl">
      <div className="p-4 border-b bg-gradient-to-r from-red-600 to-red-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 font-bold">X</div>
          <div>
            <div className="font-semibold text-white">XAi</div>
            <div className="text-xs text-red-100">Order Assistant</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.type === 'assistant' && (
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mr-2">X</div>
            )}
            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.type === 'user' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
              <div className={`text-xs mt-1 ${msg.type === 'user' ? 'text-red-100' : 'text-gray-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSubmit()}
            placeholder="Order entry commands..."
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => setInput('Buy 100 AAPL at $180')} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">📝 Fill</button>
          <button onClick={() => setInput('Validate this order')} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100">✓ Validate</button>
          <button onClick={() => setInput('Change quantity to 200')} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100">🔄 Modify</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function UBSIntegratedApp() {
  const [currentView, setCurrentView] = useState('portfolio');
  const [showXAiChat, setShowXAiChat] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [newsFilter, setNewsFilter] = useState(null);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [backendStatus] = useState('disconnected');

  const [orderForm, setOrderForm] = useState({
    security: null,
    contactMethod: 'phone',
    quantity: '',
    price: '',
    timeInForce: 'DAY',
    gtdDate: '',
    traderText: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSecurityDropdown, setShowSecurityDropdown] = useState(false);
  const [filteredSecurities, setFilteredSecurities] = useState([]);
  const [workflowStage, setWorkflowStage] = useState('entry');
  const [validationStatus, setValidationStatus] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [selectedAlgo, setSelectedAlgo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      const filtered = SECURITIES.filter(s => 
        s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSecurities(filtered);
      setShowSecurityDropdown(true);
    } else {
      setFilteredSecurities([]);
      setShowSecurityDropdown(false);
    }
  }, [searchTerm]);

  const calculateGainLoss = (holding) => {
    const totalCost = holding.quantity * holding.avgPrice;
    const currentValue = holding.quantity * holding.currentPrice;
    const gainLoss = currentValue - totalCost;
    const gainLossPercent = ((currentValue - totalCost) / totalCost) * 100;
    return { gainLoss, gainLossPercent, currentValue };
  };

  const handleNavigateToTrade = ({ parsed, traderText }) => {
    const updates = {};
    if (parsed.security) updates.security = parsed.security;
    if (parsed.quantity) updates.quantity = String(parsed.quantity);
    if (parsed.price) updates.price = String(parsed.price);
    if (parsed.time_in_force) updates.timeInForce = parsed.time_in_force;
    if (traderText) updates.traderText = traderText;
    
    setOrderForm(prev => ({ ...prev, ...updates }));
    setCurrentView('orderEntry');
  };

  const handleSecuritySelect = (security) => {
    setOrderForm({ ...orderForm, security });
    setSearchTerm('');
    setShowSecurityDropdown(false);
  };

  const validateOrder = () => {
    setIsProcessing(true);
    setValidationStatus(null);
    setAiSuggestion(null);
    setWorkflowStage('validation');

    setTimeout(() => {
      if (!orderForm.security || !orderForm.quantity || parseInt(orderForm.quantity) <= 0) {
        setValidationStatus({ type: 'error', message: 'Please fill required fields' });
        setIsProcessing(false);
        return;
      }

      const marketStatus = MARKET_STATUS[orderForm.security.market];
      
      if (orderForm.timeInForce === 'DAY' && !marketStatus.open) {
        setValidationStatus({ type: 'warning', message: 'Market closed' });
        setAiSuggestion({
          message: `Market closed. Convert to GTD for ${marketStatus.nextOpen}?`,
          action: 'convert_to_gtd',
          nextDate: marketStatus.nextOpen
        });
        setIsProcessing(false);
        return;
      }

      setValidationStatus({ type: 'success', message: 'Order validated' });
      
      setTimeout(() => {
        setWorkflowStage('execution');
        setTimeout(() => {
          setCurrentView('portfolio');
          setOrderForm({
            security: null,
            contactMethod: 'phone',
            quantity: '',
            price: '',
            timeInForce: 'DAY',
            gtdDate: '',
            traderText: ''
          });
          setWorkflowStage('entry');
          setValidationStatus(null);
        }, 2000);
      }, 1500);
    }, 1000);
  };

  const handleAiSuggestion = (accept) => {
    if (aiSuggestion?.action === 'convert_to_gtd' && accept) {
      setOrderForm({
        ...orderForm,
        timeInForce: 'GTD',
        gtdDate: aiSuggestion.nextDate.split(' ')[0]
      });
      setAiSuggestion(null);
      setValidationStatus({ type: 'info', message: 'Converted to GTD' });
      setWorkflowStage('entry');
    } else {
      setAiSuggestion(null);
      setWorkflowStage('entry');
    }
  };

  if (currentView === 'portfolio') {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <div className="flex-1">
          <div className="bg-white border-b-4 border-red-600">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-red-600 font-bold text-3xl">UBS</div>
                <div className="h-8 w-px bg-gray-300"></div>
                <div className="text-gray-700 font-medium">Wealth Management</div>
              </div>
              <button
                onClick={() => setShowXAiChat(!showXAiChat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  showXAiChat ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:border-red-600'
                }`}
              >
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">X</div>
                <span>Ask XAi</span>
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-2xl font-bold mb-6">Portfolio Overview</h1>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-lg p-6 text-white">
                <div className="text-sm mb-2">Total Portfolio Value</div>
                <div className="text-3xl font-bold">${MOCK_PORTFOLIO.totalValue.toLocaleString()}</div>
                <div className="text-sm mt-2 text-green-200">
                  +${MOCK_PORTFOLIO.todayChange.toLocaleString()} ({MOCK_PORTFOLIO.todayChangePercent}%)
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="text-sm text-gray-600 mb-2">Holdings</div>
                <div className="text-3xl font-bold">{MOCK_PORTFOLIO.holdings.length}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="text-sm text-gray-600 mb-2">Accounts</div>
                <div className="text-3xl font-bold">{MOCK_PORTFOLIO.accounts.length}</div>
              </div>
            </div>

            {/* Analytics Widget */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-sm p-6 mb-8 border border-blue-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <BarChart3 size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">💡 XAi Portfolio Insights</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <div>
                        <span className="font-semibold text-gray-800">Strong Tech Exposure:</span>
                        <span className="text-gray-700"> Your AAPL and MSFT positions are up 19% and 18.4% respectively. Consider taking partial profits.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">⚠</span>
                      <div>
                        <span className="font-semibold text-gray-800">NESN Underperforming:</span>
                        <span className="text-gray-700"> Down 5%, consider reviewing this position or averaging down if fundamentals remain strong.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">→</span>
                      <div>
                        <span className="font-semibold text-gray-800">Diversification Opportunity:</span>
                        <span className="text-gray-700"> 60% tech concentration. Consider adding bonds or international equities for better risk management.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-600 font-bold">★</span>
                      <div>
                        <span className="font-semibold text-gray-800">Rebalancing Suggestion:</span>
                        <span className="text-gray-700"> Your portfolio has drifted from target allocation. Consider rebalancing quarterly to maintain risk profile.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market News Widget */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Newspaper size={20} className="text-red-600" />
                  Market News
                </h3>
                <button
                  onClick={() => setShowNews(true)}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {MOCK_NEWS.slice(0, 3).map(news => (
                  <div key={news.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className={`text-xl flex-shrink-0 ${news.sentiment === 'positive' ? '✅' : '⚠️'}`}>
                      {news.sentiment === 'positive' ? '✅' : '⚠️'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-white rounded text-xs font-semibold text-gray-700 border">
                          {news.symbol}
                        </span>
                        <span className="text-xs text-gray-500">{news.time}</span>
                      </div>
                      <div className="text-sm text-gray-800">{news.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gain/Loss</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">News</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_PORTFOLIO.holdings.map(holding => {
                    const { gainLoss, gainLossPercent, currentValue } = calculateGainLoss(holding);
                    const holdingNews = MOCK_NEWS.filter(n => n.symbol === holding.symbol);
                    return (
                      <tr key={holding.symbol} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold">{holding.symbol}</div>
                          <div className="text-xs text-gray-500">{holding.name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">{holding.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">${holding.currentPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm font-medium">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">
                          <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLoss >= 0 ? '+' : ''}${Math.abs(gainLoss).toFixed(2)}
                            <div className="text-xs">({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {holdingNews.length > 0 ? (
                            <button
                              onClick={() => {
                                setNewsFilter(holding.symbol);
                                setShowNews(true);
                              }}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                            >
                              <Newspaper size={14} />
                              {holdingNews.length} {holdingNews.length === 1 ? 'article' : 'articles'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">No news</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setOrderForm(prev => ({ ...prev, security: SECURITIES.find(s => s.symbol === holding.symbol) }));
                              setCurrentView('orderEntry');
                            }}
                            className="text-red-600 hover:text-red-700 font-medium text-sm"
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* News Modal */}
            {showNews && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
                  <div className="p-6 border-b flex items-center justify-between">
                    <h3 className="text-xl font-bold">
                      Market News {newsFilter && `- ${newsFilter}`}
                    </h3>
                    <button
                      onClick={() => {
                        setShowNews(false);
                        setNewsFilter(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {(newsFilter ? MOCK_NEWS.filter(n => n.symbol === newsFilter) : MOCK_NEWS).map(news => (
                      <div key={news.id} className="p-4 border rounded-lg hover:border-red-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                              {news.symbol}
                            </span>
                            <span className={`text-xs ${news.sentiment === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                              {news.sentiment === 'positive' ? '✅' : '⚠️'} {news.sentiment}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{news.time}</span>
                        </div>
                        <div className="font-medium text-gray-800">{news.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showXAiChat && (
          <PortfolioXAiChat
            onNavigateToTrade={handleNavigateToTrade}
            onShowNews={setShowNews}
            setNewsFilter={setNewsFilter}
          />
        )}
      </div>
    );
  }

  // Order Entry View
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1">
        <div className="bg-white border-b-4 border-red-600">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-red-600 font-bold text-3xl">UBS</div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="text-gray-700 font-medium">Order Management</div>
              <button
                onClick={() => setCurrentView('portfolio')}
                className="ml-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                ← Portfolio
              </button>
            </div>
            <button
              onClick={() => setShowXAiChat(!showXAiChat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                showXAiChat ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border hover:border-red-600'
              }`}
            >
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">X</div>
              <span>Ask XAi</span>
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Workflow</h2>
            <div className="flex items-center justify-between">
              {WORKFLOW_STAGES.map((stage, idx) => {
                const currentIdx = WORKFLOW_STAGES.findIndex(s => s.id === workflowStage);
                const isActive = idx === currentIdx;
                const isComplete = idx < currentIdx;
                return (
                  <React.Fragment key={stage.id}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        isActive ? 'bg-red-600 text-white ring-4 ring-red-100' : 
                        isComplete ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {stage.icon}
                      </div>
                      <div className={`text-xs font-medium ${
                        isActive ? 'text-red-600' : isComplete ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {stage.label}
                      </div>
                    </div>
                    {idx < WORKFLOW_STAGES.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 ${idx < currentIdx ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Order Entry</h2>

              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1">Security</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                {showSecurityDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredSecurities.map(sec => (
                      <div
                        key={sec.symbol}
                        onClick={() => handleSecuritySelect(sec)}
                        className="px-4 py-3 hover:bg-red-50 cursor-pointer"
                      >
                        <div className="font-medium">{sec.symbol} · {sec.market}</div>
                        <div className="text-sm text-gray-600">{sec.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {orderForm.security && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{orderForm.security.symbol}</div>
                      <div className="text-sm text-gray-600">{orderForm.security.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Price</div>
                      <div className="font-semibold">${orderForm.security.price}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    placeholder="100"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <input
                    type="number"
                    value={orderForm.price}
                    onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                    placeholder="Market"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Time in Force</label>
                <div className="grid grid-cols-4 gap-2">
                  {['DAY', 'GTD', 'GTC', 'FOK'].map(tif => (
                    <button
                      key={tif}
                      onClick={() => setOrderForm({ ...orderForm, timeInForce: tif })}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        orderForm.timeInForce === tif ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {tif}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={validateOrder}
                disabled={isProcessing}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Clock size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                Validate Order
              </button>
            </div>

            <div className="space-y-6">
              {validationStatus && (
                <div className={`rounded-lg p-4 border-l-4 ${
                  validationStatus.type === 'success' ? 'bg-green-50 border-green-600' :
                  validationStatus.type === 'error' ? 'bg-red-50 border-red-600' :
                  'bg-orange-50 border-orange-600'
                }`}>
                  <div className="flex items-start gap-3">
                    {validationStatus.type === 'success' ? (
                      <CheckCircle className="text-green-600" size={24} />
                    ) : (
                      <AlertCircle className="text-orange-600" size={24} />
                    )}
                    <div>
                      <div className="font-semibold mb-1">
                        {validationStatus.type === 'success' ? 'Success' : 'Notice'}
                      </div>
                      <div className="text-sm">{validationStatus.message}</div>
                    </div>
                  </div>
                </div>
              )}

              {aiSuggestion && (
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">X</div>
                    <div>
                      <div className="font-semibold mb-1">XAi Suggestion</div>
                      <div className="text-sm text-gray-700">{aiSuggestion.message}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAiSuggestion(true)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleAiSuggestion(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Security:</span>
                    <span className="font-medium">{orderForm.security?.symbol || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{orderForm.quantity || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">{orderForm.price || 'Market'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showXAiChat && (
        <OrderEntryXAiChat
          orderForm={orderForm}
          setOrderForm={setOrderForm}
          onValidate={validateOrder}
        />
      )}
    </div>
  );
}
