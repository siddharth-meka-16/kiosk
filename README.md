# 🚀 Kiosk Vision AI

> **AI-powered accessibility layer for smart kiosks**
> Transforming self-service systems into inclusive, guided, and intelligent experiences.

---

## 🌍 Problem

Modern self-service kiosks (restaurants, retail, pharmacies) are:

* ❌ Difficult for visually impaired users
* ❌ Confusing for first-time or elderly users
* ❌ Not optimized for accessibility
* ❌ Complex during ordering & payment

---

## 💡 Solution

**Kiosk Vision AI** introduces an intelligent assistant layer that:

* Adapts UI based on user needs
* Guides users step-by-step using AI
* Supports voice interaction
* Simplifies ordering and payments

---

## ✨ Key Features

### 🧠 AI Assistant (Gemini Powered)

* Context-aware responses (menu, cart, payment)
* Voice input + voice output
* Real-time guidance for users

 
* ### ✋ Gesture-Based Interaction (Experimental)

- Uses Google APIs for gesture detection
- Enables touchless interaction with kiosk
- Designed for users with limited mobility
- Enhances accessibility beyond voice and UI

### ♿ Accessibility Modes

* 👁️ Visually Impaired
* 👂 Hearing Impaired
* 🧓 Beginner Mode

Each mode dynamically adjusts UI and instructions.

### 🛒 Smart Ordering Flow

* Simple menu navigation
* Large accessible buttons
* Minimal cognitive load

### 💳 Payment System

* Razorpay (test mode integration)
* QR Code payment (scan & confirm)
* Cash payment guidance

### 🗄️ Backend (Supabase)

* Stores orders in real-time
* Tracks payment method & mode
* Displays recent orders

---

## 🏗️ Architecture

Frontend-driven architecture with minimal backend complexity:

```
User Interaction
      ↓
AI Assistant (Gemini API)
      ↓
Frontend State Management (JS)
      ↓
Supabase (Database)
```

---

## 🧩 Project Structure

```
/project-root
│
├── index.html          # Main entry
├── style.css           # Global styles
├── script.js           # Core logic + state
│
├── /components
│   ├── landing.js
│   ├── menu.js
│   ├── cart.js
│   ├── payment.js
│   └── assistant.js
│
├── /utils
│   ├── ai.js           # Gemini API logic
│   ├── supabase.js     # DB integration
│   └── state.js        # App state management
│
├── .env                # API keys (not committed)
└── README.md
```

---

## ⚙️ Tech Stack

### 🎨 Frontend

* HTML
* CSS (Glassmorphism + modern UI)
* JavaScript (State-driven UI)

### 🤖 AI

* Gemini API (Google AI)

### 🎤 Voice

* Web Speech API (SpeechRecognition)
* SpeechSynthesis API

### 🗄️ Backend

* Supabase (PostgreSQL + API)

### 💳 Payments

* Razorpay (Test Mode)
* QR Code simulation

---


## 🚀 Getting Started

1. Clone the repo

```
git clone https://github.com/siddharth-meka-16/kiosk.git
```

2. Add `.env` file

3. Open project

```
open index.html
```

4. Run locally (or use live server)

---

## 🎬 Demo Flow

1. Select accessibility mode
2. Interact with menu
3. Use AI assistant (voice/text)
4. Complete order
5. Choose payment method
6. View success + stored order

---

## 🎯 Why This Matters

> This is not just a kiosk UI.

It is an **accessibility layer** that can be applied to:

* Restaurants
* Retail systems
* Healthcare kiosks

---

## 🔮 Future Improvements

* Real computer vision integration
* Multi-language voice support
* Gesture-based navigation
* Real payment verification

 ## 🔮 Future Improvements

- Advanced gesture recognition (currently basic implementation using Google APIs)
- Real computer vision-based screen understanding
- Multi-language voice support
- Real payment verification

---

## 👥 Team

* Built for Hackathon 🚀
* Focus: AI + Accessibility + UX

---

## 🏁 Final Note

> "This isn’t a kiosk.
> It’s an accessibility layer for every kiosk."

---
