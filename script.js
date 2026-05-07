import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC0nqk6NrifyUwziWC0RmYRwE0nqM4Cuzc",
    authDomain: "elele-a0008.firebaseapp.com",
    projectId: "elele-a0008",
    storageBucket: "elele-a0008.firebasestorage.app",
    messagingSenderId: "1035574351177",
    appId: "1:1035574351177:web:b94e7a4ab9c9aa8e5fb698"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let productsData = [];
let offersData = [];
let categoriesData = [{ id: "all", name: "الكل", img: "" }];
let bannersData = [];
let cart = [];
let selectedOffers = [];
let selectedOfferColors = {};
let currentCheckoutSource = '';
let currentUser = null;
let isGuest = false;
let deferredPrompt;

// التقاط حدث التثبيت من المتصفح
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

async function loadData() {
    try {
        const prodSnap = await getDocs(collection(db, "products"));
        productsData = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), img: doc.data().image_url }));
        const offSnap = await getDocs(collection(db, "offers"));
        offersData = offSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), img: doc.data().image_url }));
        const catSnap = await getDocs(collection(db, "categories"));
        const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if(cats.length > 0) categoriesData = [{ id: "all", name: "الكل", img: "" }, ...cats];
        const bannerSnap = await getDocs(collection(db, "banners"));
        bannersData = bannerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderBanners(); renderCategories(); renderProducts('all'); renderOffers();
    } catch(e) {}
}

window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
    checkInstallStatus();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user; closeModal('login-modal');
            localStorage.setItem('amazon_user', JSON.stringify({name: user.displayName, email: user.email}));
        } else if (!isGuest) {
            openModal('login-modal');
        }
    });
    loadData();
});

window.loginWithGoogle = async function() {
    try { await signInWithPopup(auth, provider); } catch(e) { showToast("فشل تسجيل الدخول", true); }
};

window.loginAsGuest = function() {
    isGuest = true; closeModal('login-modal'); showToast("دخلت كزائر، سجل لطلب المنتجات");
};

function checkAuth() {
    if (!currentUser && isGuest) { openModal('login-modal'); return false; }
    return true;
}

function checkInstallStatus() {
    if (!window.matchMedia('(display-mode: standalone)').matches && !localStorage.getItem('pwa_skipped')) {
        setTimeout(() => openModal('install-modal'), 5000);
    }
}

window.skipInstall = function() { localStorage.setItem('pwa_skipped', 'true'); closeModal('install-modal'); };

// دالة التثبيت الجديدة
window.installPWA = async function() {
    closeModal('install-modal');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
    } else {
        showToast("متصفحك لا يدعم التثبيت التلقائي، استخدم خيار 'إضافة للشاشة الرئيسية' من القائمة.", true);
    }
};

window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    element.classList.add('active');
};

window.toggleTheme = function() {
    document.body.classList.toggle('dark-theme');
    const icon = document.querySelector('#theme-toggle i');
    icon.className = document.body.classList.contains('dark-theme') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
};

function renderBanners() {
    const track = document.getElementById('banner-track');
    if(!track) return;
    track.innerHTML = bannersData.length ? bannersData.map(b => `<img src="${b.image_url}" alt="">`).join('') : '<img src="https://via.placeholder.com/800x300" alt="">';
    startBanner();
}

let bannerInterval;
function startBanner() {
    const track = document.getElementById('banner-track'); if(!track) return;
    const count = track.children.length; if(count <= 1) return;
    track.style.width = `${count * 100}%`;
    Array.from(track.children).forEach(img => img.style.width = `${100/count}%`);
    if(bannerInterval) clearInterval(bannerInterval);
    let i = 0; bannerInterval = setInterval(() => { i = (i + 1) % count; track.style.transform = `translateX(${i * (100/count)}%)`; }, 5000);
}

function renderCategories() {
    const wrapper = document.getElementById('categories-wrapper'); if(!wrapper) return;
    wrapper.innerHTML = categoriesData.map(cat => `
        <div class="cat-box ${cat.id==='all'?'all-cat active-cat':''}" style="${cat.img?`background-image:url(${cat.img})`:''}" onclick="filterCategory('${cat.id}', this)">
            ${cat.img?'<div class="cat-overlay"></div>':''}<span>${cat.name}</span>
        </div>
    `).join('');
}

window.filterCategory = function(id, el) {
    document.querySelectorAll('.cat-box').forEach(b => b.classList.remove('active-cat'));
    el.classList.add('active-cat'); renderProducts(id);
};

function renderProducts(cat) {
    const grid = document.getElementById('products-grid'); grid.innerHTML = '';
    const filtered = cat === 'all' ? productsData : productsData.filter(p => p.category === cat);
    filtered.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick="openProductModal('${p.id}')">
                <div class="card-img-wrapper"><img src="${p.img}" alt=""><button class="add-btn" onclick="event.stopPropagation(); addToCart('${p.id}')"><i class="fa-solid fa-plus"></i></button></div>
                <div class="card-info"><h4>${p.name}</h4><p class="price">${(p.price||0).toLocaleString()} د.ع</p></div>
            </div>`;
    });
}

window.openProductModal = function(id) {
    const p = productsData.find(x => x.id === id); if(!p) return;
    document.getElementById('modal-img').src = p.img;
    document.getElementById('modal-title').innerText = p.name;
    document.getElementById('modal-price').innerText = (p.price||0).toLocaleString() + ' د.ع';
    document.getElementById('modal-add-btn').onclick = () => { if(checkAuth()) { addToCart(p.id); closeModal('product-modal'); }};
    openModal('product-modal');
};

function addToCart(id) {
    if(!checkAuth()) return;
    const p = productsData.find(x => x.id === id);
    const exist = cart.find(x => x.id === id);
    if(exist) exist.qty++; else cart.push({...p, qty: 1});
    updateCartCount(); showToast('تمت الإضافة للسلة');
}

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.reduce((s, i) => s + i.qty, 0);
}

window.renderCart = function() {
    const container = document.getElementById('cart-items');
    container.innerHTML = cart.length ? cart.map(i => `
        <div class="cart-item-row">
            <img src="${i.img}"><div class="cart-item-info"><h4>${i.name}</h4><p>${(i.price*i.qty).toLocaleString()} د.ع</p></div>
            <div class="qty-btn-group"><button onclick="changeQty('${i.id}',1)">+</button><span>${i.qty}</span><button onclick="changeQty('${i.id}',-1)">-</button></div>
        </div>`).join('') : '<p style="text-align:center;padding:20px;">السلة فارغة</p>';
    document.getElementById('cart-total').innerText = cart.reduce((s,i)=>s+(i.price*i.qty),0).toLocaleString();
    document.getElementById('cart-checkout-btn').style.display = cart.length ? 'block' : 'none';
};

window.changeQty = function(id, d) {
    const i = cart.find(x => x.id === id); if(!i) return;
    i.qty += d; if(i.qty <= 0) cart = cart.filter(x => x.id !== id);
    updateCartCount(); renderCart();
};

function renderOffers() {
    const list = document.getElementById('offers-list'); list.innerHTML = '';
    offersData.forEach(offer => {
        const wrapper = document.createElement('div'); wrapper.className = 'offer-wrapper';
        wrapper.innerHTML = `
            <div class="offer-item" onclick="toggleOfferSelection('${offer.id}', this)">
                <div class="check-icon"><i class="fa-solid fa-check"></i></div>
                <div class="card-img-wrapper"><img src="${offer.img}"></div>
                <div class="card-info"><h4>${offer.name}</h4></div>
            </div>
            <div class="offer-colors" id="colors-${offer.id}" style="display:none">
                <p>اختر الألوان (يمكن اختيار أكثر من لون):</p>
                <div class="colors-list">${(offer.colors||[]).map(c => `<span class="color-badge" onclick="selectColor(event, this, '${offer.id}', '${c}')">${c}</span>`).join('')}</div>
            </div>`;
        list.appendChild(wrapper);
    });
}

window.selectColor = function(e, el, id, color) {
    e.stopPropagation();
    if(!selectedOfferColors[id]) selectedOfferColors[id] = [];
    if(selectedOfferColors[id].includes(color)) {
        selectedOfferColors[id] = selectedOfferColors[id].filter(c => c !== color);
        el.classList.remove('selected-color');
    } else {
        selectedOfferColors[id].push(color);
        el.classList.add('selected-color');
    }
};

window.toggleOfferSelection = function(id, el) {
    const colorsDiv = document.getElementById(`colors-${id}`);
    if(selectedOffers.includes(id)) {
        selectedOffers = selectedOffers.filter(x => x !== id);
        el.classList.remove('selected'); colorsDiv.style.display = 'none';
        delete selectedOfferColors[id];
    } else {
        if(selectedOffers.length >= 5) { showToast("اختر 5 فقط", true); return; }
        selectedOffers.push(id); el.classList.add('selected'); colorsDiv.style.display = 'block';
    }
    const btn = document.getElementById('confirm-offer-btn');
    const msg = document.getElementById('offer-msg');
    if(selectedOffers.length === 5) { btn.style.display = 'block'; msg.innerText = "اكتمل العدد!"; msg.style.color="var(--success)"; }
    else { btn.style.display = 'none'; msg.innerText = `اختر 5 فقط (تم تحديد ${selectedOffers.length})`; msg.style.color="var(--text-sec)"; }
};

window.openCheckout = function(source) {
    if(!checkAuth()) return;
    currentCheckoutSource = source; closeModal('cart-modal');
    const saved = JSON.parse(localStorage.getItem('amazon_phone_profile') || '{}');
    document.getElementById('cust-name').value = saved.name || (currentUser ? currentUser.displayName : '');
    document.getElementById('cust-phone').value = saved.phone || '';
    document.getElementById('cust-address').value = saved.address || '';
    openModal('checkout-modal');
};

window.submitOrder = async function() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;
    const pay = document.querySelector('input[name="payment"]:checked').value;
    if(!name || !phone || !address) { showToast("أكمل البيانات", true); return; }

    let itemsDetailed = []; let total = 0;
    if(currentCheckoutSource === 'cart') {
        cart.forEach(i => { itemsDetailed.push({name: i.name, qty: i.qty, color: ""}); total += i.price * i.qty; });
    } else {
        total = 15000;
        selectedOffers.forEach(id => {
            const o = offersData.find(x => x.id === id);
            itemsDetailed.push({name: o.name, qty: 1, color: selectedOfferColors[id] || []});
        });
    }

    const order = { customerName: name, customerPhone: phone, customerAddress: address, paymentMethod: pay==='cod'?'عند الاستلام':'ماستر كارد', itemsDetailed, totalAmount: total, status: 'pending', date: new Date().toISOString() };
    try {
        await addDoc(collection(db, "orders"), order);
        localStorage.setItem('amazon_phone_profile', JSON.stringify({name, phone, address}));
        closeModal('checkout-modal'); openModal('success-modal');
        if(currentCheckoutSource === 'cart') { cart = []; updateCartCount(); }
    } catch(e) { showToast("فشل الإرسال", true); }
};

window.openModal = function(id) { if(id==='cart-modal') renderCart(); const m = document.getElementById(id); m.style.display='flex'; setTimeout(()=>m.classList.add('show'),10); };
window.closeModal = function(id) { const m = document.getElementById(id); m.classList.remove('show'); setTimeout(()=>m.style.display='none',300); };
function showToast(t, err=false) { const toast = document.getElementById('toast'); toast.innerText=t; toast.style.background=err?'#e74c3c':'#2d3436'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3000); }
