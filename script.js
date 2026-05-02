import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// --- البيانات من فايربيس ---
let productsData = [];
let offersData = [];

let categoriesData = [
    { id: "all", name: "الكل", img: "" }
];
let bannersData = [];

async function loadData() {
    try {
        const prodSnap = await getDocs(collection(db, "products"));
        productsData = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), img: doc.data().image_url }));

        const offSnap = await getDocs(collection(db, "offers"));
        offersData = offSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), img: doc.data().image_url }));
        
        try {
            const catSnap = await getDocs(collection(db, "categories"));
            const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if(cats.length > 0) {
                categoriesData = [{ id: "all", name: "الكل", img: "" }, ...cats];
            }
        } catch(e) {}
        
        try {
            const bannerSnap = await getDocs(collection(db, "banners"));
            bannersData = bannerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderBanners();
        } catch(e) {}

        renderCategories();
        renderProducts('all');
        renderOffers();
    } catch(e) {
        console.error(e);
    }
}


let cart = [];
let selectedOffers = [];
let selectedOfferColors = {};
let currentCheckoutSource = ''; // لمعرفة مصدر الدفع (السلة أو العروض)
let userProfile = { name: '', phone: '', address: '' };

// --- التهيئة عند بدء التشغيل ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
    }, 3500);
    
    loadProfile();
    renderCategories();
    startBanner();
    loadData(); // تحميل البيانات من فايربيس
});

function loadProfile() {
    const saved = localStorage.getItem('amazon_phone_profile');
    if (saved) {
        try {
            userProfile = JSON.parse(saved);
        } catch (e) {
            console.error(e);
        }
    }
    updateProfileDisplay();
}

function updateProfileDisplay() {
    document.getElementById('display-name').innerText = userProfile.name || 'الضيف الكريم';
    document.getElementById('display-phone').innerText = userProfile.phone || 'غير مسجل';
    document.getElementById('display-address').innerText = userProfile.address || 'غير مسجل';
}

window.toggleProfileEdit = function() {
    const viewMode = document.getElementById('profile-view-mode');
    const editMode = document.getElementById('profile-edit-mode');
    
    if (viewMode.style.display !== 'none') {
        viewMode.style.display = 'none';
        editMode.style.display = 'block';
        document.getElementById('edit-name').value = userProfile.name || '';
        document.getElementById('edit-phone').value = userProfile.phone || '';
        document.getElementById('edit-address').value = userProfile.address || '';
    } else {
        viewMode.style.display = 'block';
        editMode.style.display = 'none';
    }
};

window.saveProfile = function() {
    const name = document.getElementById('edit-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const address = document.getElementById('edit-address').value.trim();
    
    if(!name && !phone && !address) {
        showToast('يرجى إدخال بيانات للحفظ!', true);
        return;
    }

    userProfile = { name, phone, address };
    localStorage.setItem('amazon_phone_profile', JSON.stringify(userProfile));
    
    updateProfileDisplay();
    window.toggleProfileEdit();
    showToast('تم حفظ البيانات بنجاح!');
};

// --- التنقل والوضع الليلي ---
window.switchTab = function(tabId, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    element.classList.add('active');
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.toggleTheme = function() {
    document.body.classList.toggle('dark-theme');
    const icon = document.querySelector('#theme-toggle i');
    if (document.body.classList.contains('dark-theme')) {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
};

// --- البانر المتحرك ---
let bannerInterval;
function renderBanners() {
    const track = document.getElementById('banner-track');
    if(!track) return;
    
    if(bannersData.length === 0) {
        track.innerHTML = `
            <img src="https://images.unsplash.com/photo-1601784551446-20c9e07cd562?w=800&q=80" alt="إعلان 1">
            <img src="https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80" alt="إعلان 2">
            <img src="https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=800&q=80" alt="إعلان 3">
        `;
    } else {
        track.innerHTML = bannersData.map(b => `<img src="${b.image_url}" alt="${b.title || 'إعلان'}">`).join('');
    }
    
    startBanner();
}

function startBanner() {
    const track = document.getElementById('banner-track');
    if(!track) return;
    
    const count = track.querySelectorAll('img').length;
    if(count <= 1) {
        track.style.transform = `translateX(0%)`;
        track.style.width = '100%';
        if(track.children.length) track.children[0].style.width = '100%';
        return;
    }
    
    // adjust track width based on count
    track.style.width = `${count * 100}%`;
    track.querySelectorAll('img').forEach(img => img.style.width = `${100 / count}%`);

    if(bannerInterval) clearInterval(bannerInterval);
    
    let index = 0;
    bannerInterval = setInterval(() => {
        index = (index + 1) % count;
        track.style.transform = `translateX(${index * (100 / count)}%)`;
    }, 5000);
}

// --- الأقسام والمنتجات ---
function renderCategories() {
    const wrapper = document.getElementById('categories-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    categoriesData.forEach(cat => {
        const div = document.createElement('div');
        div.className = `cat-box ${cat.id === 'all' ? 'all-cat active-cat' : ''}`;
        if(cat.img) div.style.backgroundImage = `url(${cat.img})`;
        
        div.innerHTML = `
            ${cat.img ? '<div class="cat-overlay"></div>' : ''}
            <span>${cat.name}</span>
        `;
        div.onclick = () => filterCategory(cat.id, div);
        wrapper.appendChild(div);
    });
}

function filterCategory(catId, element) {
    document.querySelectorAll('.cat-box').forEach(box => box.classList.remove('active-cat'));
    element.classList.add('active-cat');
    renderProducts(catId);
}
window.filterCategory = filterCategory;

function renderProducts(category) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    const filtered = category === 'all' ? productsData : productsData.filter(p => p.category === category);
    
    filtered.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick="openProductModal(${p.id})">
                <div class="card-img-wrapper">
                    <img src="${p.img}" alt="${p.name}">
                    <button class="add-btn" onclick="event.stopPropagation(); addToCart(${p.id})">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
                <div class="card-info">
                    <h4>${p.name}</h4>
                    <p class="price">${p.price.toLocaleString()} د.ع</p>
                </div>
            </div>
        `;
    });
}

// --- نافذة تفاصيل المنتج ---
window.openProductModal = function(id) {
    const p = productsData.find(x => x.id === id);
    document.getElementById('modal-img').src = p.img;
    document.getElementById('modal-title').innerText = p.name;
    document.getElementById('modal-price').innerText = p.price.toLocaleString() + ' د.ع';
    
    document.getElementById('modal-add-btn').onclick = () => { 
        addToCart(p.id); 
        closeModal('product-modal'); 
    };

    // جلب منتجات نفس القسم
    const relatedGrid = document.getElementById('related-products');
    relatedGrid.innerHTML = '';
    productsData.filter(x => x.category === p.category && x.id !== p.id).forEach(rel => {
        relatedGrid.innerHTML += `
            <div class="related-card" onclick="closeModal('product-modal'); setTimeout(()=>openProductModal(${rel.id}),300)">
                <img src="${rel.img}" alt="">
                <h4>${rel.name}</h4>
            </div>
        `;
    });

    openModal('product-modal');
}

// --- نظام السلة ---
function addToCart(id) {
    const product = productsData.find(p => p.id === id);
    const exist = cart.find(item => item.id === id);
    if (exist) { exist.qty++; } else { cart.push({ ...product, qty: 1 }); }
    
    updateCartCount();
    showToast('تم إضافة المنتج للسلة بنجاح!');
}
window.addToCart = addToCart;

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').innerText = count;
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    container.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: var(--text-sec);">السلة فارغة حالياً</p>';
        checkoutBtn.style.display = 'none';
    } else {
        checkoutBtn.style.display = 'block';
        cart.forEach(item => {
            total += item.price * item.qty;
            container.innerHTML += `
                <div class="cart-item-row">
                    <img src="${item.img}" alt="">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${(item.price * item.qty).toLocaleString()} د.ع</p>
                    </div>
                    <div class="qty-btn-group">
                        <button onclick="changeQty(${item.id}, 1)">+</button>
                        <span>${item.qty}</span>
                        <button onclick="changeQty(${item.id}, -1)">-</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('cart-total').innerText = total.toLocaleString();
}

window.changeQty = function(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) { cart = cart.filter(i => i.id !== id); }
        updateCartCount();
        renderCart();
    }
}

// --- التبويبة الرئيسية: العروض (5 بـ 15 الف) ---
function renderOffers() {
    const list = document.getElementById('offers-list');
    list.innerHTML = '';
    offersData.forEach(offer => {
        const wrapper = document.createElement('div');
        wrapper.className = 'offer-wrapper';

        const div = document.createElement('div');
        div.className = 'offer-item';
        div.innerHTML = `
            <div class="check-icon"><i class="fa-solid fa-check"></i></div>
            <div class="card-img-wrapper">
                <img src="${offer.img}" alt="${offer.name}">
            </div>
            <div class="card-info">
                <h4>${offer.name}</h4>
            </div>
        `;
        
        const colorsDiv = document.createElement('div');
        colorsDiv.className = 'offer-colors';
        colorsDiv.style.display = 'none';
        
        let colorsHtml = '<p>اختر اللون:</p><div class="colors-list">';
        const colors = offer.colors || ["أسود", "أزرق", "أحمر", "أصفر"];
        colors.forEach((color, idx) => {
            colorsHtml += `<span class="color-badge ${idx === 0 ? 'selected-color' : ''}" onclick="selectColor(event, this, ${offer.id}, '${color}')">${color}</span>`;
        });
        colorsHtml += '</div>';
        colorsDiv.innerHTML = colorsHtml;

        div.onclick = () => toggleOfferSelection(offer.id, div, colorsDiv);
        
        wrapper.appendChild(div);
        wrapper.appendChild(colorsDiv);
        list.appendChild(wrapper);
    });
}

function selectColor(event, element, offerId, color) {
    event.stopPropagation();
    const parent = element.parentElement;
    parent.querySelectorAll('.color-badge').forEach(badge => badge.classList.remove('selected-color'));
    element.classList.add('selected-color');
    selectedOfferColors[offerId] = color;
}
window.selectColor = selectColor;

function toggleOfferSelection(id, element, colorsDiv) {
    const msg = document.getElementById('offer-msg');
    const btn = document.getElementById('confirm-offer-btn');
    
    if (selectedOffers.includes(id)) {
        selectedOffers = selectedOffers.filter(item => item !== id);
        element.classList.remove('selected');
        if(colorsDiv) colorsDiv.style.display = 'none';
    } else {
        if (selectedOffers.length >= 5) {
            showToast('اختر 5 فقط!', true);
            msg.innerText = "اختر 5 فقط";
            msg.style.color = "#e74c3c";
            return;
        }
        selectedOffers.push(id);
        element.classList.add('selected');
        if(colorsDiv) {
            colorsDiv.style.display = 'block';
            if (!selectedOfferColors[id]) {
                const firstColorBadge = colorsDiv.querySelector('.color-badge');
                if (firstColorBadge) selectedOfferColors[id] = firstColorBadge.innerText;
            }
        }
    }

    if (selectedOffers.length === 5) {
        msg.innerText = "اكتمل العدد، يمكنك التأكيد الآن";
        msg.style.color = "var(--success)";
        btn.style.display = 'block';
    } else {
        msg.innerText = "اختر 5 فقط";
        msg.style.color = "var(--text-sec)";
        btn.style.display = 'none';
        
        if(selectedOffers.length < 5 && selectedOffers.length > 0){
             msg.innerText = `اختر 5 فقط (تم تحديد ${selectedOffers.length})`;
        }
    }
}
window.toggleOfferSelection = toggleOfferSelection;

// --- نظام الدفع (Checkout) ---
window.openCheckout = function(source) {
    currentCheckoutSource = source;
    window.closeModal('cart-modal');
    
    document.getElementById('cust-name').value = userProfile.name || '';
    document.getElementById('cust-phone').value = userProfile.phone || '';
    document.getElementById('cust-address').value = userProfile.address || '';

    window.openModal('checkout-modal');
};

window.checkPaymentMethod = function() {
    const method = document.querySelector('input[name="payment"]:checked').value;
    const alertBox = document.getElementById('mastercard-alert');
    if (method === 'mastercard') {
        alertBox.style.display = 'block';
    } else {
        alertBox.style.display = 'none';
    }
};

window.submitOrder = async function() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const address = document.getElementById('cust-address').value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

    if (!name || !phone || !address) {
        showToast("يرجى ملء الاسم والرقم والعنوان!", true);
        return;
    }

    let items = [];
    let itemsDetailed = [];
    let orderType = '';
    let total = 0;

    if (currentCheckoutSource === 'cart') {
        orderType = 'منتجات';
        cart.forEach(item => {
            items.push(`${item.name} (الكمية: ${item.qty})`);
            itemsDetailed.push({ id: item.id, name: item.name, price: item.price, qty: item.qty, img: item.img, type: 'product' });
            total += item.price * item.qty;
        });
    } else {
        orderType = 'عرض (5 قطع)';
        total = 15000;
        selectedOffers.forEach(offerId => {
            const offer = offersData.find(o => o.id === offerId);
            const color = selectedOfferColors[offerId] || 'غير محدد';
            if (offer) {
                items.push(`${offer.name} - لون: ${color}`);
                itemsDetailed.push({ id: offer.id, name: offer.name, color: color, img: offer.img, type: 'offer' });
            }
        });
    }

    const orderData = {
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        paymentMethod: paymentMethod === 'mastercard' ? 'ماستر كارد' : 'الدفع عند الاستلام',
        orderType: orderType,
        itemsSummary: items.join(' | '),
        itemsDetailed: itemsDetailed,
        totalAmount: total,
        status: 'pending',
        date: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        closeModal('checkout-modal');
        openModal('success-modal');

        // تصفير البيانات
        if (currentCheckoutSource === 'cart') {
            cart = [];
            updateCartCount();
        } else {
            selectedOffers = [];
            selectedOfferColors = {};
            document.getElementById('offer-msg').innerText = "اختر 5 فقط";
            document.getElementById('offer-msg').style.color = "var(--text-sec)";
            document.getElementById('confirm-offer-btn').style.display = 'none';
            document.querySelectorAll('.offer-item').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.offer-colors').forEach(el => el.style.display = 'none');
        }
        
        document.getElementById('cust-name').value = '';
        document.getElementById('cust-phone').value = '';
        document.getElementById('cust-address').value = '';
        document.getElementById('mastercard-alert').style.display = 'none';
        document.querySelector('input[value="cod"]').checked = true;
    } catch (e) {
        console.error("Error adding order: ", e);
        showToast("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة لاحقاً.", true);
    }
};

// --- النوافذ والإشعارات العائمة ---
function openModal(id) {
    if (id === 'cart-modal') renderCart();
    const modal = document.getElementById(id);
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}
window.openModal = openModal;

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}
window.closeModal = closeModal;

function showToast(text, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = text;
    toast.style.backgroundColor = isError ? '#e74c3c' : 'var(--text-main)';
    toast.style.color = isError ? '#fff' : 'var(--bg-color)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
window.showToast = showToast;
