/* ============================================================
   KIOSK VISION AI — App Logic (Landing + State Machine)
   ============================================================ */

// ── State ──
const AppState = {
  current: 'landing',
  mode: null, // 'visually_impaired' | 'hearing_impaired' | 'beginner'
};

// ── Navbar scroll effect ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

// ── Scroll-triggered animations ──
const scrollObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        scrollObserver.unobserve(entry.target); // fire once
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.animate-on-scroll').forEach((el) => {
  scrollObserver.observe(el);
});

// ── Kiosk preview interactivity ──
const kioskItems = document.querySelectorAll('.kiosk-item');
const aiMessage = document.querySelector('.kiosk-ai-message');

const aiMessages = {
  pizza:  '"Great choice! Margherita Pizza is selected. Tap <strong>Add to Cart</strong> to continue, or keep browsing."',
  salad:  '"Caesar Salad added to your view. It pairs great with the pasta. Tap <strong>Add to Cart</strong> when ready."',
  water:  '"Sparkling Water — a refreshing choice! Tap <strong>Add to Cart</strong> to add it to your order."',
};

kioskItems.forEach((item, index) => {
  item.addEventListener('click', () => {
    kioskItems.forEach((i) => i.classList.remove('kiosk-item-selected'));
    item.classList.add('kiosk-item-selected');

    const check = item.querySelector('.kiosk-item-check');
    if (!check) {
      const newCheck = document.createElement('div');
      newCheck.className = 'kiosk-item-check';
      newCheck.textContent = '✓';
      newCheck.setAttribute('aria-hidden', 'true');
      item.appendChild(newCheck);

      // Remove checks from others
      kioskItems.forEach((i, j) => {
        if (j !== index) {
          const c = i.querySelector('.kiosk-item-check');
          if (c) c.remove();
        }
      });
    }

    const key = ['pizza', 'salad', 'water'][index];
    if (aiMessage && aiMessages[key]) {
      aiMessage.innerHTML = aiMessages[key];
      aiMessage.style.animation = 'none';
      requestAnimationFrame(() => {
        aiMessage.style.animation = 'ai-msg-in 0.4s cubic-bezier(0.2, 0.8, 0.4, 1) forwards';
      });
    }
  });
});

// Add animation keyframe dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes ai-msg-in {
    from { opacity: 0.4; transform: translateY(6px); }
    to   { opacity: 1;   transform: translateY(0);    }
  }
`;
document.head.appendChild(style);

// ── CTA smooth navigation ──
document.querySelectorAll('[href="demo.html"]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    document.body.classList.add('page-leave');
    setTimeout(() => {
      window.location.href = 'demo.html';
    }, 450);
  });
});

// ── Smooth section reveal on page load + scroll reset ──
window.addEventListener('DOMContentLoaded', () => {
  // Ensure page loads exactly at the top
  window.scrollTo(0, 0);
  // History API fallback to prevent browser scroll memory
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
});
