/* ==========================================================================
   STATE MANAGEMENT
   ========================================================================== */
let cart = [];
let currentProduct = null;
let activeCategory = "all";

/* ==========================================================================
   DOM LOADED INITIALIZATION
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    // 1. SCROLL TRIGGER ANIMATION (IntersectionObserver)
    const items = document.querySelectorAll(".fade");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
            }
        });
    }, {
        threshold: 0.12
    });
    items.forEach(el => observer.observe(el));

    // 2. DYNAMIC CURSOR GLOW
    const glow = document.createElement("div");
    glow.classList.add("cursor-glow");
    document.body.appendChild(glow);

    document.addEventListener("mousemove", (e) => {
        glow.style.left = e.clientX + "px";
        glow.style.top = e.clientY + "px";
    });

    // 3. MOUSE TILT EFFECT (Hero Glass Panel)
    const glass = document.querySelector(".glass");
    if (glass) {
        document.addEventListener("mousemove", (e) => {
            const x = (window.innerWidth / 2 - e.clientX) / 30;
            const y = (window.innerHeight / 2 - e.clientY) / 30;
            glass.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
        });
    }

    // 4. SMOOTH SCROLL
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            const target = document.querySelector(this.getAttribute("href"));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    });

    // 5. ESCAPE KEY OBSERVER (Close modals/drawers)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const popup = document.getElementById("popup");
            if (popup && window.getComputedStyle(popup).display !== "none") {
                closePopup();
            }
            const cartBox = document.getElementById("cart");
            if (cartBox && cartBox.classList.contains("active")) {
                toggleCart();
            }
        }
    });

    // 6. LEGAL PAGE SIDEBAR SCROLL HIGHLIGHTER
    const legalSections = document.querySelectorAll(".legal-section");
    const legalLinks = document.querySelectorAll(".legal-menu a");
    if (legalSections.length > 0 && legalLinks.length > 0) {
        const legalObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute("id");
                    legalLinks.forEach(link => {
                        if (link.getAttribute("href") === `#${id}`) {
                            link.classList.add("active");
                        } else {
                            link.classList.remove("active");
                        }
                    });
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: "-10% 0px -50% 0px"
        });
        legalSections.forEach(sec => legalObserver.observe(sec));
    }

    // 7. INITIALIZE CART
    loadCart();
});

/* ==========================================================================
   MOBILE MENU TOGGLE
   ========================================================================== */
function toggleMenu() {
    const toggleBtn = document.querySelector(".menu-toggle");
    if (toggleBtn && window.getComputedStyle(toggleBtn).display !== "none") {
        const menu = document.getElementById("menu");
        if (menu) menu.classList.toggle("active");
        toggleBtn.classList.toggle("active");
    }
}

/* ==========================================================================
   PRODUCT POPUP / DETAIL MODAL
   ========================================================================== */
function openPopup(name, img, price, details) {
    const popup = document.getElementById("popup");
    const title = document.getElementById("popup-title");
    const image = document.getElementById("popup-img");
    const priceEl = document.getElementById("popup-price");
    const qtyInput = document.getElementById("popup-qty");
    const detailList = document.getElementById("popup-details");

    if (popup) popup.style.display = "flex";
    if (title) title.innerText = name;
    if (image) {
        image.removeAttribute("src"); // Clear src to force mobile browser redraw
        image.src = img;
        image.alt = name;
    }
    if (priceEl) priceEl.innerText = "Price: Rs. " + price;
    if (qtyInput) qtyInput.value = 1;

    if (detailList) {
        detailList.innerHTML = "";
        details.split("|").forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.trim();
            detailList.appendChild(li);
        });
    }

    currentProduct = { name, img, price };
    
    // ANALYTICS TRIGGER
    trackAnalyticsEvent("E-commerce", "View Details", name);
}

function closePopup() {
    const popup = document.getElementById("popup");
    if (popup) popup.style.display = "none";
    currentProduct = null;
}

function adjustPopupQty(delta) {
    const qtyInput = document.getElementById("popup-qty");
    if (qtyInput) {
        let val = parseInt(qtyInput.value) || 1;
        val += delta;
        if (val < 1) val = 1;
        qtyInput.value = val;
    }
}

function addPopupProductToCart() {
    if (!currentProduct) return;
    const qtyInput = document.getElementById("popup-qty");
    const quantity = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
    
    addToCart(currentProduct.name, currentProduct.price, currentProduct.img, quantity);
    closePopup();
}

/* ==========================================================================
   SHOPPING CART LOGIC & PERSISTENCE
   ========================================================================== */
function loadCart() {
    const savedCart = localStorage.getItem("dailycare_cart");
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            updateCart();
        } catch (e) {
            cart = [];
            updateCart();
        }
    } else {
        updateCart();
    }
}

function saveCart() {
    localStorage.setItem("dailycare_cart", JSON.stringify(cart));
}

function addToCart(name, price, img, quantity = 1) {
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.qty += quantity;
    } else {
        cart.push({ name, price, img, qty: quantity });
    }
    updateCart();
    saveCart();
    showToast(`${name} (x${quantity}) added to cart!`);

    // ANALYTICS TRIGGER
    trackAnalyticsEvent("E-commerce", "Add to Cart", `${name} (Qty: ${quantity})`);
}

function updateQuantity(name, delta) {
    const item = cart.find(item => item.name === name);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            removeFromCart(name);
        } else {
            updateCart();
            saveCart();
        }
    }
}

function removeFromCart(name) {
    cart = cart.filter(item => item.name !== name);
    updateCart();
    saveCart();
    showToast(`${name} removed from cart.`);

    // ANALYTICS TRIGGER
    trackAnalyticsEvent("E-commerce", "Remove from Cart", name);
}

function updateCart() {
    const itemsContainer = document.getElementById("cart-items");
    const totalEl = document.getElementById("total");
    const countEl = document.getElementById("cart-count");
    const whatsappLink = document.getElementById("whatsapp");

    if (!itemsContainer) return;

    let total = 0;
    let count = 0;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
                <p style="margin-bottom: 15px; font-weight: 500;">Your basket is empty.</p>
                <button onclick="toggleCart()" class="btn btn-secondary" style="font-size: 13px; padding: 8px 18px;">Start Shopping</button>
            </div>
        `;
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            total += itemTotal;
            count += item.qty;

            itemsContainer.innerHTML += `
                <div class="cart-item">
                    <img src="${item.img}" class="cart-item-img" alt="${item.name}">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <div class="item-price">Rs. ${item.price}</div>
                        <div class="cart-item-qty-actions">
                            <button onclick="updateQuantity('${item.name}', -1)" aria-label="Decrease quantity">-</button>
                            <span>${item.qty}</span>
                            <button onclick="updateQuantity('${item.name}', 1)" aria-label="Increase quantity">+</button>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="remove-item-btn" onclick="removeFromCart('${item.name}')" aria-label="Remove ${item.name} from cart">Remove</button>
                    </div>
                </div>
            `;
        });
    }

    if (totalEl) totalEl.innerText = total;
    if (countEl) countEl.innerText = count;

    // Create formatted WhatsApp checkout message
    let messageText = "*DailyCare Order Request*%0A%0A";
    if (cart.length > 0) {
        cart.forEach((item, index) => {
            messageText += `${index + 1}. *${item.name}* (Qty: ${item.qty}) - Rs. ${item.price * item.qty}%0A`;
        });
        messageText += `%0A*Grand Total: Rs. ${total}*%0A%0APlease confirm my order request!`;
    } else {
        messageText += "No items selected.";
    }

    if (whatsappLink) {
        whatsappLink.href = `https://wa.me/9779801915577?text=${messageText}`;
        whatsappLink.onclick = () => {
            trackAnalyticsEvent("E-commerce", "WhatsApp Checkout Submit", `Grand Total: Rs. ${total}`);
        };
    }
}

function toggleCart() {
    const cartBox = document.getElementById("cart");
    const overlay = document.getElementById("cart-overlay");
    if (cartBox) cartBox.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
}

/* ==========================================================================
   TOAST NOTIFICATION DISPATCHER
   ========================================================================== */
function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/* ==========================================================================
   PRODUCT CATEGORY FILTER & LIVE SEARCH
   ========================================================================== */
function filterCategory(category) {
    activeCategory = category;
    const cards = document.querySelectorAll("#product-grid .card");
    const buttons = document.querySelectorAll(".category-filters .filter-btn");

    buttons.forEach(btn => {
        const btnAttr = btn.getAttribute("onclick");
        if (btnAttr && btnAttr.includes(`'${category}'`)) {
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
        } else {
            btn.classList.remove("active");
            btn.setAttribute("aria-selected", "false");
        }
    });

    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.value = "";

    cards.forEach(card => {
        const cardCategory = card.getAttribute("data-category");
        if (category === "all" || cardCategory === category) {
            card.style.display = "flex";
            card.classList.add("show");
        } else {
            card.style.display = "none";
        }
    });

    // ANALYTICS TRIGGER
    trackAnalyticsEvent("Engagement", "Filter Products", category);
}

function searchProducts() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase().trim();
    const cards = document.querySelectorAll("#product-grid .card");

    cards.forEach(card => {
        const name = card.getAttribute("data-name");
        const cardCategory = card.getAttribute("data-category");
        
        const matchesQuery = name.includes(query);
        const matchesCategory = activeCategory === "all" || cardCategory === activeCategory;

        if (matchesQuery && matchesCategory) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

/* ==========================================================================
   CONTACT FORM SUBMISSION WITH SPAM & VALIDATION
   ========================================================================== */
function handleContactSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById("contact-form");
    if (!form) return;

    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const subjectInput = document.getElementById("contact-subject");
    const messageInput = document.getElementById("contact-message");
    const honeyInput = document.getElementById("dailycare-honey");

    // Clear previous error messages
    document.querySelectorAll(".error-msg").forEach(el => el.innerText = "");
    if (nameInput) nameInput.style.borderColor = "";
    if (emailInput) emailInput.style.borderColor = "";
    if (messageInput) messageInput.style.borderColor = "";

    // 1. HONEYPOT BOT CHECK
    if (honeyInput && honeyInput.value.trim() !== "") {
        // Silently swallow submission: show a mock toast success so the bot registers it and moves on.
        showToast("Message sent successfully!");
        form.reset();
        return;
    }

    // 2. VALIDATION
    let isValid = true;

    // Name check
    if (!nameInput || nameInput.value.trim() === "") {
        const err = document.getElementById("error-name");
        if (err) err.innerText = "Full Name is required.";
        if (nameInput) nameInput.style.borderColor = "#ff8a80";
        isValid = false;
    }

    // Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput || emailInput.value.trim() === "") {
        const err = document.getElementById("error-email");
        if (err) err.innerText = "Email Address is required.";
        if (emailInput) emailInput.style.borderColor = "#ff8a80";
        isValid = false;
    } else if (!emailRegex.test(emailInput.value.trim())) {
        const err = document.getElementById("error-email");
        if (err) err.innerText = "Please enter a valid email address.";
        if (emailInput) emailInput.style.borderColor = "#ff8a80";
        isValid = false;
    }

    // Message check
    if (!messageInput || messageInput.value.trim() === "") {
        const err = document.getElementById("error-message");
        if (err) err.innerText = "Message content is required.";
        if (messageInput) messageInput.style.borderColor = "#ff8a80";
        isValid = false;
    }

    if (!isValid) {
        showToast("Please fix the validation errors.");
        return;
    }

    // 3. MOCK SECURE SUBMISSION (Client-side simulation)
    const submitBtn = document.getElementById("contact-submit-btn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Sending...";
    }

    showToast("Sending your message...");

    setTimeout(() => {
        showToast(`Thank you, ${nameInput.value.trim()}! Message sent.`);
        
        // ANALYTICS TRIGGER
        const subjectVal = subjectInput ? subjectInput.value.trim() : "None";
        trackAnalyticsEvent("Engagement", "Contact Form Submit", `Subject: ${subjectVal}`);

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = "Send Message";
        }
        form.reset();
    }, 1500);
}

/* ==========================================================================
   ANALYTICS EVENT TRACKING HELPER
   ========================================================================== */
function trackAnalyticsEvent(category, action, label = "") {
    // 1. Google Analytics Trigger
    if (typeof gtag === "function") {
        gtag("event", action, {
            "event_category": category,
            "event_label": label
        });
    }

    // 2. Clarity Trigger
    if (typeof clarity === "function") {
        clarity("event", `${category} - ${action}: ${label}`);
    }

    // Local debug logger (will display in development environment console logs)
    console.log(`[Analytics Event Logged] Category: ${category} | Action: ${action} | Label: ${label}`);
}
