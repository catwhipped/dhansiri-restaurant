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

// Populate Menu
function populateMenu() {
    loadJSON('menu.json', (menuData) => {
        Object.keys(menuData).forEach(category => {
            const container = document.querySelector(`#${category} .menu-items`);
            if (container) {
                menuData[category].forEach(item => {
                    container.innerHTML += `
                        <div class="menu-item animate-hover" data-category="${category}">
                            <img loading="lazy" src="${item.image}" alt="${item.name}">
                            <h4>${item.name}</h4>
                            <p>${item.desc}</p>
                            <span>$${item.price.toFixed(2)}</span>
                            ${item.videoId ? `<button class="play-video" data-video-id="${item.videoId}">Watch Prep</button>` : ''}
                            <button class="add-to-cart" data-name="${item.name}" data-price="${item.price}">Add to Cart</button>
                        </div>
                    `;
                });
            }
        });
        addCartListeners();
        addVideoListeners();
    });
}

// Populate Videos (Appetizers Only)
function populateVideos() {
    loadJSON('menu.json', (menuData) => {
        const gallery = document.querySelector('.video-gallery');
        menuData.appetizers.forEach(item => {
            if (item.videoId) {
                const videoHTML = `
                    <div class="video-item" data-video-id="${item.videoId}">
                        <div class="video-item-inner">
                            <div class="video-front">
                                <h4>${item.name}</h4>
                                <p>Watch the Prep!</p>
                            </div>
                            <div class="video-back">
                                <iframe loading="lazy" data-src="https://www.youtube.com/embed/${item.videoId}?si=example" title="${item.name} Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                            </div>
                        </div>
                    </div>
                `;
                gallery.innerHTML += videoHTML;
            }
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
        document.querySelector('.hero-content h1').textContent = content.hero.title;
        document.querySelector('.hero-content p').textContent = content.hero.subtitle;
        document.querySelector('.cta-button').textContent = content.hero.cta;
        document.querySelector('.about-section p').textContent = content.about.text;
        document.querySelector('.about-section iframe').src = `https://www.youtube.com/embed/${content.about.videoId}?si=example`;
        const footer = document.querySelector('.footer .social-icons');
        content.footer.social.forEach(s => {
            footer.innerHTML += `<a href="${s.url}" class="social-icon animate-hover"><img src="${s.icon}" alt="${s.platform}"></a>`;
        });
        document.querySelector('.footer .policies').innerHTML = content.footer.policies.map(p => `<a href="${p.url}">${p.name}</a>`).join(' | ');
    });
}

// Cart Logic
function addCartListeners() {
    let cart = [];
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', () => {
            const item = {
                name: button.dataset.name,
                price: parseFloat(button.dataset.price)
            };
            cart.push(item);
            updateCart();
        });
    });
    function updateCart() {
        const cartItems = document.getElementById('cart-items');
        cartItems.innerHTML = cart.map(item => `<p>${item.name}: $${item.price.toFixed(2)}</p>`).join('');
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        document.getElementById('cart-total').textContent = total.toFixed(2);
    }
}

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

// Init
document.addEventListener('DOMContentLoaded', () => {
    particlesJS.load('hero', 'particles.json', () => console.log('Particles loaded'));
    loadContent();
    populateMenu();
    populateVideos();
});

