import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, CheckCircle, AlertCircle, Clock, X, Loader2, Info, Code, FileText, TrendingUp, TrendingDown, DollarSign, PieChart, ArrowRight, Newspaper, BarChart3 } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// Mock Portfolio Data
const MOCK_PORTFOLIO = {
  accounts: [
    {
      id: 'ACC001',
      name: 'Investment Account',
      type: 'Brokerage',
      balance: 1250000.00,
      currency: 'USD',
      performance: 12.5
    },
    {
      id: 'ACC002',
      name: 'Retirement Account',
      type: '401(k)',
      balance: 850000.00,
      currency: 'USD',
      performance: 8.3
    },
    {
      id: 'ACC003',
      name: 'Trading Account',
      type: 'Active Trading',
      balance: 450000.00,
      currency: 'USD',
      performance: -2.1
    }
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

// Mock News Data
const MOCK_NEWS = [
  { id: 1, symbol: 'AAPL', title: 'Apple announces new AI features for iPhone', sentiment: 'positive', time: '2h ago' },
  { id: 2, symbol: 'MSFT', title: 'Microsoft Cloud revenue exceeds expectations', sentiment: 'positive', time: '4h ago' },
  { id: 3, symbol: 'TSLA', title: 'Tesla delivery numbers beat analyst estimates', sentiment: 'positive', time: '1d ago' },
  { id: 4, symbol: 'GOOGL', title: 'Alphabet faces regulatory challenges in EU', sentiment: 'negative', time: '1d ago' }
];

// Securities Database (for OMS)
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
  { 
    id: 'vwap',
    name: 'VWAP', 
    description: 'Volume Weighted Average Price - Executes orders throughout the day to match VWAP',
    useCase: 'Best for large orders to minimize market impact'
  },
  { 
    id: 'twap',
    name: 'TWAP', 
    description: 'Time Weighted Average Price - Evenly distributes orders over time',
    useCase: 'Ideal for consistent execution without timing bias'
  },
  { 
    id: 'pov',
    name: 'POV (Participation)', 
    description: 'Percentage of Volume - Executes as a percentage of market volume',
    useCase: 'Good for following market rhythm'
  },
  { 
    id: 'implementation_shortfall',
    name: 'Implementation Shortfall', 
    description: 'Balances urgency and market impact dynamically',
    useCase: 'Optimal for alpha-seeking strategies'
  }
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
      if (!response.ok) throw new Error('Failed to parse order');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return this.parseOrderLocal(text);
    }
  },

  async parseTraderText(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parse-trader-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error('Failed to parse trader text');
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return this.parseTraderTextLocal(text);
    }
  },

  async getAutocompleteSuggestions(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/autocomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error('Failed to get suggestions');
      const suggestions = await response.json();
      return suggestions.length > 0 ? suggestions[0] : '';
    } catch (error) {
      console.error('API Error:', error);
      return this.getAutocompleteSuggestionsLocal(text);
    }
  },

  parseOrderLocal(text) {
    const inputLower = text.toLowerCase();
    const parsed = { security: null, quantity: null, price: null, time_in_force: 'DAY', contact_method: 'phone' };
    
    const securityMatch = SECURITIES.find(s => 
      inputLower.includes(s.symbol.toLowerCase()) || 
      inputLower.includes(s.name.toLowerCase())
    );
    if (securityMatch) parsed.security = securityMatch;
    
    // Extract quantity - more patterns
    const qtyPatterns = [
      /(\d+)\s*shares?/i,
      /(\d+)\s*units?/i,
      /buy\s+(\d+)/i,
      /sell\s+(\d+)/i,
      /(\d+)\s+of/i,
      /(\d+)\s*(?:shares?|units?)?.*(?:of|for)/i
    ];
    for (const pattern of qtyPatterns) {
      const match = text.match(pattern);
      if (match) {
        parsed.quantity = parseInt(match[1]);
        break;
      }
    }
    
    // Extract price - more patterns including dollar amounts
    const pricePatterns = [
      /at\s+\$?(\d+\.?\d*)/i,
      /price\s+\$?(\d+\.?\d*)/i,
      /limit\s+\$?(\d+\.?\d*)/i,
      /\$(\d+\.?\d*)/i,
      /(\d+\.?\d*)\s*(?:dollars?|usd|per share)/i,
      /@\s*\$?(\d+\.?\d*)/i
    ];
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        const price = parseFloat(match[1]);
        // Only use if it's a reasonable price (not a quantity or year)
        if (price > 0 && price < 10000) {
          parsed.price = price;
          break;
        }
      }
    }
    
    // Extract time in force
    if (inputLower.includes('gtc') || inputLower.includes('good til cancel') || inputLower.includes('good till cancel')) {
      parsed.time_in_force = 'GTC';
    } else if (inputLower.includes('gtd') || inputLower.includes('good til date') || inputLower.includes('good till date')) {
      parsed.time_in_force = 'GTD';
    } else if (inputLower.includes('fok') || inputLower.includes('fill or kill')) {
      parsed.time_in_force = 'FOK';
    }
    
    // Extract contact method
    if (inputLower.includes('email')) {
      parsed.contact_method = 'email';
    } else if (inputLower.includes('meeting') || inputLower.includes('in person')) {
      parsed.contact_method = 'meeting';
    } else if (inputLower.includes('portal') || inputLower.includes('online')) {
      parsed.contact_method = 'portal';
    }
    
    return parsed;
  },

  parseTraderTextLocal(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('vwap')) {
      return {
        structured: 'VWAP Market Close [16:00]',
        backend_format: 'VWAP|END=16:00|AUCTIONS=false|START=09:30',
        description: 'Execute order throughout the day to match the volume-weighted average price.',
        algo: 'vwap',
        parameters: { end_time: '16:00' },
        confidence: 0.9
      };
    }
    
    if (lowerText.includes('twap')) {
      return {
        structured: 'TWAP execution over trading day',
        backend_format: 'TWAP|DURATION=full day|SLICES=60',
        description: 'Distribute order evenly over the specified time period.',
        algo: 'twap',
        parameters: { duration: 'full day' },
        confidence: 0.9
      };
    }
    
    return {
      structured: `Custom execution: ${text}`,
      backend_format: `CUSTOM|${text}`,
      description: 'Custom execution strategy.',
      algo: null,
      parameters: {},
      confidence: 0.5
    };
  },

  getAutocompleteSuggestionsLocal(text) {
    const suggestions = {
      'vwap': 'VWAP Market Close',
      'twap': 'TWAP over 2 hours',
      'pov': 'POV 10% participation',
    };
    
    const key = Object.keys(suggestions).find(k => text.toLowerCase().startsWith(k));
    return key ? suggestions[key] : '';
  }
};

export default function UBSIntegratedApp() {
  const [currentView, setCurrentView] = useState('portfolio');
  const [showGeneiChat, setShowGeneiChat] = useState(false);
  const [geneiInput, setGeneiInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  // Initialize chat history based on current view
  useEffect(() => {
    if (currentView === 'portfolio') {
      setChatHistory([{
        type: 'assistant',
        message: 'Hello! I\'m XAi, your AI-powered portfolio assistant. I can help you with:\n\n📊 Portfolio insights and summaries\n📰 Market news for your holdings\n💼 Placing trades\n📈 Investment analysis\n\nWhat would you like to do today?',
        timestamp: new Date().toISOString()
      }]);
    } else {
      setChatHistory([{
        type: 'assistant',
        message: 'Hello! I\'m XAi, your order entry assistant. I can help you with:\n\n📝 Filling order details\n✓ Validating your order\n📤 Submitting orders\n🔄 Modifying order parameters\n\nWhat would you like to do?',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [currentView]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [showNews, setShowNews] = useState(false);
  const [newsFilter, setNewsFilter] = useState(null);

  // OMS State
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
  const [traderTextSuggestion, setTraderTextSuggestion] = useState('');
  const [isTraderTextLoading, setIsTraderTextLoading] = useState(false);
  const [structuredTraderText, setStructuredTraderText] = useState('');
  const [backendFormat, setBackendFormat] = useState('');
  const [traderTextDescription, setTraderTextDescription] = useState('');
  const [detectedAlgo, setDetectedAlgo] = useState(null);
  const [workflowStage, setWorkflowStage] = useState('entry');
  const [validationStatus, setValidationStatus] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [selectedAlgo, setSelectedAlgo] = useState(null);

  const chatEndRef = useRef(null);
  const debounceTimer = useRef(null);
  const traderTextRef = useRef(null);

  // Check backend on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        setBackendStatus('disconnected');
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Security search
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

  // Trader Text autocomplete
  useEffect(() => {
    if (orderForm.traderText.trim().length < 2) {
      setTraderTextSuggestion('');
      setStructuredTraderText('');
      setBackendFormat('');
      setTraderTextDescription('');
      setDetectedAlgo(null);
      return;
    }

    setIsTraderTextLoading(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const suggestion = await apiService.getAutocompleteSuggestions(orderForm.traderText);
        if (suggestion && suggestion.toLowerCase().startsWith(orderForm.traderText.toLowerCase())) {
          setTraderTextSuggestion(suggestion);
        } else {
          setTraderTextSuggestion('');
        }

        const result = await apiService.parseTraderText(orderForm.traderText);
        setStructuredTraderText(result.structured);
        setBackendFormat(result.backend_format || result.structured);
        setTraderTextDescription(result.description || 'Execution strategy parsed by AI');
        setDetectedAlgo(result.algo);
        
      } catch (error) {
        console.error('Error processing trader text:', error);
      } finally {
        setIsTraderTextLoading(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [orderForm.traderText]);

  const calculateGainLoss = (holding) => {
    const totalCost = holding.quantity * holding.avgPrice;
    const currentValue = holding.quantity * holding.currentPrice;
    const gainLoss = currentValue - totalCost;
    const gainLossPercent = ((currentValue - totalCost) / totalCost) * 100;
    return { gainLoss, gainLossPercent, currentValue };
  };

  const detectIntent = (text) => {
    const lowerText = text.toLowerCase();
    
    // Context-aware intent detection
    if (currentView === 'orderEntry') {
      // Order Entry specific intents
      if (lowerText.match(/\b(validate|check|verify|review)\b.*\b(order|trade)\b/)) {
        return 'validate_order';
      }
      if (lowerText.match(/\b(submit|place|execute|send)\b.*\b(order|trade)\b/)) {
        return 'submit_order';
      }
      if (lowerText.match(/\b(change|modify|update|set|fill)\b/)) {
        return 'modify_order';
      }
      if (lowerText.match(/\b(cancel|clear|reset)\b/)) {
        return 'cancel_order';
      }
      if (lowerText.match(/\b(buy|sell|trade|order|purchase)\b/)) {
        return 'fill_order_details';
      }
      return 'order_help';
    } else {
      // Portfolio page specific intents
      if (lowerText.match(/\b(buy|sell|trade|order|purchase|execute)\b/)) {
        return 'trade';
      }
      if (lowerText.match(/\b(portfolio|holdings|positions|summary|overview|balance|performance)\b/)) {
        return 'portfolio_summary';
      }
      if (lowerText.match(/\b(news|updates|latest|headlines|market)\b/)) {
        return 'news';
      }
      if (lowerText.match(/\b(analyze|analysis|recommend|should i|advice|opinion)\b/)) {
        return 'analysis';
      }
      return 'general';
    }
  };

  const generatePortfolioSummary = () => {
    const totalGainLoss = MOCK_PORTFOLIO.holdings.reduce((sum, holding) => {
      const { gainLoss } = calculateGainLoss(holding);
      return sum + gainLoss;
    }, 0);
    
    const totalGainLossPercent = (totalGainLoss / (MOCK_PORTFOLIO.totalValue - totalGainLoss)) * 100;
    
    const topPerformer = MOCK_PORTFOLIO.holdings.reduce((best, holding) => {
      const { gainLossPercent } = calculateGainLoss(holding);
      const bestPercent = best ? calculateGainLoss(best).gainLossPercent : -Infinity;
      return gainLossPercent > bestPercent ? holding : best;
    }, null);
    
    const topPerformerStats = topPerformer ? calculateGainLoss(topPerformer) : null;
    
    return `📊 Portfolio Summary:

💰 Total Value: $${MOCK_PORTFOLIO.totalValue.toLocaleString()}
${totalGainLoss >= 0 ? '📈' : '📉'} Total Gain/Loss: $${Math.abs(totalGainLoss).toLocaleString()} (${totalGainLossPercent.toFixed(2)}%)
📅 Today's Change: $${MOCK_PORTFOLIO.todayChange.toLocaleString()} (${MOCK_PORTFOLIO.todayChangePercent >= 0 ? '+' : ''}${MOCK_PORTFOLIO.todayChangePercent.toFixed(2)}%)

🎯 Top Performer: ${topPerformer?.symbol} - ${topPerformer?.name}
   Gain: $${topPerformerStats?.gainLoss.toLocaleString()} (${topPerformerStats?.gainLossPercent.toFixed(2)}%)

📁 Holdings: ${MOCK_PORTFOLIO.holdings.length} securities
💼 Accounts: ${MOCK_PORTFOLIO.accounts.length} accounts

Would you like me to show more details about any specific holding or account?`;
  };

  const generateNewsResponse = (symbol = null) => {
    const relevantNews = symbol 
      ? MOCK_NEWS.filter(n => n.symbol === symbol)
      : MOCK_NEWS;
    
    if (relevantNews.length === 0) {
      return `No recent news found${symbol ? ` for ${symbol}` : ''}.`;
    }
    
    let response = `📰 Recent Market News${symbol ? ` for ${symbol}` : ''}:\n\n`;
    relevantNews.forEach(news => {
      const emoji = news.sentiment === 'positive' ? '✅' : news.sentiment === 'negative' ? '⚠️' : 'ℹ️';
      response += `${emoji} ${news.symbol}: ${news.title}\n   (${news.time})\n\n`;
    });
    
    return response + 'Would you like to take any action based on this news?';
  };

   const handleGeneiSubmit = async () => {
    if (!geneiInput.trim()) return;

    const userMessage = {
      type: 'user',
      message: geneiInput,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, userMessage]);

    const input = geneiInput;
    setGeneiInput('');
    setIsProcessing(true);

    const intent = detectIntent(input);
    
    setTimeout(async () => {
      let response = '';
      
      if (intent === 'trade') {
        try {
          // Parse the order using the API service
          const parsed = await apiService.parseOrder(input);
          
          // Extract trader text/strategy from the input
          const traderTextKeywords = ['vwap', 'twap', 'pov', 'aggressive', 'urgent', 'market close', 'participation'];
          let detectedTraderText = '';
          
          for (const keyword of traderTextKeywords) {
            if (input.toLowerCase().includes(keyword)) {
              const words = input.split(' ');
              const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword));
              if (keywordIndex !== -1) {
                const start = Math.max(0, keywordIndex - 1);
                const end = Math.min(words.length, keywordIndex + 4);
                detectedTraderText = words.slice(start, end).join(' ');
                break;
              }
            }
          }
          
          if (input.toLowerCase().includes('vwap')) {
            detectedTraderText = 'VWAP Market Close';
          } else if (input.toLowerCase().includes('twap')) {
            detectedTraderText = 'TWAP over 2 hours';
          } else if (input.toLowerCase().includes('pov') || input.toLowerCase().includes('participation')) {
            const percentMatch = input.match(/(\d+)\s*%/);
            detectedTraderText = percentMatch ? `POV ${percentMatch[1]}% participation` : 'POV 10% participation';
          }
          
          const updates = {};
          if (parsed.security) updates.security = parsed.security;
          if (parsed.quantity) updates.quantity = parsed.quantity.toString();
          if (parsed.time_in_force) updates.timeInForce = parsed.time_in_force;
          if (parsed.price) updates.price = parsed.price.toString();
          if (parsed.contact_method) updates.contactMethod = parsed.contact_method;
          if (detectedTraderText) updates.traderText = detectedTraderText;
          
          setOrderForm(prev => ({ ...prev, ...updates }));

          response = '✓ Order parsed successfully:\n';
          if (parsed.security) response += `\n• Security: ${parsed.security.name} (${parsed.security.symbol})`;
          if (parsed.quantity) response += `\n• Quantity: ${parsed.quantity} shares`;
          if (parsed.price) response += `\n• Price: ${parsed.price}`;
          else response += `\n• Price: Market order`;
          if (parsed.time_in_force) response += `\n• Time in Force: ${parsed.time_in_force}`;
          if (detectedTraderText) response += `\n• Strategy: ${detectedTraderText}`;
          response += '\n\nTaking you to order entry...';
          
          setTimeout(() => {
            setCurrentView('orderEntry');
            const mentionedHolding = MOCK_PORTFOLIO.holdings.find(h => 
              input.toLowerCase().includes(h.symbol.toLowerCase())
            );
            if (mentionedHolding) setSelectedHolding(mentionedHolding);
          }, 2000);
        } catch (error) {
          response = `I can help you place a trade. Which security would you like to trade?\n\nYour current holdings:\n${MOCK_PORTFOLIO.holdings.map(h => `• ${h.symbol} - ${h.quantity} shares`).join('\n')}`;
        }
      } else if (intent === 'portfolio_summary') {
        response = generatePortfolioSummary();
      } else if (intent === 'news') {
        const mentionedSymbol = MOCK_PORTFOLIO.holdings.find(h => 
          input.toLowerCase().includes(h.symbol.toLowerCase())
        )?.symbol;
        response = generateNewsResponse(mentionedSymbol);
        if (mentionedSymbol) {
          setNewsFilter(mentionedSymbol);
          setShowNews(true);
        }
      } else if (intent === 'analysis') {
        response = `📊 Based on your portfolio analysis:\n\n✅ Strengths:\n• Diversified across tech and healthcare sectors\n• Strong performers: AAPL, MSFT showing positive gains\n• Good exposure to both US and Swiss markets\n\n⚠️ Areas to consider:\n• NESN showing negative performance (-5.0%)\n• Heavy concentration in tech sector (60%)\n\n💡 Suggestions:\n• Consider rebalancing to reduce tech concentration\n• May want to review NESN position\n• Portfolio is well-positioned for growth\n\nWould you like to make any trades based on this analysis?`;
      } else {
        response = `I can help you with:\n\n📊 Portfolio Summary - "Show my portfolio"\n📰 Market News - "Latest news on AAPL"\n💼 Trading - "Buy 100 shares of MSFT"\n📈 Analysis - "Analyze my holdings"\n\nWhat would you like to do?`;
      }

      if (response) {
        setChatHistory(prev => [...prev, {
          type: 'assistant',
          message: response,
          timestamp: new Date().toISOString()
        }]);
      }
      setIsProcessing(false);
    }, 800);
  };

  const handleQuickAction = (action, data) => {
    if (action === 'trade') {
      setCurrentView('orderEntry');
      const security = SECURITIES.find(s => s.symbol === data.symbol);
      setOrderForm(prev => ({ ...prev, security }));
      setSelectedHolding(data);
    } else if (action === 'news') {
      setNewsFilter(data.symbol);
      setShowNews(true);
    } else if (action === 'summary') {
      const summary = generatePortfolioSummary();
      const assistantMessage = {
        type: 'assistant',
        message: summary,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, assistantMessage]);
      setShowGeneiChat(true);
    }
  };

  // OMS Functions
  const handleSecuritySelect = (security) => {
    setOrderForm({ ...orderForm, security });
    setSearchTerm('');
    setShowSecurityDropdown(false);
  };

  const handleTraderTextKeyDown = (e) => {
    if (e.key === 'Tab' && traderTextSuggestion && traderTextSuggestion !== orderForm.traderText) {
      e.preventDefault();
      setOrderForm({ ...orderForm, traderText: traderTextSuggestion });
      setTraderTextSuggestion('');
    }
  };

  const getTraderTextGhost = () => {
    if (!traderTextSuggestion || traderTextSuggestion === orderForm.traderText) return '';
    if (traderTextSuggestion.toLowerCase().startsWith(orderForm.traderText.toLowerCase())) {
      return traderTextSuggestion.slice(orderForm.traderText.length);
    }
    return '';
  };

  const validateOrder = () => {
    setIsProcessing(true);
    setValidationStatus(null);
    setAiSuggestion(null);
    setWorkflowStage('validation');

    setTimeout(() => {
      if (!orderForm.security) {
        setValidationStatus({ type: 'error', message: 'Please select a security' });
        setIsProcessing(false);
        return;
      }

      if (!orderForm.quantity || parseInt(orderForm.quantity) <= 0) {
        setValidationStatus({ type: 'error', message: 'Please enter a valid quantity' });
        setIsProcessing(false);
        return;
      }

      const marketStatus = MARKET_STATUS[orderForm.security.market];
      
      if (orderForm.timeInForce === 'DAY' && !marketStatus.open) {
        setValidationStatus({ 
          type: 'warning', 
          message: `Market is currently closed. DAY orders cannot be placed.`
        });
        setAiSuggestion({
          message: `The ${orderForm.security.market} market is closed. Would you like to convert this to a GTD order for the next trading day (${marketStatus.nextOpen})?`,
          action: 'convert_to_gtd',
          nextDate: marketStatus.nextOpen
        });
        setIsProcessing(false);
        setWorkflowStage('validation');
        return;
      }

      setValidationStatus({ type: 'success', message: 'Order validated successfully' });
      
      const stages = ['validation', 'submission', 'market'];
      let currentIndex = 0;
      
      const progressInterval = setInterval(() => {
        currentIndex++;
        if (currentIndex < stages.length) {
          setWorkflowStage(stages[currentIndex]);
          
          if (stages[currentIndex] === 'market' && orderForm.traderText.trim()) {
            clearInterval(progressInterval);
            
            if (!detectedAlgo) {
              setValidationStatus({ 
                type: 'warning', 
                message: 'Trader text requires algo selection'
              });
              setAiSuggestion({
                message: 'I detected trader instructions but couldn\'t identify a specific algorithm. Please select an algo flow to proceed.',
                action: 'select_algo'
              });
              setIsProcessing(false);
            } else {
              const algo = ALGO_SUGGESTIONS.find(a => a.id === detectedAlgo);
              setValidationStatus({ 
                type: 'info', 
                message: 'Algo detected - confirmation required'
              });
              setAiSuggestion({
                message: `I detected you want to use ${algo?.name}. Would you like to proceed with this algorithm?`,
                action: 'confirm_algo',
                algo: detectedAlgo
              });
              setIsProcessing(false);
            }
          }
        } else {
          clearInterval(progressInterval);
          setIsProcessing(false);
        }
      }, 1200);
    }, 1000);
  };

  const handleAiSuggestion = (accept) => {
    if (aiSuggestion?.action === 'convert_to_gtd') {
      if (accept) {
        setOrderForm({
          ...orderForm,
          timeInForce: 'GTD',
          gtdDate: aiSuggestion.nextDate.split(' ')[0]
        });
        setAiSuggestion(null);
        setValidationStatus({ 
          type: 'info', 
          message: 'Order converted to GTD. Please validate again.' 
        });
        setWorkflowStage('entry');
      } else {
        setValidationStatus({ type: 'info', message: 'Order cancelled' });
        setAiSuggestion(null);
        setWorkflowStage('entry');
      }
    } else if (aiSuggestion?.action === 'confirm_algo') {
      if (accept) {
        setSelectedAlgo(aiSuggestion.algo);
        setAiSuggestion(null);
        setValidationStatus({ type: 'success', message: 'Algo confirmed, proceeding to execution' });
        
        setTimeout(() => {
          setWorkflowStage('execution');
          setIsProcessing(false);
          
          const executionMessage = {
            type: 'assistant',
            message: '🎉 Order executed successfully! The order has been submitted to the market.',
            timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, executionMessage]);
          
          // Navigate back to portfolio after successful execution
          setTimeout(() => {
            const returnMessage = {
              type: 'assistant',
              message: '✓ Order complete! Returning to your portfolio overview...',
              timestamp: new Date().toISOString()
            };
            setChatHistory(prev => [...prev, returnMessage]);
            
            setTimeout(() => {
              // Reset order form
              setOrderForm({
                security: null,
                contactMethod: 'phone',
                quantity: '',
                price: '',
                timeInForce: 'DAY',
                gtdDate: '',
                traderText: ''
              });
              setSelectedHolding(null);
              setValidationStatus(null);
              setAiSuggestion(null);
              setSelectedAlgo(null);
              setWorkflowStage('entry');
              
              // Navigate back to portfolio
              setCurrentView('portfolio');
            }, 2000);
          }, 2000);
        }, 1500);
      } else {
        setAiSuggestion({
          message: 'Please select an algorithm from the options below.',
          action: 'select_algo'
        });
      }
    }
  };

  const handleAlgoSelection = (algoId) => {
    setSelectedAlgo(algoId);
    setAiSuggestion(null);
    setValidationStatus({ type: 'success', message: 'Algo selected, proceeding to execution' });
    
    setTimeout(() => {
      setWorkflowStage('execution');
      setIsProcessing(false);
    }, 1500);
  };

  const getWorkflowStageIndex = () => {
    return WORKFLOW_STAGES.findIndex(s => s.id === workflowStage);
  };

  const ghostText = getTraderTextGhost();

  // Portfolio View
  if (currentView === 'portfolio') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b-4 border-red-600 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-red-600 font-bold text-3xl">UBS</div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="text-gray-700 font-medium">Wealth Management</div>
              <div className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                backendStatus === 'connected' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {backendStatus === 'connected' ? '● API Connected' : '● Demo Mode'}
              </div>
            </div>
            <button
              onClick={() => setShowGeneiChat(!showGeneiChat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                showGeneiChat
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-red-600 hover:text-red-600'
              }`}
            >
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                X
              </div>
              <span>Ask XAi</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Portfolio Summary Cards */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Portfolio Overview</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-red-100 text-sm font-medium">Total Portfolio Value</div>
                      <PieChart className="text-red-200" size={20} />
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      ${MOCK_PORTFOLIO.totalValue.toLocaleString()}
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${
                      MOCK_PORTFOLIO.todayChangePercent >= 0 ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {MOCK_PORTFOLIO.todayChangePercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>
                        {MOCK_PORTFOLIO.todayChangePercent >= 0 ? '+' : ''}
                        ${Math.abs(MOCK_PORTFOLIO.todayChange).toLocaleString()} ({MOCK_PORTFOLIO.todayChangePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-600 text-sm font-medium">Holdings</div>
                      <BarChart3 className="text-gray-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      {MOCK_PORTFOLIO.holdings.length}
                    </div>
                    <div className="text-sm text-gray-500">
                      Securities across {new Set(MOCK_PORTFOLIO.holdings.map(h => h.market)).size} markets
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-600 text-sm font-medium">Accounts</div>
                      <DollarSign className="text-gray-400" size={20} />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      {MOCK_PORTFOLIO.accounts.length}
                    </div>
                    <div className="text-sm text-gray-500">
                      Active investment accounts
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleQuickAction('summary')}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      📊 Portfolio Summary
                    </button>
                    <button
                      onClick={() => {
                        setShowNews(true);
                        setNewsFilter(null);
                      }}
                      className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                    >
                      📰 Market News
                    </button>
                    <button
                      onClick={() => setCurrentView('orderEntry')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      💼 Place Trade
                    </button>
                  </div>
                </div>
              </div>

              {/* Accounts */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Accounts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {MOCK_PORTFOLIO.accounts.map(account => (
                    <div key={account.id} className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-gray-800">{account.name}</div>
                          <div className="text-xs text-gray-500">{account.type} • {account.id}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          account.performance >= 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {account.performance >= 0 ? '+' : ''}{account.performance}%
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        ${account.balance.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{account.currency}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Holdings */}
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Holdings</h2>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {MOCK_PORTFOLIO.holdings.map(holding => {
                        const { gainLoss, gainLossPercent, currentValue } = calculateGainLoss(holding);
                        return (
                          <tr key={holding.symbol} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="font-semibold text-gray-900">{holding.symbol}</div>
                                <div className="text-xs text-gray-500">{holding.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {holding.quantity.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              ${holding.avgPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              ${holding.currentPrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {gainLoss >= 0 ? '+' : ''}${Math.abs(gainLoss).toFixed(2)}
                                <div className="text-xs">({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                              <button
                                onClick={() => handleQuickAction('trade', holding)}
                                className="text-red-600 hover:text-red-700 font-medium"
                              >
                                Trade
                              </button>
                              <button
                                onClick={() => handleQuickAction('news', holding)}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                News
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* News Modal */}
              {showNews && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
                    <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">
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
                        <div key={news.id} className="p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                                {news.symbol}
                              </span>
                              <span className={`text-xs ${
                                news.sentiment === 'positive' ? 'text-green-600' : 'text-red-600'
                              }`}>
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

          {/* XAi Chat Sidebar */}
          {showGeneiChat && (
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 font-bold shadow-md">
                      X
                    </div>
                    <div>
                      <div className="font-semibold text-white">XAi</div>
                      <div className="text-xs text-red-100">Portfolio Assistant</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGeneiChat(false)}
                    className="text-white hover:bg-red-800 rounded-lg p-1 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.type === 'assistant' && (
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mr-2 mt-1">
                        X
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.type === 'user'
                        ? 'bg-red-600 text-white'
                        : msg.type === 'system'
                        ? 'bg-gray-100 text-gray-600 italic text-sm'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
                      
                      {msg.hasAction && msg.actionType === 'navigate_to_trade' && (
                        <button
                          onClick={() => {
                            setCurrentView('orderEntry');
                            const security = SECURITIES.find(s => s.symbol === msg.actionData.symbol);
                            setOrderForm(prev => ({ ...prev, security }));
                          }}
                          className="mt-3 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          Go to Order Entry <ArrowRight size={16} />
                        </button>
                      )}
                      
                      <div className={`text-xs mt-1 ${
                        msg.type === 'user' ? 'text-red-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={geneiInput}
                    onChange={(e) => setGeneiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleGeneiSubmit()}
                    placeholder="Ask about your portfolio..."
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleGeneiSubmit}
                    disabled={!geneiInput.trim() || isProcessing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => setGeneiInput('Show my portfolio summary')}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    📊 Portfolio
                  </button>
                  <button
                    onClick={() => setGeneiInput('Latest news on my holdings')}
                    className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                  >
                    📰 News
                  </button>
                  <button
                    onClick={() => setGeneiInput('Buy 100 AAPL at $180')}
                    className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                  >
                    💼 Trade
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // OMS View (Order Entry)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-4 border-red-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-red-600 font-bold text-3xl">UBS</div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="text-gray-700 font-medium">Order Management System</div>
            <button
              onClick={() => setCurrentView('portfolio')}
              className="ml-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Back to Portfolio
            </button>
          </div>
          <button
            onClick={() => setShowGeneiChat(!showGeneiChat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              showGeneiChat
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-red-600 hover:text-red-600'
            }`}
          >
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
              X
            </div>
            <span>Ask XAi</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Workflow Navigator */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Workflow</h2>
              <div className="flex items-center justify-between">
                {WORKFLOW_STAGES.map((stage, idx) => {
                  const currentIdx = getWorkflowStageIndex();
                  const isActive = idx === currentIdx;
                  const isComplete = idx < currentIdx;
                  const isHitl = stage.id === 'validation' && aiSuggestion?.action === 'convert_to_gtd' || 
                                 stage.id === 'market' && aiSuggestion && (aiSuggestion.action === 'select_algo' || aiSuggestion.action === 'confirm_algo');

                  return (
                    <React.Fragment key={stage.id}>
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                          isActive 
                            ? 'bg-red-600 text-white ring-4 ring-red-100' 
                            : isComplete 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-200 text-gray-500'
                        } ${isHitl ? 'ring-4 ring-orange-300' : ''}`}>
                          {stage.icon}
                        </div>
                        <div className={`text-xs font-medium text-center ${
                          isActive ? 'text-red-600' : isComplete ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {stage.label}
                        </div>
                        {isHitl && (
                          <div className="text-xs text-orange-600 font-medium">HITL Required</div>
                        )}
                      </div>
                      {idx < WORKFLOW_STAGES.length - 1 && (
                        <div className={`flex-1 h-1 mx-4 transition-all ${
                          idx < currentIdx ? 'bg-green-600' : 'bg-gray-200'
                        }`}></div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Entry</h2>
                  
                  {selectedHolding && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="font-semibold text-blue-900 mb-2">Pre-filled from portfolio:</div>
                      <div className="text-sm text-blue-800">
                        Security: {selectedHolding.symbol} - {selectedHolding.name}<br/>
                        Current Position: {selectedHolding.quantity} shares<br/>
                        Current Price: ${selectedHolding.currentPrice}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-4 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Security/Instrument
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by symbol or name..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    {showSecurityDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredSecurities.map((sec) => (
                          <div
                            key={sec.symbol}
                            onClick={() => handleSecuritySelect(sec)}
                            className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-800">
                              {sec.symbol} · {sec.market} · {sec.currency}
                            </div>
                            <div className="text-sm text-gray-600">{sec.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {orderForm.security && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">
                            {orderForm.security.symbol} · {orderForm.security.market} · {orderForm.security.currency}
                          </div>
                          <div className="text-sm text-gray-600">{orderForm.security.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Current Price</div>
                          <div className="text-lg font-semibold text-gray-800">
                            {orderForm.security.currency} {orderForm.security.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Method
                    </label>
                    <select
                      value={orderForm.contactMethod}
                      onChange={(e) => setOrderForm({ ...orderForm, contactMethod: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="meeting">In-Person Meeting</option>
                      <option value="portal">Client Portal</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={orderForm.quantity}
                        onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                        placeholder="100"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (Optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={orderForm.price}
                        onChange={(e) => setOrderForm({ ...orderForm, price: e.target.value })}
                        placeholder="Market"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time in Force
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['DAY', 'GTD', 'GTC', 'FOK'].map((tif) => (
                        <button
                          key={tif}
                          onClick={() => setOrderForm({ ...orderForm, timeInForce: tif })}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            orderForm.timeInForce === tif
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {tif}
                        </button>
                      ))}
                    </div>
                  </div>

                  {orderForm.timeInForce === 'GTD' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Good Till Date
                      </label>
                      <input
                        type="date"
                        value={orderForm.gtdDate}
                        onChange={(e) => setOrderForm({ ...orderForm, gtdDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Trader Notes (AI Parsing)
                      </label>
                      {isTraderTextLoading && (
                        <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                      )}
                    </div>
                    <div className="relative bg-gray-50 rounded-lg border border-gray-300 p-3 font-mono text-sm focus-within:ring-2 focus-within:ring-red-500">
                      <div className="relative inline-block w-full">
                        <textarea
                          ref={traderTextRef}
                          value={orderForm.traderText}
                          onChange={(e) => setOrderForm({ ...orderForm, traderText: e.target.value })}
                          onKeyDown={handleTraderTextKeyDown}
                          placeholder="e.g., VWAP Market Close, TWAP over 2 hours..."
                          rows={3}
                          className="bg-transparent outline-none w-full relative z-10 resize-none"
                          style={{ caretColor: '#dc2626' }}
                        />
                        {ghostText && (
                          <div 
                            className="absolute top-0 left-0 text-gray-400 pointer-events-none whitespace-pre-wrap"
                            style={{ 
                              paddingLeft: `${orderForm.traderText.split('\n').pop().length * 0.6}em`,
                            }}
                          >
                            {ghostText}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Tab</kbd> to accept suggestion
                      </span>
                      {structuredTraderText && (
                        <span className="text-green-600 font-medium">
                          ✓ {structuredTraderText}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={validateOrder}
                    disabled={isProcessing}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Clock size={20} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Validate Order
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {validationStatus && (
                  <div className={`rounded-lg shadow-sm p-4 border-l-4 ${
                    validationStatus.type === 'success' 
                      ? 'bg-green-50 border-green-600'
                      : validationStatus.type === 'error'
                      ? 'bg-red-50 border-red-600'
                      : validationStatus.type === 'warning'
                      ? 'bg-orange-50 border-orange-600'
                      : 'bg-blue-50 border-blue-600'
                  }`}>
                    <div className="flex items-start gap-3">
                      {validationStatus.type === 'success' ? (
                        <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                      ) : (
                        <AlertCircle className={`flex-shrink-0 ${
                          validationStatus.type === 'error' ? 'text-red-600' : 'text-orange-600'
                        }`} size={24} />
                      )}
                      <div>
                        <div className="font-semibold text-gray-800 mb-1">
                          {validationStatus.type === 'success' ? 'Validation Successful' : 'Validation Issue'}
                        </div>
                        <div className="text-sm text-gray-700">{validationStatus.message}</div>
                      </div>
                    </div>
                  </div>
                )}

                {aiSuggestion && aiSuggestion.action === 'convert_to_gtd' && (
                  <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        X
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 mb-1">XAi Suggestion</div>
                        <div className="text-sm text-gray-700">{aiSuggestion.message}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAiSuggestion(true)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleAiSuggestion(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Cancel Order
                      </button>
                    </div>
                  </div>
                )}

                {aiSuggestion && aiSuggestion.action === 'confirm_algo' && (
                  <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        X
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1">Algo Detected</div>
                        <div className="text-sm text-gray-700 mb-3">{aiSuggestion.message}</div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="p-2 bg-green-50 rounded border border-green-200">
                            <div className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                              <FileText size={12} />
                              Display Format
                            </div>
                            <div className="text-xs text-green-700">{structuredTraderText}</div>
                          </div>
                          
                          <div className="p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                              <Code size={12} />
                              Backend Format
                            </div>
                            <div className="text-xs text-blue-700 font-mono break-all">{backendFormat}</div>
                          </div>
                          
                          <div className="p-2 bg-purple-50 rounded border border-purple-200">
                            <div className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                              <Info size={12} />
                              Description
                            </div>
                            <div className="text-xs text-purple-700">{traderTextDescription}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAiSuggestion(true)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleAiSuggestion(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Choose Different
                      </button>
                    </div>
                  </div>
                )}

                {aiSuggestion && aiSuggestion.action === 'select_algo' && (
                  <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        X
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 mb-1">Select Execution Algorithm</div>
                        <div className="text-sm text-gray-700">{aiSuggestion.message}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {ALGO_SUGGESTIONS.map((algo) => (
                        <button
                          key={algo.id}
                          onClick={() => handleAlgoSelection(algo.id)}
                          className="w-full text-left p-3 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-colors"
                        >
                          <div className="font-semibold text-gray-800 text-sm">{algo.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{algo.description}</div>
                          <div className="text-xs text-blue-600 mt-1 italic">{algo.useCase}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Security:</span>
                      <span className="font-medium text-gray-800">
                        {orderForm.security?.symbol || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium text-gray-800">
                        {orderForm.quantity || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium text-gray-800">
                        {orderForm.price || 'Market'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Time in Force:</span>
                      <span className="font-medium text-gray-800">
                        {orderForm.timeInForce}
                      </span>
                    </div>
                    {orderForm.timeInForce === 'GTD' && orderForm.gtdDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Valid Until:</span>
                        <span className="font-medium text-gray-800">
                          {orderForm.gtdDate}
                        </span>
                      </div>
                    )}
                    {selectedAlgo && (
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Algo:</span>
                        <span className="font-medium text-green-600">
                          {ALGO_SUGGESTIONS.find(a => a.id === selectedAlgo)?.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-100 rounded-lg p-4 text-xs text-gray-600">
                  <div className="font-semibold text-gray-800 mb-2">💡 Features:</div>
                  <div className="space-y-2">
                    <div>• AI-powered trader text parsing</div>
                    <div>• Real-time autocomplete suggestions</div>
                    <div>• Human-in-the-loop validation</div>
                    <div>• Algorithm detection & routing</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* XAi Chat Sidebar for OMS */}
        {showGeneiChat && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 font-bold shadow-md">
                    X
                  </div>
                  <div>
                    <div className="font-semibold text-white">XAi</div>
                    <div className="text-xs text-red-100">AI Assistant</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowGeneiChat(false)}
                  className="text-white hover:bg-red-800 rounded-lg p-1 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {(msg.type === 'assistant' || msg.type === 'system') && (
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mr-2 mt-1">
                      X
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-red-600 text-white'
                      : msg.type === 'system'
                      ? 'bg-gray-100 text-gray-600 italic text-sm'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
                    <div className={`text-xs mt-1 ${
                      msg.type === 'user' ? 'text-red-100' : 'text-gray-500'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={geneiInput}
                  onChange={(e) => setGeneiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGeneiSubmit()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <button
                  onClick={handleGeneiSubmit}
                  disabled={!geneiInput.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setGeneiInput('Buy 100 AAPL at $180')}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  📝 Fill Details
                </button>
                <button
                  onClick={() => setGeneiInput('Validate this order')}
                  className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                >
                  ✓ Validate
                </button>
                <button
                  onClick={() => setGeneiInput('Change quantity to 200')}
                  className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                >
                  🔄 Modify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ... (Lines 1-456 remain unchanged)



// ... (Rest of the file continues)
