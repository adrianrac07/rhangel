// js/app.js (ES module)
const API = {
  products: '/api/products',    // GET -> returns product list
  register: '/api/register',    // POST -> registration JSON
  login: '/api/login',          // POST -> login JSON -> returns token
  cart: '/api/cart',            // POST/GET to sync cart with backend
  orders: '/api/orders'         // POST -> create order
};


/*
 Product format expected from backend (array of objects):
 [
  {
    id: "anta-whirlwind",
    name: "CK ANTA WHIRLWIND",
    price: "₱4,000.00",            // display string
    priceValue: 4000,             // numeric for summing
    image: "assets/ANTA WHIRLWIND.png",
    description: "Short description...",
    features: ["Color: CORE WHITE", "Material: Breathable Mesh"],
    sizes: ["4 KIDS","5 KIDS","6 KIDS"]
  },
  ...
 ]
*/


// Local fallback product list (used if backend is not available)
const fallbackProducts = [
  {
    id: "anta-whirlwind",
    name: "CK ANTA WHIRLWIND",
    price: "₱4,000.00",
    priceValue: 4000,
    image: "assets/ANTA WHIRLWIND.png",
    description: "Dynamic and comfortable sneaker designed with breathable mesh and supportive overlays.",
    features: ["Color: CORE WHITE", "Size: 4K - 8Y", "Material: Breathable Mesh"],
    sizes: ["4 KIDS","5 KIDS","6 KIDS","7 YOUTH","8 YOUTH"],
    category: "featured"
  },
  {
    id: "kobe-grinch",
    name: "KOBE 6 PROTRO GRINCH",
    price: "₱30,799.00 - ₱42,199.00",
    priceValue: 30799,
    image: "assets/KOBE 6 PROTRO GRINCH.jpg",
    description: "Reptile-inspired upper with Lime Green colouring—playful recolouring of Kobe's Black Mamba persona.",
    features: ["Color: GREEN/CRIMSON","Engineered mesh"],
    sizes: ["8.5","9","9.5","10","10.5","11","12"],
    category: "sports"
  }
];


// render helpers
function createProductCard(product) {
  const a = document.createElement('a');
  a.href = '#';
  a.className = 'product-card col';
  a.setAttribute('data-id', product.id);
  a.setAttribute('data-name', product.name);
  a.setAttribute('data-price', product.price);
  a.setAttribute('data-image', product.image);
  a.setAttribute('data-description', product.description || '');
  a.setAttribute('data-features', (product.features || []).join('|'));
  a.setAttribute('data-sizes', (product.sizes || []).join('|'));


  a.innerHTML = `
    <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"/>
    <h3>${product.name}</h3>
    <p class="price">${product.price}</p>
  `;
  a.addEventListener('click', (e)=> {
    e.preventDefault();
    openProductModalFromCard(a);
  });
  return a;
}


async function fetchProducts() {
  try {
    const res = await fetch(API.products);
    if (!res.ok) throw new Error('Network product fetch failed');
    const data = await res.json();
    return Array.isArray(data) ? data : fallbackProducts;
  } catch (err) {
    console.warn('Products fetch failed, using fallback', err);
    return fallbackProducts;
  }
}


function renderProductsGrid(products) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  products.forEach(p => grid.appendChild(createProductCard(p)));
  // also render featured area
  const featuredContainer = document.getElementById('featured-grid');
  if(featuredContainer){
    featuredContainer.innerHTML = '';
    products.filter(p=> p.category === 'featured' || !p.category).slice(0,6).forEach(p => featuredContainer.appendChild(createProductCard(p)));
  }
}


/* PRODUCT MODAL logic follows the same ids as your featured/lifestyle/sports templates (pm-*) so admin pages that reuse the same component will work with minimal changes. */
function openProductModalFromCard(cardEl){
  const title = cardEl.dataset.name || 'Product';
  const price = cardEl.dataset.price || '';
  const image = cardEl.dataset.image || '';
  const desc = cardEl.dataset.description || '';
  const features = (cardEl.dataset.features || '').split('|').filter(Boolean);
  const sizes = (cardEl.dataset.sizes || '').split('|').filter(Boolean);


  document.getElementById('pm-title').textContent = title;
  document.getElementById('pm-price').textContent = price;
  document.getElementById('pm-image').src = image;
  document.getElementById('pm-desc').textContent = desc;


  const sizeSelect = document.getElementById('pm-size');
  sizeSelect.innerHTML = '';
  sizes.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s; opt.textContent = s; sizeSelect.appendChild(opt);
  });


  const featList = document.getElementById('pm-features');
  featList.innerHTML = '';
  features.forEach(f=>{
    const li = document.createElement('li'); li.textContent = f; featList.appendChild(li);
  });


  const modal = new bootstrap.Modal(document.getElementById('productModal'));
  modal.show();


  // attach add to cart behavior
  const addBtn = document.getElementById('pm-add');
  addBtn.onclick = ()=> {
    addToCart({
      id: cardEl.dataset.id,
      name: title,
      priceDisplay: price,
      priceValue: Number(cardEl.dataset.price?.replace(/[^\d\.]/g,'') || 0),
      image
    });
    alert('Added to cart (demo)');
  };
}


/* CART (localStorage + optional sync to backend)
   shape: cart = { items: [{id,name,priceValue,priceDisplay,qty,image}], total }
*/
const CART_KEY = 'ff_cart_v1';
function loadCart(){
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : { items: [] };
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  document.getElementById('cart-count').textContent = cart.items.reduce((s,i)=> s + (i.qty||1),0);
  renderCartUI();
}
function addToCart(item){
  const cart = loadCart();
  const found = cart.items.find(i=>i.id === item.id);
  if(found) found.qty = (found.qty||1) + 1;
  else cart.items.push({...item, qty:1});
  saveCart(cart);
  // optional: sync with backend if logged in
  // fetch(API.cart, {method:'POST', body: JSON.stringify(cart), headers:{'Content-Type':'application/json'}})
}


function renderCartUI(){
  const cart = loadCart();
  const container = document.getElementById('cart-items');
  const empty = document.getElementById('cart-empty');
  const actions = document.getElementById('cart-actions');
  if(!container) return;
  container.innerHTML = '';
  if(cart.items.length === 0){ empty.style.display='block'; actions.style.display='none'; return; }
  empty.style.display='none'; actions.style.display='block';
  let total = 0;
  cart.items.forEach(it=>{
    total += (it.priceValue || 0) * (it.qty||1);
    const div = document.createElement('div'); div.className='cart-item';
    div.innerHTML = `<img src="${it.image}" alt="${it.name}" /><div><strong>${it.name}</strong><div>Qty: ${it.qty}</div><div>${it.priceDisplay}</div></div>`;
    container.appendChild(div);
  });
  document.getElementById('cart-total').textContent = `₱${total.toLocaleString()}`;
}


/* REGISTRATION & LOGIN (very simple demo wiring)
   Expected registration payload:
   { firstName, lastName, email, phone, password, address... }
*/
document.getElementById('registrationForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  // Simple client-side validation (you can extend using existing validations from your original)
  const payload = {
    firstName: document.getElementById('firstName')?.value || '',
    lastName: document.getElementById('lastName')?.value || '',
    email: document.getElementById('email')?.value || '',
    phone: document.getElementById('phone')?.value || '',
    password: document.getElementById('password')?.value || ''
  };
  // POST to API (demo). If backend not available, show success message
  try {
    const res = await fetch(API.register, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if(res.ok){
      document.getElementById('successMessage').style.display='block';
      setTimeout(()=> location.hash = '#login', 1200);
    } else {
      // fallback: show success anyway in demo
      document.getElementById('successMessage').style.display='block';
      setTimeout(()=> location.hash = '#login', 1200);
    }
  } catch (err){
    console.warn('Register POST failed (demo)', err);
    document.getElementById('successMessage').style.display='block';
    setTimeout(()=> location.hash = '#login', 1200);
  }
});


document.getElementById('login-form')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const payload = { email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value };
  try{
    const res = await fetch(API.login, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    if(res.ok){
      const data = await res.json();
      // save token locally (demo) to be used for /api/cart and /api/orders
      if(data.token) localStorage.setItem('ff_token', data.token);
      alert('Logged in (demo).');
       location.hash = 'shop.html';
    } else {
      alert('Login failed (demo)');
    }
  }catch(err){
    console.warn('login error', err);
    alert('Login (demo) — no backend available.');
  }
});


/* CHECKOUT behavior (example)
   POST /api/orders { items: [...], total: ..., userId: ... }
*/
document.getElementById('checkout-btn')?.addEventListener('click', async ()=>{
  const cart = loadCart();
  if(cart.items.length === 0) return alert('Cart empty');
  const payload = { items: cart.items, total: cart.items.reduce((s,i)=> s + (i.priceValue||0) * i.qty,0) };
  try {
    const res = await fetch(API.orders, { method:'POST', headers:{'Content-Type':'application/json','Authorization': `Bearer ${localStorage.getItem('ff_token')||''}`}, body: JSON.stringify(payload) });
    if(res.ok){
      alert('Order placed (demo)');
      localStorage.removeItem(CART_KEY);
      renderCartUI();
    } else {
      alert('Order endpoint returned error (demo).');
    }
  } catch (err) {
    console.warn('order error', err);
    alert('Checkout (demo) - no backend available.');
  }
});


/* Search form */
document.getElementById('site-search')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  // naive client-side search over already fetched products
  fetchProducts().then(products=>{
    const filtered = products.filter(p => p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
    renderProductsGrid(filtered);
  });
});
/*Product Display*/
// Category toggle function
export function showCategory(catId) {
  const categories = document.querySelectorAll('.category');
  categories.forEach(cat => {
    if (cat.id === catId) {
      cat.style.display = 'flex';  // show the selected category
      cat.style.flexWrap = 'wrap';
      cat.style.gap = '1rem';
    } else {
      cat.style.display = 'none';  // hide others
    }
  });
}

// Expose the function to the global window object so it works with inline onclick handlers
window.showCategory = showCategory;

// Optionally initialize with "featured" category shown by default
document.addEventListener('DOMContentLoaded', () => {
  showCategory('featured');
});


/* Initial bootstrap */
(async function init(){
  const products = await fetchProducts();
  renderProductsGrid(products);


  // Attach global pm-add example (some feature pages expect it)
  document.getElementById('pm-add')?.addEventListener('click', ()=> alert('Click Add in modal (demo)'));


  // Render current cart state
  renderCartUI();
})();
export {}; // keep module scope