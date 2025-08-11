// Load JSON
async function loadJSON(url, callback) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        callback(data);
    } catch (e) {
        console.error('JSON load error:', e);
    }
}

// Helper to format category names (camelCase -> Title Case with spaces)
function formatCategoryName(name) {
    // Insert space before capital letters and capitalize first letter
    const withSpaces = name.replace(/([A-Z])/g, ' $1');
    return withSpaces.replace(/\b\w/g, c => c.toUpperCase());
}

// Populate Menu
function populateMenu() {
    loadJSON('menu.json', (menuData) => {
        const menuContainer = document.getElementById('menu-categories');
        menuContainer.innerHTML = '';
        // Populate category select in menu editor
        const editorSelect = document.getElementById('editor-category');
        editorSelect.innerHTML = '';
        Object.keys(menuData).forEach(category => {
            // Create category section
            const section = document.createElement('div');
            section.className = 'menu-category';
            section.id = category;
            const title = document.createElement('h3');
            title.textContent = formatCategoryName(category);
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'menu-items';
            section.appendChild(title);
            section.appendChild(itemsContainer);
            menuContainer.appendChild(section);
            // Populate items
            menuData[category].forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'menu-item animate-hover';
                itemDiv.dataset.category = category;
                itemDiv.innerHTML = `
                    <img loading="lazy" src="${item.image}" alt="${item.name}">
                    <h4>${item.name}</h4>
                    <p>${item.desc}</p>
                    <span>$${item.price.toFixed(2)}</span>
                    ${item.videoId ? `<button class="play-video" data-video-id="${item.videoId}">Watch Prep</button>` : ''}
                    <button class="add-to-cart" data-name="${item.name}" data-price="${item.price}">Add to Cart</button>
                `;
                itemsContainer.appendChild(itemDiv);
            });
            // Add option to editor select
            const opt = document.createElement('option');
            opt.value = category;
            opt.textContent = formatCategoryName(category);
            editorSelect.appendChild(opt);
        });
        addCartListeners();
        addVideoListeners();
    });
}

// Populate Videos for all items with videoId
function populateVideos() {
    loadJSON('menu.json', (menuData) => {
        const gallery = document.querySelector('.video-gallery');
        gallery.innerHTML = '';
        Object.values(menuData).forEach(categoryItems => {
            categoryItems.forEach(item => {
                if (item.videoId) {
                    const div = document.createElement('div');
                    div.className = 'video-item';
                    div.dataset.videoId = item.videoId;
                    div.innerHTML = `
                        <div class="video-item-inner">
                            <div class="video-front">
                                <h4>${item.name}</h4>
                                <p>Watch the Prep!</p>
                            </div>
                            <div class="video-back">
                                <iframe loading="lazy" data-src="https://www.youtube.com/embed/${item.videoId}?si=example" title="${item.name} Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                            </div>
                        </div>
                    `;
                    gallery.appendChild(div);
                }
            });
        });
        lazyLoadVideos();
    });
}

// Lazy Load Videos
function lazyLoadVideos() {
    const iframes = document.querySelectorAll('iframe[data-src]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.src = entry.target.dataset.src;
                observer.unobserve(entry.target);
            }
        });
    });
    iframes.forEach(iframe => observer.observe(iframe));
}

// Video Modal
function addVideoListeners() {
    document.querySelectorAll('.play-video, .video-item').forEach(item => {
        item.addEventListener('click', () => {
            const videoId = item.dataset.videoId;
            document.getElementById('modal-video').innerHTML = `
                <iframe width="100%" height="400" src="https://www.youtube.com/embed/${item.videoId}?autoplay=1" title="Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            `;
            document.getElementById('video-modal').style.display = 'block';
        });
    });
    document.querySelector('.modal .close').addEventListener('click', () => {
        document.getElementById('video-modal').style.display = 'none';
        document.getElementById('modal-video').innerHTML = '';
    });
    window.addEventListener('click', (e) => {
        if (e.target == document.getElementById('video-modal')) {
            document.getElementById('video-modal').style.display = 'none';
            document.getElementById('modal-video').innerHTML = '';
        }
    });
}

// Load Content (Footer, Social, Policies)
function loadContent() {
    loadJSON('content.json', (content) => {
        // Only override hero text if the container does not opt‑out via data attribute
        const heroContainer = document.querySelector('.hero-content');
        if (heroContainer && !heroContainer.hasAttribute('data-custom-hero')) {
            const h1 = heroContainer.querySelector('h1');
            const pTag = heroContainer.querySelector('p');
            const ctaBtn = document.querySelector('.cta-button');
            if (h1) h1.textContent = content.hero.title;
            if (pTag) pTag.textContent = content.hero.subtitle;
            if (ctaBtn) ctaBtn.textContent = content.hero.cta;
        }
        // About section content (only if about section exists)
        const aboutSection = document.querySelector('.about-section');
        if (aboutSection) {
            const aboutP = aboutSection.querySelector('p');
            const aboutIframe = aboutSection.querySelector('iframe');
            if (aboutP) aboutP.textContent = content.about.text;
            if (aboutIframe) {
                aboutIframe.src = `https://www.youtube.com/embed/${content.about.videoId}?si=example`;
            }
        }
        // Populate social icons if footer exists
        const footerSocial = document.querySelector('.footer .social-icons');
        if (footerSocial) {
            footerSocial.innerHTML = '';
            content.footer.social.forEach(s => {
                footerSocial.innerHTML += `<a href="${s.url}" class="social-icon animate-hover"><img src="${s.icon}" alt="${s.platform}"></a>`;
            });
        }
        // Populate policy links
        const footerPolicies = document.querySelector('.footer .policies');
        if (footerPolicies) {
            footerPolicies.innerHTML = content.footer.policies.map(p => `<a href="${p.url}">${p.name}</a>`).join(' | ');
        }
    });
}

// Cart Logic
// Define a global cart array so it can be accessed from other functions (e.g., checkout)
window.cart = [];
function addCartListeners() {
    // Attach listeners to Add to Cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const item = {
                name: button.dataset.name,
                price: parseFloat(button.dataset.price)
            };
            window.cart.push(item);
            window.updateCart();
        });
    });
}

// Function to update the cart display and total
window.updateCart = function () {
    const cartItemsDiv = document.getElementById('cart-items');
    if (!cartItemsDiv) return;
    cartItemsDiv.innerHTML = window.cart.map(item => `<p>${item.name}: $${item.price.toFixed(2)}</p>`).join('');
    const total = window.cart.reduce((sum, item) => sum + item.price, 0);
    const totalSpan = document.getElementById('cart-total');
    if (totalSpan) totalSpan.textContent = total.toFixed(2);
};

// Taste Quiz
document.getElementById('taste-quiz-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const spice = document.querySelector('input[name="spice"]:checked')?.value;
    const type = document.querySelector('input[name="type"]:checked')?.value;
    let recommendation = 'Try our ';
    if (spice === 'mild') recommendation += 'Chicken Shingara ($6.99)';
    else if (spice === 'spicy') recommendation += 'Chotpoti ($9.99)';
    else recommendation += 'Beef Haleem ($9.99)';
    document.getElementById('quiz-result').textContent = recommendation;
    const confetti = new ConfettiGenerator({ target: 'body' });
    confetti.render();
    setTimeout(() => confetti.clear(), 3000);
});

// Menu Editor
document.getElementById('menu-editor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('editor-category').value;
    const newItem = {
        name: document.getElementById('editor-name').value,
        desc: document.getElementById('editor-desc').value,
        price: parseFloat(document.getElementById('editor-price').value),
        image: document.getElementById('editor-image').value,
        videoId: document.getElementById('editor-videoId').value
    };
    const updatedMenu = JSON.parse(localStorage.getItem('menu') || '{}');
    if (!updatedMenu[category]) updatedMenu[category] = [];
    updatedMenu[category].push(newItem);
    localStorage.setItem('menu', JSON.stringify(updatedMenu));
    document.getElementById('editor-preview').textContent = `Added ${newItem.name} to ${category}. Copy to menu.json!`;
    gsap.from('#editor-preview', { duration: 1, opacity: 0, y: 20 });
});

// GSAP Animations
gsap.from('.hero-content', { duration: 1, opacity: 0, y: 100 });
gsap.from('.menu-item', {
    scrollTrigger: { trigger: '#menu', start: 'top 80%' },
    duration: 1,
    y: 100,
    opacity: 0,
    stagger: 0.2
});
gsap.from('.video-item', {
    scrollTrigger: { trigger: '#videos', start: 'top 80%' },
    duration: 1,
    y: 100,
    opacity: 0,
    stagger: 0.2
});
gsap.from('.quiz-section', { duration: 1, y: 100, opacity: 0, scrollTrigger: { trigger: '#taste-quiz', start: 'top 80%' } });

// Animate search bar appearance
gsap.from('#menu-search', { duration: 1, opacity: 0, y: -20, delay: 0.5 });

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Conditionally load particles background if a hero element exists
    if (document.getElementById('hero')) {
        particlesJS.load('hero', 'particles.json', () => console.log('Particles loaded'));
    }
    // Load dynamic content (hero, about text, footer) only if relevant elements are on the page
    if (document.querySelector('.hero-content') || document.querySelector('.footer')) {
        loadContent();
    }
    // Populate menu only on pages with a menu container
    if (document.getElementById('menu-categories')) {
        populateMenu();
    }
    // Populate videos only on pages with a video gallery
    if (document.querySelector('.video-gallery')) {
        populateVideos();
    }
    // Search bar functionality
    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            filterMenu(searchInput.value);
        });
    }

    // Interactive Temple hotspots
    const kitchenHotspot = document.getElementById('hotspot-kitchen');
    const cultureHotspot = document.getElementById('hotspot-culture');
    const deliveryHotspot = document.getElementById('hotspot-delivery');
    const cateringHotspot = document.getElementById('hotspot-catering');
    const modelModal = document.getElementById('model-modal');
    const modelFrame = document.getElementById('model-frame');
    const closeModel = document.querySelector('.close-model');

    if (kitchenHotspot) {
        kitchenHotspot.addEventListener('click', () => {
            // Load the 3D model into iframe using the San Marco Piazza temple model from Sketchfab
            modelFrame.src = 'https://sketchfab.com/models/907e215f955f4f9a8c104d5fab8b9a9a/embed';
            modelModal.style.display = 'block';
        });
    }
    if (closeModel) {
        closeModel.addEventListener('click', () => {
            modelModal.style.display = 'none';
            modelFrame.src = '';
        });
    }
    // Hide modal if clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === modelModal) {
            modelModal.style.display = 'none';
            modelFrame.src = '';
        }
    });

    // Sidebar toggle functionality
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // File upload for menu editor to update image path with DataURL and preview
    const imageFileInput = document.getElementById('editor-image-file');
    if (imageFileInput) {
        imageFileInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataURL = e.target.result;
                    // Set the image path input to the DataURL so it will be saved in localStorage
                    const imgPathInput = document.getElementById('editor-image');
                    if (imgPathInput) imgPathInput.value = dataURL;
                    // Show preview
                    const preview = document.getElementById('editor-preview');
                    if (preview) {
                        preview.innerHTML = `<img src="${dataURL}" alt="Preview" style="width:100px;height:100px;border-radius:5px;">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Checkout modal functionality
    const checkoutBtn = document.getElementById('checkout');
    const checkoutModal = document.getElementById('checkout-modal');
    const orderSummaryDiv = document.getElementById('order-summary');
    const checkoutClose = document.querySelector('.checkout-close');
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutBtn && checkoutModal && orderSummaryDiv) {
        checkoutBtn.addEventListener('click', () => {
            // Build order summary from global cart
            let html = '';
            window.cart.forEach(item => {
                html += `<p>${item.name}: $${item.price.toFixed(2)}</p>`;
            });
            html += `<p><strong>Total: $${window.cart.reduce((sum, i) => sum + i.price, 0).toFixed(2)}</strong></p>`;
            orderSummaryDiv.innerHTML = html;
            checkoutModal.style.display = 'block';
        });
    }
    if (checkoutClose && checkoutModal) {
        checkoutClose.addEventListener('click', () => {
            checkoutModal.style.display = 'none';
        });
    }
    // Close checkout modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === checkoutModal) {
            checkoutModal.style.display = 'none';
        }
    });
    // Handle checkout form submission (demo: show alert and clear cart)
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Calculate points earned: 10 pts per $1 spent
            const totalSpent = window.cart.reduce((sum, item) => sum + item.price, 0);
            const earned = Math.round(totalSpent * 10);
            window.loyaltyPoints += earned;
            localStorage.setItem('loyaltyPoints', window.loyaltyPoints);
            const loyaltySpan = document.getElementById('loyalty-points');
            if (loyaltySpan) loyaltySpan.textContent = window.loyaltyPoints;
            alert('Thank you! Your order has been submitted. You earned ' + earned + ' points.');
            // Clear cart and update display
            window.cart = [];
            window.updateCart();
            checkoutModal.style.display = 'none';
        });
    }

    // Assistant chat functionality
    const assistantInput = document.getElementById('assistant-input');
    const assistantMessages = document.getElementById('assistant-messages');
    function appendMessage(sender, text) {
        const div = document.createElement('div');
        div.className = 'assistant-message ' + sender;
        div.textContent = text;
        assistantMessages.appendChild(div);
        assistantMessages.scrollTop = assistantMessages.scrollHeight;
    }
    function handleCommand(command) {
        const lower = command.toLowerCase().trim();
        // Show help if user asks
        if (lower === 'help' || lower === 'commands') {
            appendMessage('bot', 'Commands: menu, search [term], add [item], cart, checkout, booking, story, testimonials, faq, newsletter, promotions, loyalty, location, temple, points, redeem [reward].');
            return;
        }
        // Scroll functions
        const scrollToSection = (id) => {
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                appendMessage('bot', `Navigating to ${id} section.`);
            }
        };
        if (lower === 'menu') {
            scrollToSection('menu');
        } else if (lower.startsWith('search ')) {
            const term = lower.replace('search ', '').trim();
            filterMenu(term);
            appendMessage('bot', `Searching for “${term}”.`);
        } else if (lower.startsWith('add ')) {
            const itemName = lower.replace('add ', '').trim();
            // Try to find the button with matching name
            const buttons = document.querySelectorAll('.add-to-cart');
            let added = false;
            buttons.forEach(btn => {
                if (btn.dataset.name.toLowerCase() === itemName) {
                    btn.click();
                    added = true;
                }
            });
            if (added) {
                appendMessage('bot', `${itemName} added to cart.`);
            } else {
                appendMessage('bot', `Item “${itemName}” not found.`);
            }
        } else if (lower === 'cart') {
            scrollToSection('cart');
        } else if (lower === 'checkout') {
            if (window.cart.length === 0) {
                appendMessage('bot', 'Your cart is empty.');
            } else {
                // open checkout modal
                document.getElementById('checkout').click();
                appendMessage('bot', 'Opening checkout…');
            }
        } else if (lower === 'booking' || lower === 'book') {
            scrollToSection('booking');
        } else if (lower === 'points') {
            appendMessage('bot', 'You have ' + window.loyaltyPoints + ' points.');
        } else if (lower.startsWith('redeem ')) {
            const rewardName = lower.replace('redeem ', '').trim();
            // Attempt to find matching reward
            const opt = redemptionOptions.find(o => o.name.toLowerCase() === rewardName);
            if (opt) {
                if (window.loyaltyPoints >= opt.cost) {
                    window.loyaltyPoints -= opt.cost;
                    localStorage.setItem('loyaltyPoints', window.loyaltyPoints);
                    const loyaltySpan = document.getElementById('loyalty-points');
                    if (loyaltySpan) loyaltySpan.textContent = window.loyaltyPoints;
                    window.cart.push({ name: opt.name + ' (Reward)', price: 0 });
                    window.updateCart();
                    appendMessage('bot', `Redeemed ${opt.name}! It has been added to your cart.`);
                } else {
                    appendMessage('bot', 'Not enough points to redeem this reward.');
                }
            } else {
                appendMessage('bot', 'Reward not found.');
            }
        } else if (lower === 'story') {
            scrollToSection('story');
        } else if (lower === 'testimonials') {
            scrollToSection('testimonials');
        } else if (lower === 'faq') {
            scrollToSection('faq');
        } else if (lower === 'newsletter') {
            scrollToSection('newsletter');
        } else if (lower === 'location' || lower === 'find us') {
            scrollToSection('location');
        } else if (lower === 'temple') {
            scrollToSection('temple');
        } else {
            appendMessage('bot', "I'm sorry, I didn't understand. Type 'help' for commands.");
        }
    }
    if (assistantInput) {
        assistantInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = assistantInput.value;
                if (text.trim() !== '') {
                    appendMessage('user', text);
                    handleCommand(text);
                    assistantInput.value = '';
                }
            }
        });
    }

    // FAQ toggle functionality
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const answer = btn.nextElementSibling;
            if (answer.style.display === 'block') {
                answer.style.display = 'none';
            } else {
                answer.style.display = 'block';
            }
        });
    });

    // Newsletter subscription form handler
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input[name="newsletter-email"]').value;
            if (email) {
                alert('Thanks for subscribing, ' + email + '!');
                newsletterForm.reset();
            }
        });
    }

    // Register service worker for PWA support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(
                reg => console.log('Service worker registered', reg),
                err => console.warn('Service worker registration failed', err)
            );
        });
    }

    // Loyalty program: load points from localStorage
    window.loyaltyPoints = parseInt(localStorage.getItem('loyaltyPoints') || '0');
    const loyaltyPointsSpan = document.getElementById('loyalty-points');
    if (loyaltyPointsSpan) {
        loyaltyPointsSpan.textContent = window.loyaltyPoints;
    }
    // Redemption offers
    const redeemBtn = document.getElementById('redeem-points');
    const redeemOffersDiv = document.getElementById('redeem-offers');
    const redemptionOptions = [
        { name: 'Vegetable Samosa', cost: 500 },
        { name: 'Mango Shake', cost: 300 }
    ];
    function displayOffers() {
        redeemOffersDiv.innerHTML = '<h4>Available Rewards:</h4>';
        redemptionOptions.forEach(opt => {
            const btn = document.createElement('button');
            btn.textContent = `${opt.name} - ${opt.cost} pts`;
            btn.style.margin = '5px';
            btn.addEventListener('click', () => {
                if (window.loyaltyPoints >= opt.cost) {
                    window.loyaltyPoints -= opt.cost;
                    localStorage.setItem('loyaltyPoints', window.loyaltyPoints);
                    loyaltyPointsSpan.textContent = window.loyaltyPoints;
                    // Add reward item to cart
                    window.cart.push({ name: opt.name + ' (Reward)', price: 0 });
                    window.updateCart();
                    alert(`You have redeemed a ${opt.name}! It has been added to your cart.`);
                } else {
                    alert('Not enough points to redeem this reward.');
                }
            });
            redeemOffersDiv.appendChild(btn);
        });
    }
    if (redeemBtn) {
        redeemBtn.addEventListener('click', () => {
            displayOffers();
        });
    }

    // Assistant toggle: show or hide the chat widget.  Hide it by default to avoid obscuring page content.
    const assistantWidget = document.getElementById('assistant');
    const assistantToggle = document.getElementById('assistant-toggle');
    if (assistantWidget) {
        // Ensure the chat starts hidden, even if inline styles or previous sessions altered it
        assistantWidget.style.display = 'none';
    }
    if (assistantToggle && assistantWidget) {
        assistantToggle.addEventListener('click', () => {
            // Toggle between hidden and flex layout
            if (assistantWidget.style.display === 'flex') {
                assistantWidget.style.display = 'none';
            } else {
                assistantWidget.style.display = 'flex';
            }
        });
    }
});

// Filter menu items based on search query
function filterMenu(query) {
    const items = document.querySelectorAll('.menu-item');
    const lower = query.trim().toLowerCase();
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(lower)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

