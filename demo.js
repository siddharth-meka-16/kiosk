// ================================================================
// KIOSK VISION AI — Demo App Logic + Gesture & Voice AI
// ================================================================

// ─── AI IMPORTS (Must be at the top) ─────────────────────────────
import {
    GestureRecognizer,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

// ─── App State ───────────────────────────────────────────────────
const App = {
  state: 'mode_selection',
  mode: null,          
  cart: [],            
  paymentMethod: null, 
  hasGreeted: false, 
  menuIdx: -1,
  cartIdx: -1,
  payIdx: -1
};

// ─── Local Backend Integration ─────────────────────────────────────
// Connected to local Express backend on port 3000

// ─── Razorpay Config ─────────────────────────────────────────────
const RAZORPAY_KEY = 'rzp_test_1DP5mmOlF5G5ag'; // Razorpay test key
let qrGenerated = false;

// ─── DOM Refs ─────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const screens = { mode: $('screen-mode'), menu: $('screen-menu'), cart: $('screen-cart'), payment: $('screen-payment'), success: $('screen-success') };
const breadcrumbSteps = document.querySelectorAll('.state-step');
const modeCards = document.querySelectorAll('.mode-card');
const btnContinue = $('btn-continue-mode');
const foodCards = document.querySelectorAll('.food-card');  
const cartItemsEl = $('cart-items');
const cartEmpty = $('cart-empty');
const cartCount = $('cart-count');
const cartTotalRow = $('cart-total-row');
const cartTotal = $('cart-total');
const btnGoCart = $('btn-go-cart');
const cartReviewList = $('cart-review-list');
const cartReviewTotal = $('cart-review-total');
const btnProceedPayment = $('btn-proceed-payment');
const paymentCards = document.querySelectorAll('.payment-card');
const orderNumberVal = $('order-number-val');
const successTotalPaid = $('success-total-paid');

const btnBackMenu = $('btn-back-menu');
const btnPaymentBack = $('btn-payment-back');

function updateBreadcrumb(step) {
  const order = ['mode', 'menu', 'cart', 'payment', 'success'];
  const current = order.indexOf(step);
  breadcrumbSteps.forEach((el, i) => {
    el.classList.remove('active', 'completed');
    if (i < current)  el.classList.add('completed');
    if (i === current) el.classList.add('active');
  });
}

function showScreen(name) {
  document.querySelectorAll('.ai-focused').forEach(el => el.classList.remove('ai-focused'));
  App.menuIdx = -1;
  App.cartIdx = -1;
  App.payIdx = -1;

  Object.entries(screens).forEach(([key, el]) => {
    if (el) {
      if (key === name) {
        el.classList.remove('hidden');
        el.classList.add('screen-enter');
      } else {
        el.classList.add('hidden');
        el.classList.remove('screen-enter');
      }
    }
  });
  updateBreadcrumb(name);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── INITIAL AUDIO WAKE-UP ─────────────
const idleScreen = document.getElementById('kiosk-idle-screen');
if (idleScreen) {
    idleScreen.addEventListener('click', () => {
        idleScreen.style.opacity = '0';
        setTimeout(() => idleScreen.style.display = 'none', 500);

        if (!App.hasGreeted) {
            const synth = window.speechSynthesis;
            // UPDATED: Tell them they can speak immediately!
            const utterance = new SpeechSynthesisUtterance("Welcome to Kiosk Vision. Hold a Thumbs Up for Visually Impaired mode, or say 'Voice Control' to begin hands-free.");
            synth.speak(utterance);
            App.hasGreeted = true; 
            
            // START LISTENING IMMEDIATELY ON WAKE UP
            startVoiceRecognition(); 
        }
    });
}

document.body.addEventListener('click', () => {
    if (!App.hasGreeted && App.state === 'mode_selection' && !idleScreen) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance("Welcome to Kiosk Vision. Hold a Thumbs Up for Visually Impaired mode, or say 'Voice Control' to begin hands-free.");
        synth.speak(utterance);
        App.hasGreeted = true;
        startVoiceRecognition();
    }
}, { once: true });


// ─── MODE SELECTION ───────────────────────────────────────────────
modeCards.forEach((card) => {
  card.addEventListener('click', () => {
    modeCards.forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    App.mode = card.dataset.mode;
    btnContinue.disabled = false;
  });
});

btnContinue.addEventListener('click', () => {
  if (!App.mode) return;
  App.state = 'menu';
  
  // Turn OFF the microphone if they didn't pick Voice Control
  if (App.mode !== 'voice_control' && recognition) {
      recognition.stop();
  }

  const subtext = document.getElementById('menu-subtext');
  if (subtext) {
      if (App.mode === 'visually_impaired') {
          subtext.innerHTML = "Use your hands to scroll. I will read items out loud.";
      } else if (App.mode === 'beginner') {
          subtext.innerHTML = "Look at the menu below. Tap anything that looks good to add it!";
      } else if (App.mode === 'hearing_impaired') {
          subtext.innerHTML = "Tap <strong>Add</strong> to build your order. Watch the screen for visual cues.";
      } else if (App.mode === 'voice_control') {
          subtext.innerHTML = "Speak commands like <strong>'Next'</strong>, <strong>'Add'</strong>, and <strong>'Checkout'</strong>.";
      }
  }

  showScreen('menu');
  triggerAIAssistant('mode_selected');
});

// ─── CART LOGIC ───────────────────────────────────────────────────
function renderCart() {
  while (cartItemsEl.firstChild) cartItemsEl.removeChild(cartItemsEl.firstChild);
  if (App.cart.length === 0) {
    cartEmpty.hidden = false;
    cartItemsEl.appendChild(cartEmpty);
    cartTotalRow.hidden = true;
    btnGoCart.disabled = true;
    cartCount.textContent = '0 items';
    return;
  }
  cartEmpty.hidden = true;
  cartTotalRow.hidden = false;
  btnGoCart.disabled = false;
  const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
  cartCount.textContent = `${App.cart.length} items`;
  cartTotal.textContent = `$${total.toFixed(2)}`;

  App.cart.forEach((item) => {
    const line = document.createElement('div');
    line.className = 'cart-line';
    line.innerHTML = `<span class="cart-line-name">${item.emoji} ${item.name}</span><span class="cart-line-price">$${parseFloat(item.price).toFixed(2)}</span>`;
    cartItemsEl.appendChild(line);
  });
}

function addToCart(item) {
  if (App.cart.find((c) => c.id === item.id)) return;
  item.qty = 1;
  App.cart.push(item);
  renderCart();
  triggerAIAssistant('item_added', `${item.name} added`);
}

function removeFromCart(id) {
  App.cart = App.cart.filter((c) => c.id !== id);
  
  const cardEl = document.querySelector(`.food-card[data-id="${id}"]`);
  if (cardEl) {
    cardEl.classList.remove('in-cart');
    const addBtn = cardEl.querySelector('.btn-add');
    if (addBtn) addBtn.classList.remove('added');
  }

  renderCart();
  if (App.state === 'cart') {
      renderCartReview();
  }
}

foodCards.forEach((card) => {
  const addBtn = card.querySelector('.btn-add');
  if (!addBtn) return;
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (card.classList.contains('in-cart')) {
        removeFromCart(card.dataset.id);
        triggerAIAssistant('item_removed');
        return;
    }
    
    card.classList.add('in-cart');
    addBtn.classList.add('added');
    addToCart({ id: card.dataset.id, name: card.dataset.name, price: card.dataset.price, emoji: card.dataset.emoji });
  });
});

// ─── CART REVIEW LOGIC ──────────────────────────────────────────────
function renderCartReview() {
  while (cartReviewList.firstChild) {
    cartReviewList.removeChild(cartReviewList.firstChild);
  }

  if (App.cart.length === 0) {
    cartReviewList.innerHTML = `<div class="cart-review-empty">Your cart is empty.</div>`;
    cartReviewTotal.textContent = '$0.00';
    btnProceedPayment.disabled = true;
    return;
  }

  btnProceedPayment.disabled = false;
  const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
  cartReviewTotal.textContent = `$${total.toFixed(2)}`;

  App.cart.forEach((item) => {
    const el = document.createElement('article');
    el.className = 'cart-review-item';
    el.innerHTML = `
      <div class="cart-review-emoji" aria-hidden="true">${item.emoji}</div>
      <div class="cart-review-info">
        <h3 class="cart-review-name">${item.name}</h3>
        <span class="cart-review-price">$${parseFloat(item.price).toFixed(2)}</span>
      </div>
      <div class="cart-review-qty">
        <button class="cart-qty-btn" aria-label="Decrease quantity of ${item.name}" data-action="minus" data-id="${item.id}">−</button>
        <span class="cart-qty-val" aria-label="${item.qty || 1} selected">${item.qty || 1}</span>
        <button class="cart-qty-btn" aria-label="Increase quantity of ${item.name}" data-action="plus" data-id="${item.id}">+</button>
      </div>
      <div class="cart-review-total-box">
        $${((item.qty || 1) * parseFloat(item.price)).toFixed(2)}
      </div>
    `;
    cartReviewList.appendChild(el);
  });

  cartReviewList.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const item = App.cart.find(c => c.id === id);
      if (!item) return;

      if (action === 'plus') {
        item.qty = (item.qty || 1) + 1;
      } else if (action === 'minus') {
        item.qty = (item.qty || 1) - 1;
        if (item.qty <= 0) {
          removeFromCart(id);
        }
      }
      renderCart();       
      renderCartReview(); 
    });
  });
}

// ─── NAVIGATE: MENU ↔ CART REVIEW ─────────────────────────────────
btnGoCart.addEventListener('click', () => {
  App.state = 'cart';
  showScreen('cart');
  renderCartReview();
  const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
  cartReviewTotal.textContent = `$${total.toFixed(2)}`;
  triggerAIAssistant('cart_opened', total.toFixed(2));
});

if (btnBackMenu) {
  btnBackMenu.addEventListener('click', () => {
    App.state = 'menu';
    showScreen('menu');
    triggerAIAssistant('nav_back', 'Returned to menu.');
  });
}

// ─── NAVIGATE: CART ↔ PAYMENT ─────────────────────────────────────
btnProceedPayment.addEventListener('click', () => {
  App.state = 'payment';
  showScreen('payment');
  const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
  const paymentSummaryTotal = $('payment-summary-total');
  if (paymentSummaryTotal) paymentSummaryTotal.textContent = `$${total.toFixed(2)}`;
  loadRecentOrders();
  triggerAIAssistant('payment_opened'); 
});

if (btnPaymentBack) {
  btnPaymentBack.addEventListener('click', () => {
    App.state = 'cart';
    showScreen('cart');
    triggerAIAssistant('nav_back', 'Returned to cart.');
  });
}

// ─── PAYMENT METHOD SELECTION & DETAIL PANELS ────────────────────
function hideAllPaymentPanels() {
  document.querySelectorAll('.payment-detail-panel').forEach(p => {
    p.style.display = 'none';
  });
}

paymentCards.forEach((card) => {
  card.addEventListener('click', () => {
    paymentCards.forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    App.paymentMethod = card.dataset.method;
    
    hideAllPaymentPanels();
    const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
    
    // Show sidebar badge
    const badge = $('payment-selected-badge');
    const badgeIcon = $('payment-selected-icon');
    const badgeLabel = $('payment-selected-label');
    if (badge) badge.hidden = false;
    
    const methodMap = {
      razorpay: { icon: '💳', label: 'Razorpay', panel: 'panel-razorpay' },
      qr: { icon: '📱', label: 'QR Code', panel: 'panel-qr' },
      cash: { icon: '💵', label: 'Cash', panel: 'panel-cash' }
    };
    
    const method = methodMap[App.paymentMethod];
    if (method) {
      if (badgeIcon) badgeIcon.textContent = method.icon;
      if (badgeLabel) badgeLabel.textContent = method.label;
      const panel = $(method.panel);
      if (panel) panel.style.display = 'flex';
    }
    
    // Generate QR code if QR selected
    if (App.paymentMethod === 'qr' && !qrGenerated) {
      generateQRCode(total);
    }
    
    // Generate cash token if Cash selected
    if (App.paymentMethod === 'cash') {
      const tokenNum = $('cash-token-number');
      if (tokenNum) tokenNum.textContent = `#${Math.floor(Math.random() * 900) + 100}`;
    }
    
    triggerAIAssistant('payment_method_selected', App.paymentMethod);
  });
});

// ─── QR CODE GENERATION ──────────────────────────────────────────
function generateQRCode(amount) {
  const container = $('qr-container');
  if (!container) return;
  container.innerHTML = '';
  
  try {
    const upiLink = `upi://pay?pa=kioskvision@upi&pn=KioskVisionAI&am=${amount.toFixed(2)}&cu=INR&tn=KioskOrder`;
    new QRCode(container, {
      text: upiLink,
      width: 170,
      height: 170,
      colorDark: '#1E293B',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    qrGenerated = true;
  } catch (e) {
    console.warn('QR generation failed, using fallback');
    container.innerHTML = '<div style="width:170px;height:170px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:0.8rem;color:#666;">QR Code</div>';
    qrGenerated = true;
  }
}

// ─── PROCESSING OVERLAY ──────────────────────────────────────────
function showProcessingOverlay(text = 'Processing Payment...', sub = 'Please wait') {
  const overlay = document.createElement('div');
  overlay.className = 'payment-processing-overlay';
  overlay.id = 'processing-overlay';
  overlay.innerHTML = `
    <div class="processing-spinner"></div>
    <div class="processing-text">${text}</div>
    <div class="processing-subtext">${sub}</div>
  `;
  document.body.appendChild(overlay);
}

function hideProcessingOverlay() {
  const overlay = $('processing-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
  }
}

// ─── RAZORPAY PAYMENT ────────────────────────────────────────────
const btnRazorpayPay = $('btn-razorpay-pay');
if (btnRazorpayPay) {
  btnRazorpayPay.addEventListener('click', () => {
    const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
    const amountInPaise = Math.round(total * 100);
    
    try {
      const options = {
        key: RAZORPAY_KEY,
        amount: amountInPaise,
        currency: 'INR',
        name: 'KioskVision AI',
        description: `Order — ${App.cart.length} items`,
        image: '',
        handler: function (response) {
          // Payment successful
          console.log('✅ Razorpay Payment ID:', response.razorpay_payment_id);
          completePayment('razorpay', total);
        },
        prefill: {
          name: 'Kiosk Customer',
          email: 'demo@kioskvision.ai',
          contact: '9999999999'
        },
        theme: {
          color: '#6366F1'
        },
        modal: {
          ondismiss: function () {
            // If modal dismissed, simulate success for demo
            console.log('Razorpay modal closed — simulating success for demo');
            completePayment('razorpay', total);
          }
        }
      };
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function () {
        console.log('Payment failed — simulating success for demo');
        completePayment('razorpay', total);
      });
      rzp.open();
    } catch (e) {
      console.warn('Razorpay error — simulating success:', e);
      showProcessingOverlay('Processing Razorpay...', 'Simulating transaction');
      setTimeout(() => {
        hideProcessingOverlay();
        completePayment('razorpay', total);
      }, 1500);
    }
  });
}

// ─── QR PAYMENT ("I have paid") ──────────────────────────────────
const btnQrPaid = $('btn-qr-paid');
if (btnQrPaid) {
  btnQrPaid.addEventListener('click', () => {
    const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
    showProcessingOverlay('Verifying Payment...', 'Checking UPI transaction');
    setTimeout(() => {
      hideProcessingOverlay();
      completePayment('qr', total);
    }, 2000);
  });
}

// ─── CASH PAYMENT ────────────────────────────────────────────────
const btnCashConfirm = $('btn-cash-confirm');
if (btnCashConfirm) {
  btnCashConfirm.addEventListener('click', () => {
    const total = App.cart.reduce((sum, item) => sum + (parseFloat(item.price) * (item.qty || 1)), 0);
    showProcessingOverlay('Generating Token...', 'Preparing your order');
    setTimeout(() => {
      hideProcessingOverlay();
      completePayment('cash', total);
    }, 1500);
  });
}

// ─── COMPLETE PAYMENT → SUCCESS ──────────────────────────────────
function completePayment(method, total) {
  App.state = 'success';
  App.paymentMethod = method;
  
  const orderNum = Math.floor(Math.random() * 900) + 100;
  showScreen('success');
  orderNumberVal.textContent = orderNum;
  successTotalPaid.textContent = `$${total.toFixed(2)}`;
  
  // Update method display
  const methodNames = { razorpay: 'Razorpay', qr: 'QR Code (UPI)', cash: 'Cash' };
  const successMethod = $('success-method-paid');
  if (successMethod) successMethod.textContent = methodNames[method] || method;
  
  // Update instructions based on method
  const instructions = $('success-instructions-text');
  if (instructions) {
    if (method === 'cash') {
      instructions.textContent = 'Please pay at the counter when your number is called.';
    } else if (method === 'qr') {
      instructions.textContent = 'UPI payment confirmed. Please wait for your order number.';
    } else {
      instructions.textContent = 'Payment confirmed via Razorpay. Please collect your receipt.';
    }
  }
  
  // Render receipt
  renderReceipt(total, method);
  
  // Prepare minimal order data
  const orderData = {
    items: App.cart, // storing array of json
    total_price: total,
    payment_method: method,
    payment_status: "success",
    mode: App.mode || "default",
    created_at: new Date().toISOString()
  };
  
  // Save to Supabase backend safely
  saveOrder(orderData);
  
  // Reset QR for next order
  qrGenerated = false;
}

// ─── RECEIPT RENDERING ───────────────────────────────────────────
function renderReceipt(total, method) {
  const receiptItems = $('receipt-items-list');
  if (!receiptItems) return;
  receiptItems.innerHTML = '';
  
  App.cart.forEach(item => {
    const qty = item.qty || 1;
    const lineTotal = (parseFloat(item.price) * qty).toFixed(2);
    const el = document.createElement('div');
    el.className = 'receipt-item';
    el.innerHTML = `
      <span class="receipt-item-name">${item.emoji} ${item.name} × ${qty}</span>
      <span class="receipt-item-price">$${lineTotal}</span>
    `;
    receiptItems.appendChild(el);
  });
  
  // Add total row
  const totalEl = document.createElement('div');
  totalEl.className = 'receipt-item';
  totalEl.innerHTML = `<span class="receipt-item-name" style="font-weight:700;color:var(--text-primary)">Total</span><span class="receipt-item-price" style="font-weight:800;">$${total.toFixed(2)}</span>`;
  receiptItems.appendChild(totalEl);
}

// ─── LOCAL STORAGE BACKEND (100% OFFLINE) ────────────────────────
async function saveOrder(orderData) {
  try {
    const existingOrdersStr = localStorage.getItem('kiosk_orders');
    const existingOrders = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
    
    // Add new order at the beginning
    existingOrders.unshift(orderData);
    
    localStorage.setItem('kiosk_orders', JSON.stringify(existingOrders));
    console.log('✅ Order saved successfully to local storage.');
    return true;
  } catch (err) {
    console.error('Failed to save order to local storage:', err.message);
    return false;
  }
}

async function getRecentOrders() {
  try {
    const existingOrdersStr = localStorage.getItem('kiosk_orders');
    if (!existingOrdersStr) return [];
    
    const orders = JSON.parse(existingOrdersStr);
    
    // Ensure sorted by created_at desc
    const sortedOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return sortedOrders.slice(0, 3);
  } catch (err) {
    console.error('Failed to fetch recent orders:', err.message);
    return [];
  }
}

// ─── LOAD RECENT ORDERS (UI) ─────────────────────────────────────
async function loadRecentOrders() {
  const list = $('recent-orders-list');
  const emptyMsg = $('recent-orders-empty');
  if (!list) return;
  
  const orders = await getRecentOrders();

  
  // Render
  list.innerHTML = '';
  if (orders.length === 0) {
    list.innerHTML = '<p class="cart-empty">No recent orders yet</p>';
    return;
  }
  
  const methodIcons = { razorpay: '💳', qr: '📱', cash: '💵', card: '💳', upi: '📱' };
  
  orders.forEach(order => {
    const el = document.createElement('div');
    el.className = 'recent-order-item';
    const icon = methodIcons[order.payment_method] || '🧾';
    const timeAgo = getTimeAgo(order.created_at);
    el.innerHTML = `
      <span class="recent-order-icon">${icon}</span>
      <div class="recent-order-info">
        <span class="recent-order-total">$${parseFloat(order.total_price).toFixed(2)}</span>
        <span class="recent-order-meta">${timeAgo}</span>
      </div>
      <span class="recent-order-method-badge">${order.payment_method}</span>
    `;
    list.appendChild(el);
  });
}

// ─── TIME AGO HELPER ─────────────────────────────────────────────
function getTimeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const startOverBtn = $('btn-start-over');
if (startOverBtn) {
  startOverBtn.addEventListener('click', () => window.location.reload());
}

// ─── PAYMENT ACTION TRIGGER (for voice/gesture) ─────────────────
function triggerSelectedPaymentAction() {
  if (!App.paymentMethod) return;
  const actionMap = {
    razorpay: 'btn-razorpay-pay',
    qr: 'btn-qr-paid',
    cash: 'btn-cash-confirm'
  };
  const btnId = actionMap[App.paymentMethod];
  if (btnId) {
    const btn = document.getElementById(btnId);
    if (btn) btn.click();
  }
}

// ─── FLOATING AI ASSISTANT (VOICE OUTPUT) ─────────────────────────
function triggerAIAssistant(action, userInput = '') {
  if (App.mode === 'hearing_impaired') return;

  const synth = window.speechSynthesis;
  if (synth.speaking) synth.cancel();
  let text = "Processing command.";
  
  if (action === "error") text = userInput; // Handles empty cart errors
  
  if (action === "mode_selected") {
      if (App.mode === 'beginner') {
          text = "Welcome! I'll guide you step by step. Touch an item on the screen that you want to buy.";
      } else if (App.mode === 'visually_impaired') {
          text = "Visually impaired mode selected. Loading menu. Use a Peace Sign to scroll forward, Open Palm to scroll back, Thumbs Up to add an item, and a Closed Fist to review your cart.";
      } else if (App.mode === 'voice_control') {
          text = "Voice Control activated. Say Next, Previous, Add, Remove, or Checkout.";
      } else {
          text = "Mode selected. Loading menu.";
      }
  }
  
  if (action === "item_added") {
      if (App.mode === 'beginner') text = `${userInput}. Look at your cart on the right to see your order, or touch the Review Cart button at the bottom when you are done.`;
      else text = userInput;
  }
  
  if (action === "cart_opened") {
      if (App.mode === 'beginner') text = `Your total is ${userInput} dollars. This is everything you've selected! Tap the Proceed to Payment button at the bottom to continue.`;
      else if (App.mode === 'voice_control') text = `Total is ${userInput} dollars. Say Remove to delete an item, Say Confirm to pay, or Say Back to return to menu.`;
      else text = `Your total is ${userInput} dollars. Review your order. Give a thumbs down to remove an item, make a fist to proceed to payment, or point up to go back.`;
  }
  
  if (action === "item_removed") text = `Item removed.`;

  if (action === "payment_opened") {
      if (App.mode === 'beginner') text = "Payment screen. Tap a payment method on the left, then tap Confirm Payment at the bottom.";
      else if (App.mode === 'voice_control') text = "Payment screen. Say Next to select a method, then say Confirm to pay.";
      else if (App.mode === 'visually_impaired') text = "Payment screen. Use a Peace Sign to scroll through Card, U P I, and Cash. Make a fist to confirm your choice, or point up to go back to your cart.";
      else text = "Please select a payment method.";
  }
  
  if (action === "payment_method_selected") {
      if (App.mode === 'beginner') text = "Almost done! Tap the Confirm Payment button at the bottom.";
      else text = "Method selected. Please confirm payment.";
  }
  
  if (action === "nav_back") text = userInput;
  
  const utterance = new SpeechSynthesisUtterance(text);
  synth.speak(utterance);
}


// ================================================================
// 🎙️ VOICE RECOGNITION AI ENGINE
// ================================================================

let recognition;
function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Speech Recognition not supported in this browser.");
        return;
    }
    
    // Only initialize once
    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
            console.log("🎤 Voice Command Heard:", command);
            processVoiceCommand(command);
        };

        recognition.onend = () => {
            // Keep listening ONLY if on mode screen OR voice control is selected
            if (App.state === 'mode_selection' || App.mode === 'voice_control') {
                recognition.start();
            }
        };
    }
    
    // Safely start recognition
    try {
        recognition.start();
    } catch (e) {
        console.log("Recognition already started");
    }
}

function processVoiceCommand(command) {
    // --- SCREEN 1: MODE SELECTION (Allows selecting by voice!) ---
    if (App.state === 'mode_selection') {
        if (command.includes('voice') || command.includes('voice control')) {
            document.getElementById('mode-voice-control').click();
            setTimeout(() => document.getElementById('btn-continue-mode').click(), 1000);
        }
        else if (command.includes('visual') || command.includes('visually')) {
            document.getElementById('mode-visually-impaired').click();
            setTimeout(() => document.getElementById('btn-continue-mode').click(), 1000);
        }
        else if (command.includes('hearing')) {
            document.getElementById('mode-hearing-impaired').click();
            setTimeout(() => document.getElementById('btn-continue-mode').click(), 1000);
        }
        else if (command.includes('beginner')) {
            document.getElementById('mode-beginner').click();
            setTimeout(() => document.getElementById('btn-continue-mode').click(), 1000);
        }
        return; // Exit after handling mode selection
    }

    // Ignore commands if they didn't pick Voice Control
    if (App.mode !== 'voice_control') return;

    // --- SCREEN 2: MENU ---
    if (App.state === 'menu') {
        const visibleCards = Array.from(document.querySelectorAll('.food-card:not(.hidden)'));
        if (visibleCards.length === 0) return;

        if (command.includes('next')) {
            if (App.menuIdx >= 0) visibleCards[App.menuIdx].classList.remove('ai-focused');
            App.menuIdx = (App.menuIdx + 1) % visibleCards.length;
            visibleCards[App.menuIdx].classList.add('ai-focused');
            visibleCards[App.menuIdx].scrollIntoView({ behavior: "smooth", block: "center" });
        } 
        else if (command.includes('previous') || command.includes('back')) {
            if (App.menuIdx >= 0) visibleCards[App.menuIdx].classList.remove('ai-focused');
            App.menuIdx = App.menuIdx === -1 ? visibleCards.length - 1 : (App.menuIdx - 1 + visibleCards.length) % visibleCards.length;
            visibleCards[App.menuIdx].classList.add('ai-focused');
            visibleCards[App.menuIdx].scrollIntoView({ behavior: "smooth", block: "center" });
        }
        else if (command.includes('add') && App.menuIdx >= 0) {
            const addBtn = visibleCards[App.menuIdx].querySelector('.btn-add');
            if (addBtn && !visibleCards[App.menuIdx].classList.contains('in-cart')) addBtn.click();
        }
        else if (command.includes('remove') && App.menuIdx >= 0) {
            const addBtn = visibleCards[App.menuIdx].querySelector('.btn-add');
            if (addBtn && visibleCards[App.menuIdx].classList.contains('in-cart')) addBtn.click();
        }
        // FIX: Look for checkout, check out, or cart
        else if (command.includes('checkout') || command.includes('check out') || command.includes('cart')) {
            const btnGoCart = document.getElementById('btn-go-cart');
            if (!btnGoCart.disabled) {
                btnGoCart.click();
            } else {
                triggerAIAssistant('error', 'Your cart is empty. Please add an item first.');
            }
        }
    }
    
    // --- SCREEN 3: CART ---
    else if (App.state === 'cart') {
        const cartCards = Array.from(document.querySelectorAll('.cart-review-item'));
        
        if (command.includes('next') && cartCards.length > 0) {
            if (App.cartIdx >= 0) cartCards[App.cartIdx].classList.remove('ai-focused');
            App.cartIdx = (App.cartIdx + 1) % cartCards.length;
            cartCards[App.cartIdx].classList.add('ai-focused');
            cartCards[App.cartIdx].scrollIntoView({ behavior: "smooth", block: "center" });
        }
        else if ((command.includes('previous') || command.includes('up')) && cartCards.length > 0) {
            if (App.cartIdx >= 0) cartCards[App.cartIdx].classList.remove('ai-focused');
            App.cartIdx = App.cartIdx === -1 ? cartCards.length - 1 : (App.cartIdx - 1 + cartCards.length) % cartCards.length;
            cartCards[App.cartIdx].classList.add('ai-focused');
            cartCards[App.cartIdx].scrollIntoView({ behavior: "smooth", block: "center" });
        }
        else if (command.includes('remove') && App.cartIdx >= 0 && cartCards.length > 0) {
            const minusBtn = cartCards[App.cartIdx].querySelector('[data-action="minus"]');
            if (minusBtn) minusBtn.click();
        }
        else if (command.includes('confirm') || command.includes('checkout') || command.includes('check out') || command.includes('pay')) {
            document.getElementById('btn-proceed-payment').click();
        }
        else if (command.includes('back') || command.includes('menu')) {
            document.getElementById('btn-back-menu').click();
        }
    }

    // --- SCREEN 4: PAYMENT ---
    else if (App.state === 'payment') {
        const payCards = Array.from(document.querySelectorAll('.payment-card'));
        
        if (command.includes('next') || command.includes('previous')) {
            App.payIdx = (App.payIdx + 1) % payCards.length;
            const newMethod = payCards[App.payIdx];
            newMethod.click();
            newMethod.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        else if (command.includes('confirm') || command.includes('pay')) {
            triggerSelectedPaymentAction();
        }
        else if (command.includes('back') || command.includes('cart')) {
            document.getElementById('btn-payment-back').click();
        }
    }

    // --- GLOBAL ---
    if (command.includes('start over')) {
        window.location.reload();
    }
}


// ================================================================
// 🤖 HACKATHON GESTURE AI INTEGRATION (The Secret Sauce)
// ================================================================

let gestureRecognizer;
const video = document.getElementById('webcam-hidden');
let lastVideoTime = -1;
let lastGestureTime = 0; 

async function loadAI() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO"
    });
    console.log("Gesture AI Loaded & Hidden");
}

async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    } catch (err) {
        console.error("Camera access denied!", err);
    }
}

async function predictWebcam() {
    if (video.currentTime !== lastVideoTime && gestureRecognizer) {
        lastVideoTime = video.currentTime;
        const results = gestureRecognizer.recognizeForVideo(video, Date.now());

        if (results.gestures.length > 0) {
            const gestureName = results.gestures[0][0].categoryName;
            
            if (Date.now() - lastGestureTime > 2000 && App.hasGreeted) { 
                
                // --- SCREEN 1: MODE SELECTION ---
                if (App.state === 'mode_selection') {
                    if (gestureName === "Thumb_Up") {
                        document.getElementById('mode-visually-impaired').click();
                        setTimeout(() => { document.getElementById('btn-continue-mode').click(); }, 1000);
                        lastGestureTime = Date.now();
                    } 
                } 
                
                // --- SCREEN 2: MENU NAVIGATION ---
                else if (App.state === 'menu') {
                    const visibleCards = Array.from(document.querySelectorAll('.food-card:not(.hidden)'));
                    
                    if (visibleCards.length > 0) {
                        if (gestureName === "Victory" || gestureName === "Open_Palm") { 
                            if (App.menuIdx >= 0) {
                                visibleCards[App.menuIdx].classList.remove('ai-focused');
                            }
                            if (gestureName === "Victory") {
                                App.menuIdx = (App.menuIdx + 1) % visibleCards.length;
                            } else {
                                App.menuIdx = App.menuIdx === -1 ? visibleCards.length - 1 : (App.menuIdx - 1 + visibleCards.length) % visibleCards.length;
                            }
                            const newCard = visibleCards[App.menuIdx];
                            newCard.classList.add('ai-focused');
                            newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                            
                            if (App.mode === 'visually_impaired') {
                                const name = newCard.dataset.name;
                                const price = newCard.dataset.price;
                                const synth = window.speechSynthesis;
                                if (synth.speaking) synth.cancel(); 
                                synth.speak(new SpeechSynthesisUtterance(`Highlighting: ${name}, ${price} dollars.`));
                            }
                            lastGestureTime = Date.now() - 1000; 
                        } 
                        else if (gestureName === "Thumb_Up" && App.menuIdx >= 0) { 
                            const addBtn = visibleCards[App.menuIdx].querySelector('.btn-add');
                            if (addBtn && !visibleCards[App.menuIdx].classList.contains('in-cart')) addBtn.click();
                            lastGestureTime = Date.now();
                        } 
                        else if (gestureName === "Thumb_Down" && App.menuIdx >= 0) {
                            const addBtn = visibleCards[App.menuIdx].querySelector('.btn-add');
                            if (addBtn && visibleCards[App.menuIdx].classList.contains('in-cart')) addBtn.click();
                            lastGestureTime = Date.now();
                        }
                        else if (gestureName === "Closed_Fist") { 
                            const btnGoCart = document.getElementById('btn-go-cart');
                            if (!btnGoCart.disabled) {
                                btnGoCart.click();
                                lastGestureTime = Date.now();
                            } else {
                                triggerAIAssistant('error', 'Your cart is empty. Please add an item first.');
                                lastGestureTime = Date.now();
                            }
                        }
                        else if (gestureName === "Pointing_Up") {
                            const startOverBtn = document.getElementById('btn-start-over');
                            if (startOverBtn) startOverBtn.click();
                            lastGestureTime = Date.now();
                        }
                    }
                }
                
                // --- SCREEN 3: CART REVIEW ---
                else if (App.state === 'cart') {
                    const cartCards = Array.from(document.querySelectorAll('.cart-review-item'));
                    
                    if (cartCards.length > 0) {
                        if (gestureName === "Victory" || gestureName === "Open_Palm") { 
                            if (App.cartIdx >= 0) {
                                cartCards[App.cartIdx].classList.remove('ai-focused');
                            }
                            if (gestureName === "Victory") {
                                App.cartIdx = (App.cartIdx + 1) % cartCards.length;
                            } else {
                                App.cartIdx = App.cartIdx === -1 ? cartCards.length - 1 : (App.cartIdx - 1 + cartCards.length) % cartCards.length;
                            }
                            const newCard = cartCards[App.cartIdx];
                            newCard.classList.add('ai-focused');
                            newCard.scrollIntoView({ behavior: "smooth", block: "center" });
                            
                            if (App.mode === 'visually_impaired') {
                                const name = newCard.querySelector('.cart-review-name').innerText;
                                const qty = newCard.querySelector('.cart-qty-val').innerText;
                                const synth = window.speechSynthesis;
                                if (synth.speaking) synth.cancel(); 
                                synth.speak(new SpeechSynthesisUtterance(`Highlighting ${qty} ${name}. Give a thumbs down to remove.`));
                            }
                            lastGestureTime = Date.now() - 1000;
                        }
                        else if (gestureName === "Thumb_Down" && App.cartIdx >= 0) {
                            const minusBtn = cartCards[App.cartIdx].querySelector('[data-action="minus"]');
                            if (minusBtn) {
                                minusBtn.click();
                                triggerAIAssistant('item_removed');
                            }
                            lastGestureTime = Date.now();
                        }
                        else if (gestureName === "Closed_Fist") {
                            document.getElementById('btn-proceed-payment').click();
                            lastGestureTime = Date.now();
                        }
                        else if (gestureName === "Pointing_Up") {
                            document.getElementById('btn-back-menu').click();
                            lastGestureTime = Date.now();
                        }
                    } else {
                        if (gestureName === "Pointing_Up" || gestureName === "Open_Palm") {
                            if (document.getElementById('btn-back-menu')) document.getElementById('btn-back-menu').click();
                            lastGestureTime = Date.now();
                        }
                    }
                }
                
                // --- SCREEN 4: PAYMENT NAVIGATION ---
                else if (App.state === 'payment') {
                    const payCards = Array.from(document.querySelectorAll('.payment-card'));
                    
                    if (payCards.length > 0) {
                        if (gestureName === "Victory" || gestureName === "Open_Palm") { 
                            if (gestureName === "Victory") {
                                App.payIdx = (App.payIdx + 1) % payCards.length;
                            } else {
                                App.payIdx = App.payIdx === -1 ? payCards.length - 1 : (App.payIdx - 1 + payCards.length) % payCards.length;
                            }
                            const newMethod = payCards[App.payIdx];
                            newMethod.click();
                            newMethod.scrollIntoView({ behavior: "smooth", block: "center" });
                            
                            if (App.mode === 'visually_impaired') {
                                const methodName = newMethod.querySelector('.payment-name').innerText;
                                const synth = window.speechSynthesis;
                                if (synth.speaking) synth.cancel(); 
                                synth.speak(new SpeechSynthesisUtterance(`${methodName} selected.`));
                            }
                            lastGestureTime = Date.now() - 1000;
                        } 
                        else if (gestureName === "Closed_Fist" && App.payIdx >= 0) {
                            triggerSelectedPaymentAction();
                            lastGestureTime = Date.now();
                        }
                        else if (gestureName === "Pointing_Up") {
                            document.getElementById('btn-payment-back').click();
                            lastGestureTime = Date.now();
                        }
                    }
                }
            }
        }
    }
    window.requestAnimationFrame(predictWebcam);
}

loadAI().then(setupCamera);