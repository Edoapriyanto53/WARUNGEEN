// --- KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://yohzzhgzihahpefcqnnx.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvaHp6aGd6aWhhaHBlZmNxbm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDg1OTcsImV4cCI6MjA4MzE4NDU5N30.VWM3WLE9N2Wvz61nprnQlmFAEaHrM1vaCLn3TcrK4Ek';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const AUTH_KEY = 'MANG_EEN_AUTH';
let products = [];
let cart = [];

// Fungsi Start: Ambil data dari cloud
async function init() {
    await fetchProducts(); 
    if(localStorage.getItem(AUTH_KEY) === 'true') showAdminDashboard();
    updateCartUI();
}

async function fetchProducts() {
    const { data, error } = await supabaseClient.from('products').select('*').order('id', { ascending: false });
    if (!error) {
        products = data;
        renderProducts();
    }
}

// --- ADMIN & DATABASE ---
async function saveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-id').value;
    const name = document.getElementById('p-name').value;
    const price = parseInt(document.getElementById('p-price').value);
    const cat = document.getElementById('p-cat').value;
    const imgData = document.getElementById('p-img-data').value;

    if (editId) {
        // Update data di Cloud
        const { error } = await supabaseClient.from('products').update({ name, price, cat, img: imgData || undefined }).eq('id', editId);
        if (!error) showToast("Produk diupdate di Cloud");
    } else {
        // Simpan baru ke Cloud
        if (!imgData) return showToast("Upload foto dulu!", true);
        const { error } = await supabaseClient.from('products').insert([{ name, price, cat, img: imgData }]);
        if (!error) showToast("Produk tersimpan di Cloud");
    }
    await fetchProducts();
    resetAdminForm();
    renderAdminTable();
}

async function deleteProduct(id) {
    if(confirm("Hapus dari cloud?")) {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (!error) {
            await fetchProducts();
            renderAdminTable();
            showToast("Berhasil dihapus");
        }
    }
}

// --- LOGIKA SISANYA (Routing, Render, Cart tetap sama dengan kode aslimu) ---
function router(view) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(n => n.classList.remove('active'));
    if(view === 'menu') renderProducts();
    if(view === 'cart') renderCart();
    if(view === 'admin') renderAdminTable();
}

document.getElementById('p-img-file')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => document.getElementById('p-img-data').value = reader.result;
        reader.readAsDataURL(file);
    }
});

function loginAdmin() {
    if(document.getElementById('admin-password').value === 'admin123') {
        localStorage.setItem(AUTH_KEY, 'true');
        showAdminDashboard();
        showToast("Login Berhasil");
    } else {
        showToast("Password Salah!", true);
    }
}

function showAdminDashboard() {
    document.getElementById('admin-login-view').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    renderAdminTable();
}

function renderAdminTable() {
    const tbody = document.getElementById('admin-product-list');
    tbody.innerHTML = products.map(p => `
        <tr class="border-b border-slate-50">
            <td class="p-6 flex items-center gap-4">
                <img src="${p.img}" class="w-12 h-12 rounded-xl object-cover">
                <div><p class="font-extrabold">${p.name}</p><p class="text-[10px] text-orange-500 uppercase">${p.cat}</p></div>
            </td>
            <td class="p-6 text-center space-x-4">
                <button onclick="startEdit(${p.id})" class="text-slate-400 hover:text-orange-500"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteProduct(${p.id})" class="text-slate-400 hover:text-red-500"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = products.map(p => `
        <div class="product-card group">
            <img src="${p.img}" class="w-full h-48 object-cover rounded-2xl mb-4 group-hover:scale-105 transition-all">
            <h4 class="font-extrabold text-lg">${p.name}</h4>
            <p class="text-orange-600 font-black">Rp ${p.price.toLocaleString()}</p>
            <button onclick="addToCart(${p.id})" class="w-full bg-slate-50 mt-4 py-3 rounded-xl font-bold">+ Keranjang</button>
        </div>
    `).join('');
}

// Keranjang (Cart) tetap di memori lokal agar tidak campur dengan user lain
function addToCart(id) {
    const p = products.find(x => x.id === id);
    const existing = cart.find(x => x.id === id);
    if(existing) existing.qty++; else cart.push({...p, qty: 1});
    updateCartUI();
    showToast("Berhasil ditambah!");
}

function updateCartUI() {
    const count = cart.reduce((a, b) => a + b.qty, 0);
    document.getElementById('cart-badge').innerText = count;
    document.getElementById('cart-badge').classList.toggle('hidden', count === 0);
}

function renderCart() {
    const cont = document.getElementById('cart-items');
    if(cart.length === 0) {
        document.getElementById('cart-empty').classList.remove('hidden');
        document.getElementById('cart-summary').classList.add('hidden');
        return;
    }
    document.getElementById('cart-empty').classList.add('hidden');
    document.getElementById('cart-summary').classList.remove('hidden');
    
    let total = 0;
    cont.innerHTML = cart.map(item => {
        total += item.price * item.qty;
        return `<div class="bg-white p-6 rounded-3xl flex justify-between items-center shadow-sm border border-slate-50">
            <div class="flex items-center gap-4">
                <img src="${item.img}" class="w-16 h-16 rounded-2xl object-cover">
                <div><h5 class="font-extrabold">${item.name}</h5><p class="text-sm font-bold text-orange-600">Rp ${item.price.toLocaleString()}</p></div>
            </div>
            <div class="flex items-center gap-4 bg-slate-50 p-2 rounded-xl">
                <button onclick="changeQty(${item.id}, -1)" class="w-8 h-8 font-black">-</button>
                <span class="font-black">${item.qty}</span>
                <button onclick="changeQty(${item.id}, 1)" class="w-8 h-8 font-black">+</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = `Rp ${total.toLocaleString()}`;
}

function changeQty(id, delta) {
    const item = cart.find(x => x.id === id);
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(x => x.id !== id);
    renderCart();
    updateCartUI();
}

function startEdit(id) {
    const p = products.find(item => item.id == id);
    document.getElementById('edit-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-cat').value = p.cat;
    document.getElementById('form-title').innerText = "Edit Produk";
    document.getElementById('btn-submit-admin').innerText = "Update Produk";
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
}

function resetAdminForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('p-img-data').value = '';
    document.getElementById('form-title').innerText = "Tambah Produk";
    document.getElementById('btn-submit-admin').innerText = "Simpan Produk";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
}

function checkoutWhatsApp() {
    const name = document.getElementById('cust-name').value;
    if(!name) return showToast("Isi nama dulu!", true);
    let msg = `Halo Mang Een, saya ${name} mau pesan:\n\n`;
    cart.forEach(i => msg += `• ${i.name} (x${i.qty})\n`);
    msg += `\nTotal: ${document.getElementById('cart-total').innerText}`;
    window.open(`https://wa.me/628123456789?text=${encodeURIComponent(msg)}`);
}

function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').innerText = msg;
    t.classList.remove('translate-x-full', 'opacity-0');
    if(isError) t.classList.add('bg-red-500'); else t.classList.remove('bg-red-500');
    setTimeout(() => t.classList.add('translate-x-full', 'opacity-0'), 2500);
}

window.onload = init;