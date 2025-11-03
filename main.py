"""
UBS Order Management System - Backend API
FastAPI server with Azure OpenAI and LangGraph integration
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any, List, Annotated
from datetime import datetime, date
import re
from enum import Enum
import os
from openai import AzureOpenAI
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

app = FastAPI(title="UBS OMS API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# AZURE OPENAI CONFIGURATION
# ============================================================================

# Initialize Azure OpenAI client
# Set these environment variables or replace with your values
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://your-resource.openai.azure.com/")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "your-api-key-here")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")  # or gpt-4o, gpt-35-turbo
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

try:
    azure_client = AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION
    )
    LLM_AVAILABLE = True
except Exception as e:
    print(f"Warning: Azure OpenAI not configured: {e}")
    LLM_AVAILABLE = False

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TimeInForce(str, Enum):
    DAY = "DAY"
    GTD = "GTD"
    GTC = "GTC"
    FOK = "FOK"

class ContactMethod(str, Enum):
    PHONE = "phone"
    EMAIL = "email"
    MEETING = "meeting"
    PORTAL = "portal"

class SecurityInfo(BaseModel):
    symbol: str = Field(..., description="Security symbol (e.g., AAPL)")
    market: str = Field(..., description="Market exchange (e.g., NASDAQ)")
    currency: str = Field(..., description="Currency code (e.g., USD)")
    name: str = Field(..., description="Full security name")
    price: float = Field(..., description="Current market price")

class OrderFormModel(BaseModel):
    """Pydantic model for order form - returned by AI service"""
    security: Optional[SecurityInfo] = Field(None, description="Security details")
    contact_method: ContactMethod = Field(ContactMethod.PHONE, description="Client contact method")
    quantity: Optional[int] = Field(None, description="Number of shares/units")
    price: Optional[float] = Field(None, description="Limit price (None for market order)")
    time_in_force: TimeInForce = Field(TimeInForce.DAY, description="Order duration type")
    gtd_date: Optional[date] = Field(None, description="Good till date (for GTD orders)")
    trader_text: str = Field("", description="Trader notes/instructions")

class AlgoType(str, Enum):
    VWAP = "vwap"
    TWAP = "twap"
    POV = "pov"
    IMPLEMENTATION_SHORTFALL = "implementation_shortfall"

class TraderTextParsed(BaseModel):
    """Pydantic model for parsed trader text - returned by LangGraph backend"""
    structured: str = Field(..., description="Human-readable structured format")
    algo: Optional[AlgoType] = Field(None, description="Detected algorithm type")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Extracted parameters")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Parsing confidence score")
    reasoning: str = Field("", description="LLM reasoning for the parsing")

class NaturalLanguageOrderRequest(BaseModel):
    """Request model for natural language order input"""
    text: str = Field(..., description="Natural language order description")

class TraderTextRequest(BaseModel):
    """Request model for trader text parsing"""
    text: str = Field(..., description="Trader instructions text")

class AutocompleteRequest(BaseModel):
    """Request model for autocomplete suggestions"""
    text: str = Field(..., description="Partial text input")

# ============================================================================
# MOCK SECURITIES DATABASE
# ============================================================================

SECURITIES_DB = {
    'AAPL': SecurityInfo(symbol='AAPL', market='NASDAQ', currency='USD', name='Apple Inc.', price=178.50),
    'GOOGL': SecurityInfo(symbol='GOOGL', market='NASDAQ', currency='USD', name='Alphabet Inc.', price=140.25),
    'MSFT': SecurityInfo(symbol='MSFT', market='NASDAQ', currency='USD', name='Microsoft Corporation', price=378.91),
    'TSLA': SecurityInfo(symbol='TSLA', market='NASDAQ', currency='USD', name='Tesla Inc.', price=242.84),
    'NOVN': SecurityInfo(symbol='NOVN', market='SIX', currency='CHF', name='Novartis AG', price=95.20),
    'NESN': SecurityInfo(symbol='NESN', market='SIX', currency='CHF', name='Nestlé S.A.', price=87.45),
}

# ============================================================================
# LANGGRAPH STATE AND WORKFLOW
# ============================================================================

class TraderTextState(TypedDict):
    """State for LangGraph trader text parsing workflow"""
    input_text: str
    normalized_text: str
    detected_algo: Optional[str]
    parameters: Dict[str, Any]
    structured_output: str
    confidence: float
    reasoning: str

def normalize_input(state: TraderTextState) -> TraderTextState:
    """Step 1: Normalize and clean input text"""
    text = state["input_text"].strip().lower()
    state["normalized_text"] = text
    return state

def detect_algorithm(state: TraderTextState) -> TraderTextState:
    """Step 2: Detect algorithm type using Azure OpenAI"""
    text = state["normalized_text"]
    
    if not LLM_AVAILABLE:
        # Fallback to rule-based detection
        if 'vwap' in text:
            state["detected_algo"] = "vwap"
        elif 'twap' in text:
            state["detected_algo"] = "twap"
        elif 'pov' in text or 'participation' in text:
            state["detected_algo"] = "pov"
        elif 'aggressive' in text or 'urgent' in text or 'shortfall' in text:
            state["detected_algo"] = "implementation_shortfall"
        else:
            state["detected_algo"] = None
        state["reasoning"] = "Rule-based detection (LLM not available)"
        return state
    
    # Use Azure OpenAI for intelligent detection
    prompt = f"""You are an expert in financial trading algorithms. Analyze the following trader instruction and identify the execution algorithm.

Trader Instruction: "{state['input_text']}"

Available algorithms:
- VWAP (Volume Weighted Average Price): Used to execute large orders over time matching the volume-weighted average price
- TWAP (Time Weighted Average Price): Executes orders evenly over a specified time period
- POV (Percentage of Volume): Executes as a percentage of market volume
- Implementation Shortfall: Balances urgency and market impact dynamically

Respond with ONLY the algorithm name (vwap, twap, pov, or implementation_shortfall) or "none" if unclear. Include a brief reason.

Format your response as:
ALGORITHM: [name]
REASON: [brief explanation]"""

    try:
        response = azure_client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are a financial trading algorithm expert."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        result = response.choices[0].message.content.strip()
        
        # Parse response
        algo_match = re.search(r'ALGORITHM:\s*(\w+)', result, re.IGNORECASE)
        reason_match = re.search(r'REASON:\s*(.+)', result, re.IGNORECASE | re.DOTALL)
        
        if algo_match:
            algo = algo_match.group(1).lower()
            state["detected_algo"] = algo if algo != "none" else None
        else:
            state["detected_algo"] = None
            
        state["reasoning"] = reason_match.group(1).strip() if reason_match else "LLM detection"
        
    except Exception as e:
        print(f"Error calling Azure OpenAI: {e}")
        state["detected_algo"] = None
        state["reasoning"] = f"Error: {str(e)}"
    
    return state

def extract_parameters(state: TraderTextState) -> TraderTextState:
    """Step 3: Extract algorithm-specific parameters using Azure OpenAI"""
    text = state["normalized_text"]
    algo = state["detected_algo"]
    
    if not algo:
        state["parameters"] = {}
        return state
    
    if not LLM_AVAILABLE:
        # Fallback parameter extraction
        params = {}
        
        if algo == "vwap":
            time_match = re.search(r'(\d{1,2}):(\d{2})', text)
            params["end_time"] = f"{time_match.group(1)}:{time_match.group(2)}" if time_match else "16:00"
            params["include_auctions"] = 'auction' in text
            params["start_time"] = "09:30"
            
        elif algo == "twap":
            duration_match = re.search(r'(\d+)\s*(hour|hr|minute|min)', text)
            if duration_match:
                params["duration"] = f"{duration_match.group(1)} {duration_match.group(2)}"
            else:
                params["duration"] = "full day"
                
        elif algo == "pov":
            pct_match = re.search(r'(\d+)\s*%', text)
            params["participation_rate"] = f"{pct_match.group(1)}%" if pct_match else "10%"
            
        elif algo == "implementation_shortfall":
            params["urgency"] = "high" if any(w in text for w in ['aggressive', 'urgent']) else "medium"
        
        state["parameters"] = params
        return state
    
    # Use Azure OpenAI for parameter extraction
    prompt = f"""Extract execution parameters from this trader instruction for a {algo.upper()} algorithm.

Trader Instruction: "{state['input_text']}"

Based on the algorithm type ({algo.upper()}), extract relevant parameters such as:
- For VWAP: start_time, end_time, include_auctions
- For TWAP: duration, number_of_slices
- For POV: participation_rate, min_rate, max_rate
- For Implementation Shortfall: urgency_level, risk_aversion

Respond ONLY with valid JSON containing the parameters. If a parameter is not specified, use reasonable defaults.

Example: {{"end_time": "16:00", "include_auctions": true}}"""

    try:
        response = azure_client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are a financial trading parameter extraction expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=300
        )
        
        result = response.choices[0].message.content.strip()
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            import json
            params = json.loads(json_match.group(0))
            state["parameters"] = params
        else:
            state["parameters"] = {}
            
    except Exception as e:
        print(f"Error extracting parameters: {e}")
        state["parameters"] = {}
    
    return state

def generate_structured_output(state: TraderTextState) -> TraderTextState:
    """Step 4: Generate human-readable structured output"""
    algo = state["detected_algo"]
    params = state["parameters"]
    
    if not algo:
        state["structured_output"] = f"Custom execution: {state['input_text']}"
        state["confidence"] = 0.5
        return state
    
    # Generate structured output based on algorithm
    if algo == "vwap":
        end_time = params.get("end_time", "16:00")
        auctions = " on all auctions" if params.get("include_auctions") else ""
        state["structured_output"] = f"VWAP Market Close [{end_time}]{auctions}"
        state["confidence"] = 0.95
        
    elif algo == "twap":
        duration = params.get("duration", "full day")
        state["structured_output"] = f"TWAP execution over {duration}"
        state["confidence"] = 0.92
        
    elif algo == "pov":
        rate = params.get("participation_rate", "10%")
        state["structured_output"] = f"POV {rate} participation rate"
        state["confidence"] = 0.90
        
    elif algo == "implementation_shortfall":
        urgency = params.get("urgency", "medium")
        state["structured_output"] = f"Implementation Shortfall - {urgency.capitalize()} urgency profile"
        state["confidence"] = 0.88
    else:
        state["structured_output"] = f"Custom execution: {state['input_text']}"
        state["confidence"] = 0.7
    
    return state

# Build LangGraph workflow
workflow = StateGraph(TraderTextState)

# Add nodes
workflow.add_node("normalize", normalize_input)
workflow.add_node("detect_algo", detect_algorithm)
workflow.add_node("extract_params", extract_parameters)
workflow.add_node("generate_output", generate_structured_output)

# Add edges
workflow.set_entry_point("normalize")
workflow.add_edge("normalize", "detect_algo")
workflow.add_edge("detect_algo", "extract_params")
workflow.add_edge("extract_params", "generate_output")
workflow.add_edge("generate_output", END)

# Compile the graph
trader_text_graph = workflow.compile()

# ============================================================================
# AI SERVICE - NATURAL LANGUAGE ORDER PARSING WITH AZURE OPENAI
# ============================================================================

def parse_natural_language_order_with_llm(text: str) -> OrderFormModel:
    """
    Parse natural language order text using Azure OpenAI
    """
    if not LLM_AVAILABLE:
        return parse_natural_language_order_fallback(text)
    
    # Create prompt for Azure OpenAI
    available_securities = "\n".join([f"- {s.symbol}: {s.name} ({s.market}, {s.currency})" for s in SECURITIES_DB.values()])
    
    prompt = f"""You are a financial order entry assistant. Parse the following natural language order instruction into structured data.

Available Securities:
{available_securities}

Order Instruction: "{text}"

Extract the following information:
1. Security (symbol, if mentioned)
2. Quantity (number of shares/units)
3. Price (if specified, otherwise null for market order)
4. Time in Force (DAY, GTC, GTD, or FOK)
5. Contact Method (phone, email, meeting, or portal)

Respond ONLY with valid JSON in this exact format:
{{
    "symbol": "AAPL" or null,
    "quantity": 100 or null,
    "price": 180.50 or null,
    "time_in_force": "GTC",
    "contact_method": "phone"
}}"""

    try:
        response = azure_client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are a financial order parsing expert. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=300
        )
        
        result = response.choices[0].message.content.strip()
        
        # Extract JSON
        import json
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            
            # Map to OrderFormModel
            security = None
            if parsed.get("symbol"):
                symbol = parsed["symbol"].upper()
                if symbol in SECURITIES_DB:
                    security = SECURITIES_DB[symbol]
            
            return OrderFormModel(
                security=security,
                quantity=parsed.get("quantity"),
                price=parsed.get("price"),
                time_in_force=TimeInForce(parsed.get("time_in_force", "DAY")),
                contact_method=ContactMethod(parsed.get("contact_method", "phone")),
                trader_text=""
            )
    except Exception as e:
        print(f"Error parsing with LLM: {e}")
        return parse_natural_language_order_fallback(text)
    
    return parse_natural_language_order_fallback(text)

def parse_natural_language_order_fallback(text: str) -> OrderFormModel:
    """
    Fallback rule-based parsing when LLM is unavailable
    """
    text_lower = text.lower()
    
    # Extract security
    security = None
    for symbol, sec_info in SECURITIES_DB.items():
        if symbol.lower() in text_lower or sec_info.name.lower() in text_lower:
            security = sec_info
            break
    
    # Extract quantity
    quantity = None
    qty_patterns = [
        r'(\d+)\s*shares?',
        r'(\d+)\s*units?',
        r'buy\s+(\d+)',
        r'sell\s+(\d+)',
        r'(\d+)\s+of',
    ]
    for pattern in qty_patterns:
        match = re.search(pattern, text_lower)
        if match:
            quantity = int(match.group(1))
            break
    
    # Extract price
    price = None
    price_patterns = [
        r'at\s+\$?(\d+\.?\d*)',
        r'price\s+\$?(\d+\.?\d*)',
        r'limit\s+\$?(\d+\.?\d*)',
    ]
    for pattern in price_patterns:
        match = re.search(pattern, text_lower)
        if match:
            price = float(match.group(1))
            break
    
    # Extract time in force
    time_in_force = TimeInForce.DAY
    if 'gtc' in text_lower or 'good til cancel' in text_lower:
        time_in_force = TimeInForce.GTC
    elif 'gtd' in text_lower or 'good til date' in text_lower:
        time_in_force = TimeInForce.GTD
    elif 'fok' in text_lower or 'fill or kill' in text_lower:
        time_in_force = TimeInForce.FOK
    
    # Extract contact method
    contact_method = ContactMethod.PHONE
    if 'email' in text_lower:
        contact_method = ContactMethod.EMAIL
    elif 'meeting' in text_lower or 'in person' in text_lower:
        contact_method = ContactMethod.MEETING
    elif 'portal' in text_lower or 'online' in text_lower:
        contact_method = ContactMethod.PORTAL
    
    return OrderFormModel(
        security=security,
        quantity=quantity,
        price=price,
        time_in_force=time_in_force,
        contact_method=contact_method,
        trader_text=""
    )

# ============================================================================
# AI SERVICE - AUTOCOMPLETE WITH AZURE OPENAI
# ============================================================================

def get_autocomplete_suggestions_with_llm(text: str) -> list[str]:
    """
    Generate autocomplete suggestions using Azure OpenAI
    """
    if not LLM_AVAILABLE or len(text) < 3:
        return get_autocomplete_suggestions_fallback(text)
    
    prompt = f"""You are an autocomplete assistant for financial trader notes. Given the partial text, suggest ONE complete phrase that a trader might want to type.

Partial text: "{text}"

Common trader instructions include:
- VWAP Market Close
- TWAP over [time period]
- POV [percentage]% participation
- Aggressive execution required
- Client requests immediate execution
- Priority order - high net worth client

Respond with ONLY ONE completion suggestion that starts with the given text. Be concise."""

    try:
        response = azure_client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=[
                {"role": "system", "content": "You are an autocomplete assistant. Respond with a single completion suggestion only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=50
        )
        
        suggestion = response.choices[0].message.content.strip()
        return [suggestion] if suggestion else []
        
    except Exception as e:
        print(f"Error generating suggestions: {e}")
        return get_autocomplete_suggestions_fallback(text)

def get_autocomplete_suggestions_fallback(text: str) -> list[str]:
    """Fallback autocomplete suggestions"""
    suggestions_map = {
        'vwap': ['VWAP Market Close', 'VWAP Market Close 16:00', 'VWAP with auctions'],
        'twap': ['TWAP over 2 hours', 'TWAP over trading day', 'TWAP 1 hour execution'],
        'pov': ['POV 10% participation', 'POV 15% participation rate', 'POV 5% target'],
        'aggr': ['aggressive execution required', 'aggressive - minimize slippage'],
        'urgent': ['urgent - minimize market impact', 'urgent execution needed'],
        'client': ['Client requests immediate execution', 'Client confirmed price tolerance'],
        'priority': ['Priority order - high net worth client', 'Priority - institutional client'],
        'rebal': ['Part of portfolio rebalancing strategy', 'Rebalancing trade - no rush'],
    }
    
    text_lower = text.lower().strip()
    
    for key, suggestions in suggestions_map.items():
        if text_lower.startswith(key):
            return [s for s in suggestions if s.lower().startswith(text_lower)]
    
    return []

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "UBS Order Management System API",
        "status": "operational",
        "version": "2.0.0",
        "features": {
            "azure_openai": LLM_AVAILABLE,
            "langgraph": True
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/parse-order", response_model=OrderFormModel)
async def parse_order_endpoint(request: NaturalLanguageOrderRequest):
    """
    Parse natural language order text using Azure OpenAI
    Example: "Buy 100 shares of AAPL as a GTC order"
    """
    try:
        order = parse_natural_language_order_with_llm(request.text)
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing order: {str(e)}")

@app.post("/api/parse-trader-text", response_model=TraderTextParsed)
async def parse_trader_text_endpoint(request: TraderTextRequest):
    """
    Parse trader text using LangGraph multi-step workflow with Azure OpenAI
    Example: "VWAP Market Close" -> "VWAP Market Close [16:00] on all auctions"
    """
    try:
        # Initialize state
        initial_state = TraderTextState(
            input_text=request.text,
            normalized_text="",
            detected_algo=None,
            parameters={},
            structured_output="",
            confidence=0.0,
            reasoning=""
        )
        
        # Run LangGraph workflow
        final_state = trader_text_graph.invoke(initial_state)
        
        # Return parsed result
        return TraderTextParsed(
            structured=final_state["structured_output"],
            algo=AlgoType(final_state["detected_algo"]) if final_state["detected_algo"] else None,
            parameters=final_state["parameters"],
            confidence=final_state["confidence"],
            reasoning=final_state["reasoning"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing trader text: {str(e)}")

@app.post("/api/autocomplete", response_model=list[str])
async def autocomplete_endpoint(request: AutocompleteRequest):
    """
    Get autocomplete suggestions using Azure OpenAI
    """
    try:
        suggestions = get_autocomplete_suggestions_with_llm(request.text)
        return suggestions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")

@app.get("/api/securities", response_model=list[SecurityInfo])
async def get_securities():
    """Get list of available securities"""
    return list(SECURITIES_DB.values())

@app.get("/api/securities/{symbol}", response_model=SecurityInfo)
async def get_security(symbol: str):
    """Get specific security information by symbol"""
    symbol_upper = symbol.upper()
    if symbol_upper not in SECURITIES_DB:
        raise HTTPException(status_code=404, detail=f"Security {symbol} not found")
    return SECURITIES_DB[symbol_upper]

@app.get("/api/health")
async def health_check():
    """Detailed health check including Azure OpenAI status"""
    return {
        "status": "healthy",
        "azure_openai": {
            "available": LLM_AVAILABLE,
            "endpoint": AZURE_OPENAI_ENDPOINT if LLM_AVAILABLE else "Not configured",
            "deployment": AZURE_OPENAI_DEPLOYMENT if LLM_AVAILABLE else "Not configured"
        },
        "langgraph": {
            "available": True,
            "workflow_nodes": ["normalize", "detect_algo", "extract_params", "generate_output"]
        }
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print(f"Azure OpenAI Available: {LLM_AVAILABLE}")
    print(f"LangGraph Workflow: Enabled")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
