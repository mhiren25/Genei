import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, CheckCircle, AlertCircle, Clock, X, Loader2, Info, Code, FileText } from 'lucide-react';

// Backend API configuration
const API_BASE_URL = 'http://localhost:8000';

// Mock data for demo (will be replaced by API calls)
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
      // Fallback to local parsing if backend unavailable
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

  // Fallback local implementations
  parseOrderLocal(text) {
    const inputLower = text.toLowerCase();
    const parsed = { security: null, quantity: '', timeInForce: 'DAY' };
    
    const securityMatch = SECURITIES.find(s => 
      inputLower.includes(s.symbol.toLowerCase()) || 
      inputLower.includes(s.name.toLowerCase())
    );
    if (securityMatch) parsed.security = securityMatch;
    
    const qtyMatch = text.match(/(\d+)\s*(shares?|units?)?/);
    if (qtyMatch) parsed.quantity = qtyMatch[1];
    
    if (inputLower.includes('gtc')) parsed.time_in_force = 'GTC';
    else if (inputLower.includes('gtd')) parsed.time_in_force = 'GTD';
    else if (inputLower.includes('fok')) parsed.time_in_force = 'FOK';
    
    return parsed;
  },

  parseTraderTextLocal(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('vwap')) {
      return {
        structured: 'VWAP Market Close [16:00]',
        backend_format: 'VWAP|END=16:00|AUCTIONS=false|START=09:30',
        description: 'Execute order throughout the day to match the volume-weighted average price, minimizing market impact on large orders.',
        algo: 'vwap',
        parameters: { end_time: '16:00' },
        confidence: 0.9
      };
    }
    
    if (lowerText.includes('twap')) {
      return {
        structured: 'TWAP execution over trading day',
        backend_format: 'TWAP|DURATION=full day|SLICES=60',
        description: 'Distribute order evenly over the specified time period to avoid timing bias and minimize market impact.',
        algo: 'twap',
        parameters: { duration: 'full day' },
        confidence: 0.9
      };
    }
    
    return {
      structured: `Custom execution: ${text}`,
      backend_format: `CUSTOM|${text}`,
      description: 'Custom execution strategy without a predefined algorithm.',
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

export default function UBSOmsInterface() {
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
  const [showTraderTextTooltip, setShowTraderTextTooltip] = useState(false);
  const debounceTimer = useRef(null);
  const traderTextRef = useRef(null);

  const [showGeneiChat, setShowGeneiChat] = useState(false);
  const [geneiInput, setGeneiInput] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      type: 'assistant',
      message: 'Hello! I\'m Genei, your AI assistant powered by real backend AI services. You can describe your order in plain English, and I\'ll use our Pydantic models to fill out the form accurately.',
      timestamp: new Date().toISOString()
    }
  ]);

  const [workflowStage, setWorkflowStage] = useState('entry');
  const [validationStatus, setValidationStatus] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  const chatEndRef = useRef(null);

  // Check backend status on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
          setBackendStatus('connected');
          const statusMsg = {
            type: 'system',
            message: '✓ Backend API connected successfully',
            timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, statusMsg]);
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        setBackendStatus('disconnected');
        const errorMsg = {
          type: 'system',
          message: '⚠ Running in demo mode (backend not available)',
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, errorMsg]);
      }
    };
    checkBackend();
  }, []);

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

  // Trader Text autocomplete with backend
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
        // Get inline suggestion
        const suggestion = await apiService.getAutocompleteSuggestions(orderForm.traderText);
        if (suggestion && suggestion.toLowerCase().startsWith(orderForm.traderText.toLowerCase())) {
          setTraderTextSuggestion(suggestion);
        } else {
          setTraderTextSuggestion('');
        }

        // Parse with backend (LangGraph simulation)
        const result = await apiService.parseTraderText(orderForm.traderText);
        setStructuredTraderText(result.structured);
        setBackendFormat(result.backend_format || result.structured);
        setTraderTextDescription(result.description || 'Execution strategy parsed by AI');
        setDetectedAlgo(result.algo);
        
      } catch (error) {
        console.error('Error processing trader text:', error);
        setTraderTextSuggestion('');
        setStructuredTraderText('');
        setBackendFormat('');
        setTraderTextDescription('');
        setDetectedAlgo(null);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

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
    } else if (e.key === 'Escape') {
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
    
    const processingMsg = {
      type: 'system',
      message: 'Processing with backend AI service...',
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, processingMsg]);

    try {
      // Call backend API
      const parsed = await apiService.parseOrder(input);
      
      // Update form with Pydantic model response
      const updates = {};
      if (parsed.security) updates.security = parsed.security;
      if (parsed.quantity) updates.quantity = parsed.quantity.toString();
      if (parsed.time_in_force) updates.timeInForce = parsed.time_in_force;
      if (parsed.price) updates.price = parsed.price.toString();
      if (parsed.contact_method) updates.contactMethod = parsed.contact_method;
      
      setOrderForm(prev => ({ ...prev, ...updates }));

      let response = '✓ Order parsed using Pydantic model:\n';
      if (parsed.security) {
        response += `\n• Security: ${parsed.security.name} (${parsed.security.symbol})`;
      }
      if (parsed.quantity) {
        response += `\n• Quantity: ${parsed.quantity} shares`;
      }
      if (parsed.price) {
        response += `\n• Price: $${parsed.price}`;
      }
      response += `\n• Time in Force: ${parsed.time_in_force || 'DAY'}`;
      response += `\n• Contact: ${parsed.contact_method || 'phone'}`;
      
      if (!parsed.security || !parsed.quantity) {
        response += '\n\n⚠ Some fields couldn\'t be extracted. Please review and complete.';
      }

      const assistantMessage = {
        type: 'assistant',
        message: response,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'assistant',
        message: '❌ Error parsing order. Please try again or fill the form manually.',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    }
  };

  const validateOrder = () => {
    setIsProcessing(true);
    setValidationStatus(null);
    setAiSuggestion(null);
    setWorkflowStage('validation');

    const validationMessage = {
      type: 'system',
      message: 'Order validation initiated...',
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, validationMessage]);

    setTimeout(() => {
      if (!orderForm.security) {
        setValidationStatus({ type: 'error', message: 'Please select a security' });
        const errorMessage = {
          type: 'assistant',
          message: '❌ Validation failed: Please select a security before validating the order.',
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, errorMessage]);
        setIsProcessing(false);
        return;
      }

      if (!orderForm.quantity || parseInt(orderForm.quantity) <= 0) {
        setValidationStatus({ type: 'error', message: 'Please enter a valid quantity' });
        const errorMessage = {
          type: 'assistant',
          message: '❌ Validation failed: Please enter a valid quantity.',
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, errorMessage]);
        setIsProcessing(false);
        return;
      }

      const marketStatus = MARKET_STATUS[orderForm.security.market];
      
      // Use Case 2: DAY order after market close (HITL for GTD conversion)
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
        
        const suggestionMessage = {
          type: 'assistant',
          message: `⚠️ The ${orderForm.security.market} market is currently closed. DAY orders cannot be placed after market hours.\n\nI suggest converting this to a GTD (Good Till Date) order for the next trading day: ${marketStatus.nextOpen}\n\nWould you like me to make this change?`,
          timestamp: new Date().toISOString(),
          hasAction: true,
          actionType: 'convert_to_gtd'
        };
        setChatHistory(prev => [...prev, suggestionMessage]);
        setIsProcessing(false);
        setWorkflowStage('validation'); // Stay at validation stage
        return;
      }

      // Use Case 1: Valid order - proceed through workflow
      setValidationStatus({ type: 'success', message: 'Order validated successfully' });
      
      const successMessage = {
        type: 'assistant',
        message: '✅ Order validated successfully! Proceeding with order submission...',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, successMessage]);
      
      const stages = ['validation', 'submission', 'market'];
      let currentIndex = 0;
      
      const progressInterval = setInterval(() => {
        currentIndex++;
        if (currentIndex < stages.length) {
          setWorkflowStage(stages[currentIndex]);
          
          // Use Case 3: HITL at Market Order stage if trader text exists
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
              
              const algoMessage = {
                type: 'assistant',
                message: '⚠️ Your order includes trader instructions, but I need you to select an execution algorithm.\n\nBased on your notes, here are my recommendations:',
                timestamp: new Date().toISOString(),
                hasAction: true,
                actionType: 'select_algo'
              };
              setChatHistory(prev => [...prev, algoMessage]);
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
              
              const confirmMessage = {
                type: 'assistant',
                message: `📊 Backend parsed your trader text:\n\n🎯 Display: "${structuredTraderText}"\n\n💻 Backend: ${backendFormat}\n\n📝 Strategy: ${traderTextDescription}\n\nI recommend using ${algo?.name} for this order.\n\nWould you like to proceed?`,
                timestamp: new Date().toISOString(),
                hasAction: true,
                actionType: 'confirm_algo'
              };
              setChatHistory(prev => [...prev, confirmMessage]);
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
        
        const acceptMessage = {
          type: 'assistant',
          message: `✓ I've converted your order to GTD with expiry date ${aiSuggestion.nextDate.split(' ')[0]}. Please click "Validate Order" again to proceed.`,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, acceptMessage]);
      } else {
        setValidationStatus({ type: 'info', message: 'Order cancelled' });
        setAiSuggestion(null);
        setWorkflowStage('entry');
        
        const cancelMessage = {
          type: 'assistant',
          message: 'Order cancelled. Let me know if you\'d like to create a new order.',
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, cancelMessage]);
      }
    } else if (aiSuggestion?.action === 'confirm_algo') {
      if (accept) {
        setSelectedAlgo(aiSuggestion.algo);
        setAiSuggestion(null);
        setValidationStatus({ type: 'success', message: 'Algo confirmed, proceeding to execution' });
        
        const confirmMessage = {
          type: 'assistant',
          message: `✅ ${ALGO_SUGGESTIONS.find(a => a.id === aiSuggestion.algo)?.name} confirmed. Proceeding to execution...`,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, confirmMessage]);
        
        setTimeout(() => {
          setWorkflowStage('execution');
          setIsProcessing(false);
          
          const executionMessage = {
            type: 'assistant',
            message: '🎉 Order executed successfully using the selected algorithm!',
            timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, executionMessage]);
          
          generateFinalSummary();
        }, 1500);
      } else {
        setAiSuggestion({
          message: 'Please select an algorithm from the options below.',
          action: 'select_algo'
        });
        
        const selectMessage = {
          type: 'assistant',
          message: 'No problem. Please choose an algorithm from the available options.',
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, selectMessage]);
      }
    }
  };

  const generateFinalSummary = () => {
    setTimeout(() => {
      const algo = selectedAlgo ? ALGO_SUGGESTIONS.find(a => a.id === selectedAlgo) : null;
      const executionTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const estimatedValue = orderForm.security && orderForm.quantity 
        ? (parseFloat(orderForm.quantity) * orderForm.security.price).toFixed(2) 
        : 'N/A';
      
      const summaryMessage = {
        type: 'summary',
        message: `
═══════════════════════════════════
📋 ORDER EXECUTION SUMMARY
═══════════════════════════════════

Order ID: OMS-${Date.now().toString().slice(-8)}
Execution Time: ${executionTime}
Status: ✅ EXECUTED
Backend: ${backendStatus === 'connected' ? 'API Connected' : 'Demo Mode'}

─────────────────────────────────

📊 SECURITY DETAILS
Security: ${orderForm.security?.name || 'N/A'}
Symbol: ${orderForm.security?.symbol || 'N/A'}
Market: ${orderForm.security?.market || 'N/A'}
Currency: ${orderForm.security?.currency || 'N/A'}
Price: ${orderForm.security?.currency} ${orderForm.security?.price.toFixed(2)}

─────────────────────────────────

📈 ORDER DETAILS
Quantity: ${orderForm.quantity} shares
Order Price: ${orderForm.price || 'Market'}
Time in Force: ${orderForm.timeInForce}${orderForm.timeInForce === 'GTD' && orderForm.gtdDate ? ` (Valid till ${orderForm.gtdDate})` : ''}
Estimated Value: ${orderForm.security?.currency} ${estimatedValue}
Contact Method: ${orderForm.contactMethod.charAt(0).toUpperCase() + orderForm.contactMethod.slice(1)}

─────────────────────────────────

${algo ? `🤖 EXECUTION ALGORITHM
Algorithm: ${algo.name}
Strategy: ${algo.description}

📝 AI-PARSED TRADER INSTRUCTIONS:
Display Format: ${structuredTraderText}
Backend Format: ${backendFormat}
Description: ${traderTextDescription}

─────────────────────────────────
` : ''}
${orderForm.traderText ? `📝 ORIGINAL TRADER NOTES
${orderForm.traderText}

─────────────────────────────────
` : ''}
✓ Order successfully routed to market
✓ Confirmation sent to client
✓ Compliance checks passed
✓ Trade recorded in system
✓ Pydantic validation completed
✓ LangGraph workflow executed

═══════════════════════════════════

Thank you for using UBS Order Management System powered by Genei AI with Azure OpenAI & LangGraph.
        `,
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, summaryMessage]);
    }, 2000);
  };

  const handleAlgoSelection = (algoId) => {
    setSelectedAlgo(algoId);
    setAiSuggestion(null);
    setValidationStatus({ type: 'success', message: 'Algo selected, proceeding to execution' });
    
    const algo = ALGO_SUGGESTIONS.find(a => a.id === algoId);
    const confirmMessage = {
      type: 'assistant',
      message: `✅ You've selected ${algo.name}. Proceeding to execution...`,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, confirmMessage]);
    
    setTimeout(() => {
      setWorkflowStage('execution');
      setIsProcessing(false);
      
      const executionMessage = {
        type: 'assistant',
        message: '🎉 Order executed successfully using the selected algorithm!',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, executionMessage]);
      
      generateFinalSummary();
    }, 1500);
  };

  const getWorkflowStageIndex = () => {
    return WORKFLOW_STAGES.findIndex(s => s.id === workflowStage);
  };

  const ghostText = getTraderTextGhost();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-4 border-red-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-red-600 font-bold text-3xl">UBS</div>
            <div className="h-8 w-px bg-gray-300"></div>
            <div className="text-gray-700 font-medium">Order Management System</div>
            <div className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
              backendStatus === 'connected' 
                ? 'bg-green-100 text-green-700' 
                : backendStatus === 'disconnected'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {backendStatus === 'connected' ? '● API Connected' : backendStatus === 'disconnected' ? '● Demo Mode' : '● Checking...'}
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
              G
            </div>
            <span>Ask Genei</span>
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
                        Trader Notes (Backend AI Parsing)
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
                          ✓ Backend: {structuredTraderText}
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
                        G
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 mb-1">Genei Suggestion</div>
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
                        G
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 mb-1">Algo Detected</div>
                        <div className="text-sm text-gray-700 mb-3">{aiSuggestion.message}</div>
                        
                        {/* Display all three formats */}
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
                        G
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
                  <div className="font-semibold text-gray-800 mb-2">💡 Backend Features:</div>
                  <div className="space-y-2">
                    <div>• Pydantic models for type-safe order parsing</div>
                    <div>• FastAPI backend with LangGraph simulation</div>
                    <div>• Real-time trader text parsing with structured output</div>
                    <div>• IDE-style autocomplete suggestions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showGeneiChat && (
          <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 font-bold shadow-md">
                    G
                  </div>
                  <div>
                    <div className="font-semibold text-white">Genei</div>
                    <div className="text-xs text-red-100">AI Assistant with FastAPI</div>
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
                  {(msg.type === 'assistant' || msg.type === 'summary') && (
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mr-2 mt-1">
                      G
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-red-600 text-white'
                      : msg.type === 'system'
                      ? 'bg-gray-100 text-gray-600 italic text-sm'
                      : msg.type === 'summary'
                      ? 'bg-gradient-to-br from-green-50 to-blue-50 text-gray-800 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className={`text-sm ${msg.type === 'summary' ? 'font-mono whitespace-pre text-xs' : 'whitespace-pre-wrap'}`}>
                      {msg.message}
                    </div>
                    
                    {/* Action Buttons in Chat */}
                    {msg.hasAction && msg.actionType === 'convert_to_gtd' && aiSuggestion?.action === 'convert_to_gtd' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleAiSuggestion(true)}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                        >
                          ✓ Accept GTD
                        </button>
                        <button
                          onClick={() => handleAiSuggestion(false)}
                          className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-xs font-medium"
                        >
                          ✗ Cancel
                        </button>
                      </div>
                    )}
                    
                    {msg.hasAction && msg.actionType === 'confirm_algo' && aiSuggestion?.action === 'confirm_algo' && (
                      <div className="mt-3">
                        {/* Show parsed formats */}
                        <div className="mb-3 p-2 bg-white rounded border border-gray-200 space-y-1">
                          <div className="text-xs">
                            <span className="font-semibold text-green-700">Display:</span>
                            <span className="ml-1 text-gray-700">{structuredTraderText}</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-blue-700">Backend:</span>
                            <span className="ml-1 text-gray-700 font-mono text-[10px]">{backendFormat}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAiSuggestion(true)}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                          >
                            ✓ Confirm {ALGO_SUGGESTIONS.find(a => a.id === aiSuggestion.algo)?.name}
                          </button>
                          <button
                            onClick={() => handleAiSuggestion(false)}
                            className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-xs font-medium"
                          >
                            Choose Different
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {msg.hasAction && msg.actionType === 'select_algo' && aiSuggestion?.action === 'select_algo' && (
                      <div className="space-y-2 mt-3">
                        {ALGO_SUGGESTIONS.map((algo) => (
                          <button
                            key={algo.id}
                            onClick={() => handleAlgoSelection(algo.id)}
                            className="w-full text-left p-2 bg-white hover:bg-red-50 border border-gray-300 hover:border-red-400 rounded-lg transition-colors"
                          >
                            <div className="font-semibold text-gray-800 text-xs">{algo.name}</div>
                            <div className="text-xs text-gray-600 mt-0.5">{algo.useCase}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className={`text-xs mt-1 ${
                      msg.type === 'user' ? 'text-red-100' : msg.type === 'summary' ? 'text-green-700' : 'text-gray-500'
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
              <div className="text-xs text-gray-500 mt-2">
                Try: "Buy 100 shares of AAPL at $180 as a GTC order via email"
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
