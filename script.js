// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2Sfe5fYXf4u4qgJKdqtLSh1dJKo4vkJA",
    authDomain: "autoparts-d08ea.firebaseapp.com",
    projectId: "autoparts-d08ea",
    storageBucket: "autoparts-d08ea.appspot.com",
    messagingSenderId: "536268004529",
    appId: "1:536268004529:web:0a8629bd11899679709690"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const requestsRef = db.collection("requests");
const offersRef = db.collection("offers");
const usersRef = db.collection("users");
const shopsRef = db.collection("shops");

// DOM Elements
const elements = {
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    profileBtn: document.getElementById('profile-btn'),
    loginPopup: document.getElementById('login-popup'),
    closePopupBtn: document.getElementById('close-popup-btn'),
    doActionBtn: document.getElementById('do-action-btn'),
    popupTitle: document.getElementById('popup-title'),
    popupMessage: document.getElementById('popup-message'),
    sellerContent: document.getElementById('seller-content'),
    buyerRequestSection: document.getElementById('buyer-request-section'),
    createRequestBtn: document.getElementById('create-request-btn'),
    requestsSection: document.getElementById('requests-section'),
    sellerOnlyMessage: document.getElementById('seller-only-message'),
    buyerRequestsBtn: document.getElementById('buyer-requests-btn'),
    buyerRequestsSection: document.getElementById('buyer-requests-section'),
    viewRequestsBtn: document.getElementById('view-requests-btn'),
    backToRequestForm: document.getElementById('back-to-request-form'),
    registerBtn2: document.getElementById('register-btn2'),
    homeLink: document.getElementById('home-link'),
    carBrandInput: document.getElementById('car-brand'),
    carModelInput: document.getElementById('car-model'),
    carYearInput: document.getElementById('car-year'),
    brandResults: document.getElementById('brand-results'),
    modelResults: document.getElementById('model-results'),
    partPhotoInput: document.getElementById('part-photo'),
    photoPreview: document.getElementById('photo-preview'),
    photoInfo: document.getElementById('photo-info')
};

// Local Cache
let carBrands = [];
let carModels = [];
let selectedBrand = '';
let popupMode = 'register';

// Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
    elements.loginPopup.classList.add('hidden');
    
    // Phone Formatting
    ['buyer-phone', 'view-phone'].forEach(id => 
        document.getElementById(id).addEventListener('input', formatPhone)
    );

    // Price Input Validation
    elements.buyerPrice = document.getElementById('buyer-price');
    elements.buyerPrice.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
    });

    // Year Input Validation
    elements.carYearInput.addEventListener('input', function() {
        const currentYear = new Date().getFullYear();
        this.value = this.value.slice(0, 4);
        this.setCustomValidity(
            this.value && (this.value < 1900 || this.value > currentYear + 1)
                ? `Год должен быть между 1900 и ${currentYear + 1}`
                : ''
        );
    });

    // Load Car Brands
    loadLocalCarBrands();

    // Autocomplete Handlers
    elements.carBrandInput.addEventListener('input', handleBrandInput);
    elements.carModelInput.addEventListener('input', handleModelInput);
    elements.carBrandInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (!elements.brandResults.classList.contains('hidden')) {
                elements.brandResults.classList.add('hidden');
            }
            if (elements.carBrandInput.value.trim()) {
                elements.carModelInput.disabled = false;
                if (!elements.carModelInput.value) {
                    elements.carModelInput.focus();
                }
            }
        }, 200);
    });

    // Photo Upload Handler
    elements.partPhotoInput.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            elements.photoInfo.textContent = 'Пожалуйста, выберите изображение (JPG, PNG, GIF)';
            elements.photoInfo.style.color = 'var(--danger)';
            return;
        }

        if (file.size > 500 * 1024) {
            elements.photoInfo.textContent = 'Файл слишком большой (максимум 500KB)';
            elements.photoInfo.style.color = 'var(--danger)';
            return;
        }

        elements.photoInfo.textContent = `Файл: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        elements.photoInfo.style.color = 'var(--success)';

        const reader = new FileReader();
        reader.onload = e => {
            elements.photoPreview.src = e.target.result;
            elements.photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
});

// Phone Formatting Function
function formatPhone(e) {
    const input = e.target;
    let value = input.value.replace(/\D/g, '');
    
    if (value.startsWith('7')) value = '8' + value.substring(1);
    if (value.length > 11) value = value.substring(0, 11);

    let formatted = '';
    if (value.length > 0) {
        formatted = value[0];
        if (value.length > 1) formatted += ` (${value.substring(1, 4)}`;
        if (value.length > 4) formatted += `) ${value.substring(4, 7)}`;
        if (value.length > 7) formatted += `-${value.substring(7, 9)}`;
        if (value.length > 9) formatted += `-${value.substring(9, 11)}`;
    }
    input.value = formatted;
}

// Authentication State Listener
auth.onAuthStateChanged(user => {
    elements.loginBtn.classList.toggle('hidden', !!user);
    elements.buyerRequestsBtn.classList.toggle('hidden', !!user);
    elements.profileBtn.classList.toggle('hidden', !user);
    elements.logoutBtn.classList.toggle('hidden', !user);
    elements.sellerContent.classList.toggle('hidden', !user);
    elements.buyerRequestSection.classList.toggle('hidden', !!user);
    elements.sellerOnlyMessage.classList.toggle('hidden', !!user);
    elements.buyerRequestsSection.classList.add('hidden');

    if (user) {
        checkSellerRole(user);
        checkSellerProfile(user);
    } else {
        elements.requestsSection.classList.add('hidden');
    }
});

// Check Seller Role
async function checkSellerRole(user) {
    try {
        const userDoc = await usersRef.doc(user.uid).get();
        if (userDoc.exists && userDoc.data().role === 'seller') {
            elements.requestsSection.classList.remove('hidden');
            elements.sellerOnlyMessage.classList.add('hidden');
            loadPublicRequests();
        } else {
            elements.requestsSection.classList.add('hidden');
            elements.sellerOnlyMessage.classList.remove('hidden');
            elements.sellerOnlyMessage.innerHTML = `
                <h2>Доступ только для продавцов</h2>
                <p>Вы авторизованы, но не являетесь продавцом.</p>
                <p>Для доступа к запросам покупателей зарегистрируйтесь как продавец.</p>
                <div class="auth-buttons">
                    <button id="register-as-seller" class="btn">Зарегистрироваться как продавец</button>
                </div>
            `;
            document.getElementById('register-as-seller').addEventListener('click', () => {
                popupMode = 'register';
                showPopup();
            });
        }
    } catch (error) {
        console.error("Ошибка проверки роли:", error);
        elements.requestsSection.classList.add('hidden');
        elements.sellerOnlyMessage.classList.remove('hidden');
        elements.sellerOnlyMessage.innerHTML = `
            <div class="message error">
                <p>Ошибка при проверке прав доступа</p>
                <p>Пожалуйста, попробуйте перезагрузить страницу</p>
            </div>
        `;
    }
}

// Check Seller Profile
async function checkSellerProfile(user) {
    const userDoc = await usersRef.doc(user.uid).get();
    if (userDoc.exists && userDoc.data().role === 'seller') {
        const shopQuery = await shopsRef.where("userId", "==", user.uid).get();
        const sellerDetails = elements.sellerDetails = document.getElementById('seller-details');
        if (shopQuery.empty) {
            sellerDetails.innerHTML = `
                <p>Пожалуйста, заполните данные вашего магазина, чтобы начать отвечать на запросы покупателей.</p>
                <button id="complete-profile-btn" class="btn">Заполнить профиль магазина</button>
            `;
            document.getElementById('complete-profile-btn').addEventListener('click', showShopProfilePopup);
        } else {
            const shopData = shopQuery.docs[0].data();
            sellerDetails.innerHTML = `
                <p>Теперь вы можете отвечать на запросы покупателей.</p>
                <p>Ваши данные:</p>
                <ul style="padding-left: 1.5rem; margin-top: 1rem;">
                    <li>Магазин: ${shopData.shopName || 'Не указано'}</li>
                    <li>Телефон: ${shopData.shopPhone || 'Не указан'}</li>
                    <li>Адрес: ${shopData.shopAddress || 'Не указан'}</li>
                </ul>
                <button id="edit-profile-btn" class="btn">Редактировать профиль</button>
            `;
            document.getElementById('edit-profile-btn').addEventListener('click', showShopProfilePopup);
        }
    }
}

// Event Listeners for Buttons
elements.loginBtn.addEventListener('click', () => {
    popupMode = 'login';
    showPopup();
});

elements.registerBtn2.addEventListener('click', () => {
    popupMode = 'register';
    showPopup();
});

elements.logoutBtn.addEventListener('click', () => auth.signOut());

elements.profileBtn.addEventListener('click', showShopProfilePopup);

elements.closePopupBtn.addEventListener('click', closePopup);

elements.doActionBtn.addEventListener('click', () => {
    if (popupMode === 'login') login();
    else if (popupMode === 'register') register();
});

elements.createRequestBtn.addEventListener('click', createRequest);

elements.buyerRequestsBtn.addEventListener('click', showBuyerRequests);

elements.viewRequestsBtn.addEventListener('click', loadBuyerRequests);

elements.backToRequestForm.addEventListener('click', () => {
    elements.buyerRequestsSection.classList.add('hidden');
    elements.buyerRequestSection.classList.remove('hidden');
});

elements.homeLink.addEventListener('click', e => {
    e.preventDefault();
    window.location.reload();
});

// Show Buyer Requests Section
function showBuyerRequests() {
    elements.buyerRequestSection.classList.add('hidden');
    elements.sellerOnlyMessage.classList.add('hidden');
    elements.buyerRequestsSection.classList.remove('hidden');
    elements.buyerRequestsList = document.getElementById('buyer-requests-list');
    elements.buyerRequestsList.innerHTML = '';
    document.getElementById('view-phone').value = '';
    document.getElementById('view-message').textContent = '';
    document.getElementById('view-message').className = 'message';
}

// Show Popup
function showPopup() {
    elements.loginPopup.classList.remove('hidden');
    document.body.style.top = `-${window.scrollY}px`;
    document.body.classList.add('popup-open');
    elements.popupTitle.textContent = popupMode === 'login' ? 'Вход для продавцов' : 'Регистрация продавца';
    elements.doActionBtn.textContent = popupMode === 'login' ? 'Войти' : 'Зарегистрироваться';
    document.getElementById('popup-email').value = '';
    document.getElementById('popup-password').value = '';
    elements.popupMessage.textContent = '';
    elements.popupMessage.className = 'message';
}

// Show Shop Profile Popup
function showShopProfilePopup() {
    popupMode = 'shop_profile';
    elements.loginPopup.classList.remove('hidden');
    document.body.style.top = `-${window.scrollY}px`;
    document.body.classList.add('popup-open');
    elements.popupTitle.textContent = 'Данные вашего магазина';
    elements.doActionBtn.textContent = 'Сохранить';

    const popupContent = document.querySelector('.popup-content');
    popupContent.innerHTML = `
        <h2 class="section-title">Данные вашего магазина</h2>
        <div class="form-group">
            <label for="shop-name">Название магазина *</label>
            <input type="text" id="shop-name" placeholder="Введите название магазина" required>
        </div>
        <div class="form-group">
            <label for="shop-phone">Телефон магазина *</label>
            <input type="tel" id="shop-phone" placeholder="8 (777) 765-4321" required>
        </div>
        <div class="form-group">
            <label for="shop-address">Адрес магазина *</label>
            <input type="text" id="shop-address" placeholder="Улица, дом, город" required>
        </div>
        <div id="popup-message" class="message"></div>
        <div class="auth-buttons">
            <button id="do-action-btn" class="btn">Сохранить</button>
            <button id="close-popup-btn" class="btn">Закрыть</button>
        </div>
    `;

    const user = auth.currentUser;
    if (user) {
        shopsRef.where("userId", "==", user.uid).get().then(shopQuery => {
            if (!shopQuery.empty) {
                const shopData = shopQuery.docs[0].data();
                document.getElementById('shop-name').value = shopData.shopName || '';
                document.getElementById('shop-phone').value = shopData.shopPhone || '';
                document.getElementById('shop-address').value = shopData.shopAddress || '';
            }
        });
    }

    document.getElementById('shop-phone').addEventListener('input', formatPhone);
    document.getElementById('do-action-btn').addEventListener('click', saveShopProfile);
    document.getElementById('close-popup-btn').addEventListener('click', closePopup);
}

// Close Popup
function closePopup() {
    elements.loginPopup.classList.add('hidden');
    document.body.classList.remove('popup-open');
    document.body.style.top = '';
    window.scrollTo(0, parseInt(document.body.style.top || '0') * -1);
}

// Login Function
async function login() {
    const email = document.getElementById('popup-email').value;
    const password = document.getElementById('popup-password').value;
    elements.popupMessage.textContent = '';
    elements.popupMessage.className = 'message';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        closePopup();
    } catch (error) {
        let errorMessage = error.message;
        if (error.code === 'auth/user-not-found') errorMessage = 'Пользователь с таким email не найден';
        else if (error.code === 'auth/wrong-password') errorMessage = 'Неверный пароль';
        else if (error.code === 'auth/invalid-credential') errorMessage = 'Некорректные учетные данные';
        elements.popupMessage.textContent = `Ошибка входа: ${errorMessage}`;
        elements.popupMessage.className = 'message error';
    }
}

// Register Seller
async function register() {
    const email = document.getElementById('popup-email').value;
    const password = document.getElementById('popup-password').value;
    elements.popupMessage.textContent = '';
    elements.popupMessage.className = 'message';

    if (password.length < 6) {
        elements.popupMessage.textContent = 'Пароль должен содержать не менее 6 символов';
        elements.popupMessage.className = 'message error';
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await user.getIdToken(true);
        await usersRef.doc(user.uid).set({
            email,
            role: 'seller',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        elements.popupMessage.textContent = 'Регистрация успешна! Заполните данные вашего магазина';
        elements.popupMessage.className = 'message success';
        setTimeout(() => {
            closePopup();
            showShopProfilePopup();
        }, 2000);
    } catch (error) {
        let errorMessage = error.message;
        if (error.code === 'auth/email-already-in-use') errorMessage = 'Этот email уже зарегистрирован';
        else if (error.code === 'auth/weak-password') errorMessage = 'Пароль слишком слабый (минимум 6 символов)';
        else if (error.code === 'permission-denied') errorMessage = 'Ошибка прав доступа';
        elements.popupMessage.textContent = `Ошибка регистрации: ${errorMessage}`;
        elements.popupMessage.className = 'message error';
    }
}

// Save Shop Profile
async function saveShopProfile() {
    const shopName = document.getElementById('shop-name').value;
    const shopPhone = document.getElementById('shop-phone').value;
    const shopAddress = document.getElementById('shop-address').value;
    const user = auth.currentUser;
    const popupMsg = document.getElementById('popup-message');
    popupMsg.textContent = '';
    popupMsg.className = 'message';

    if (!shopName || !shopPhone || !shopAddress) {
        popupMsg.textContent = 'Заполните все поля!';
        popupMsg.className = 'message error';
        return;
    }

    const cleanShopPhone = shopPhone.replace(/\D/g, '');
    try {
        await user.getIdToken(true);
        const shopQuery = await shopsRef.where("userId", "==", user.uid).get();
        if (shopQuery.empty) {
            await shopsRef.add({
                userId: user.uid,
                shopName,
                shopPhone: cleanShopPhone,
                shopAddress,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            popupMsg.textContent = 'Данные магазина сохранены!';
        } else {
            await shopQuery.docs[0].ref.update({
                shopName,
                shopPhone: cleanShopPhone,
                shopAddress,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            popupMsg.textContent = 'Данные магазина обновлены!';
        }
        popupMsg.className = 'message success';
        setTimeout(() => {
            closePopup();
            checkSellerProfile(user);
        }, 2000);
    } catch (error) {
        let errorMessage = error.message;
        if (error.code === 'permission-denied') errorMessage = 'Ошибка прав доступа';
        popupMsg.textContent = `Ошибка: ${errorMessage}`;
        popupMsg.className = 'message error';
    }
}

// Create Buyer Request
async function createRequest() {
    const requestData = {
        carBrand: elements.carBrandInput.value,
        carModel: elements.carModelInput.value,
        partName: document.getElementById('part-name').value,
        buyerPhone: document.getElementById('buyer-phone').value.replace(/\D/g, ''),
        photoFile: elements.partPhotoInput.files[0],
        carYear: elements.carYearInput.value || '',
        details: document.getElementById('part-details').value || '',
        desiredPrice: parseInt(document.getElementById('buyer-price').value) || 0
    };

    const requestMessage = document.getElementById('request-message');
    requestMessage.textContent = '';
    requestMessage.className = 'message';

    if (!requestData.carBrand || !requestData.carModel || !requestData.partName || !requestData.buyerPhone) {
        requestMessage.textContent = 'Заполните обязательные поля!';
        requestMessage.className = 'message error';
        return;
    }

    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(requestData.buyerPhone)) {
        requestMessage.textContent = 'Введите корректный номер телефона (11 цифр)';
        requestMessage.className = 'message error';
        return;
    }

    try {
        if (requestData.photoFile && requestData.photoFile.size > 500 * 1024) {
            requestMessage.textContent = 'Фото слишком большое (максимум 500KB)';
            requestMessage.className = 'message error';
            return;
        }

        requestData.photoData = requestData.photoFile ? await readFileAsDataURL(requestData.photoFile) : '';
        requestData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        requestData.status = "active";

        await requestsRef.add(requestData);
        requestMessage.textContent = 'Ваш запрос отправлен продавцам!';
        requestMessage.className = 'message success';

        // Clear Form
        elements.carBrandInput.value = '';
        elements.carModelInput.value = '';
        elements.carModelInput.disabled = true;
        elements.carYearInput.value = '';
        document.getElementById('part-name').value = '';
        document.getElementById('part-details').value = '';
        document.getElementById('buyer-phone').value = '';
        document.getElementById('buyer-price').value = '';
        elements.partPhotoInput.value = '';
        elements.photoPreview.style.display = 'none';
        elements.photoInfo.textContent = '';

        notifySellers();
    } catch (error) {
        let errorMessage = error.message;
        if (error.code === 'permission-denied') errorMessage = 'Ошибка прав доступа';
        requestMessage.textContent = `Ошибка: ${errorMessage}`;
        requestMessage.className = 'message error';
    }
}

// Read File as Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Load Buyer Requests
async function loadBuyerRequests() {
    const phone = document.getElementById('view-phone').value.replace(/\D/g, '');
    const list = elements.buyerRequestsList;
    const messageDiv = document.getElementById('view-message');
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    const phoneRegex = /^[0-9]{11}$/;
    if (!phone) {
        messageDiv.textContent = 'Введите ваш телефон';
        messageDiv.className = 'message error';
        return;
    }
    if (!phoneRegex.test(phone)) {
        messageDiv.textContent = 'Введите корректный номер телефона (11 цифр)';
        messageDiv.className = 'message error';
        return;
    }

    list.innerHTML = '<p>Загрузка ваших запросов...</p>';
    try {
        const snapshot = await requestsRef.where("buyerPhone", "==", phone).orderBy("createdAt", "desc").get();
        if (snapshot.empty) {
            list.innerHTML = '<p>У вас нет активных запросов</p>';
            return;
        }

        const requestIds = snapshot.docs.map(doc => doc.id);
        const offersQuery = await offersRef.where("requestId", "in", requestIds).get().catch(() => ({ empty: true, forEach: () => {} }));
        const offersByRequest = {};
        offersQuery.forEach(offerDoc => {
            const offer = offerDoc.data();
            offersByRequest[offer.requestId] = offersByRequest[offer.requestId] || [];
            offersByRequest[offer.requestId].push(offer);
        });

        list.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const request = doc.data();
            const requestDate = request.createdAt ? new Date(request.createdAt.toDate()).toLocaleString() : 'недавно';
            const requestCard = document.createElement('div');
            requestCard.className = 'request-card';
            requestCard.innerHTML = `
                <div class="card-title">${request.partName || 'Без названия'}</div>
                <div class="card-meta">
                    <span>${requestDate}</span>
                    <span>Статус: ${request.status || 'активен'}</span>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Автомобиль:</span>
                        <span>${request.carBrand || ''} ${request.carModel || ''} ${request.carYear || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Описание:</span>
                        <span>${request.details || 'Нет описания'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Желаемая цена:</span>
                        <span>${request.desiredPrice ? request.desiredPrice + ' ₸' : 'не указана'}</span>
                    </div>
                    ${request.photoData ? `
                        <div class="detail-item">
                            <span class="detail-label">Фото:</span>
                            <img src="${request.photoData}" class="photo-preview" alt="Фото запчасти" style="display: block;">
                        </div>
                    ` : ''}
                </div>
            `;

            const offersList = document.createElement('div');
            offersList.className = 'offers-list';
            const offers = offersByRequest[doc.id] || [];
            offersList.innerHTML = offers.length === 0 ? '<p>Пока нет предложений от продавцов</p>' : '<h4>Предложения продавцов:</h4>';
            offers.forEach(offer => {
                const offerDate = offer.createdAt ? new Date(offer.createdAt.toDate()).toLocaleString() : 'недавно';
                const offerCard = document.createElement('div');
                offerCard.className = 'offer-card';
                offerCard.innerHTML = `
                    <div class="seller-info">${offer.shopName || 'Магазин'}</div>
                    <div class="offer-price">${offer.price || '0'} ₸</div>
                    <div class="detail-item">
                        <span class="detail-label">Адрес:</span>
                        <span>${offer.shopAddress || 'не указан'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Телефон:</span>
                        <span>${offer.shopPhone || 'не указан'}</span>
                    </div>
                    ${offer.comment ? `<p>Комментарий: ${offer.comment}</p>` : ''}
                    <div class="card-meta">${offerDate}</div>
                    <div class="whatsapp-btn-container">
                        <a href="https://wa.me/7${offer.shopPhone.substring(1)}" target="_blank" class="btn btn-whatsapp">
                            <svg class="whatsapp-icon" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23c-1.48 0-2.93-.39-4.19-1.15l-.3-.17l-3.12.82l.83-3.04l-.2-.32a8.188 8.188 0 0 1-1.26-4.17c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.15 0-.43.06-.66.31c-.22.25-.87.86-.87 2.07c0 1.22.89 2.39 1 2.56c.14.17 1.76 2.67 4.25 3.73c.59.27 1.05.42 1.41.53c.59.19 1.13.16 1.56.1c.48-.07 1.46-.6 1.67-1.18c.21-.58.21-1.07.15-1.18c-.07-.1-.23-.16-.48-.27c-.25-.14-1.47-.74-1.69-.82c-.23-.08-.37-.12-.56.12c-.18.25-.7.81-.86.97c-.15.17-.31.19-.58.07c-.27-.13-1.13-.42-2.16-1.34c-.8-.7-1.34-1.57-1.5-1.83c-.16-.27 0-.42.11-.56c.12-.12.27-.32.37-.48c.1-.15.13-.27.2-.44c.07-.17.03-.31-.02-.43c-.06-.11-.56-1.35-.77-1.84c-.2-.48-.4-.42-.56-.43c-.14 0-.31-.01-.47-.01z"/>
                            </svg>
                            Написать в WhatsApp
                        </a>
                    </div>
                `;
                offersList.appendChild(offerCard);
            });

            requestCard.appendChild(offersList);
            list.appendChild(requestCard);
        });

        messageDiv.textContent = `Найдено запросов: ${snapshot.docs.length}`;
        messageDiv.className = 'message success';
    } catch (error) {
        list.innerHTML = `
            <div class="message error">
                <p>Ошибка загрузки запросов: ${error.message}</p>
                <p>Пожалуйста, попробуйте позже</p>
            </div>
        `;
    }
}

// Load Public Requests
async function loadPublicRequests() {
    const list = elements.publicRequestsList = document.getElementById('public-requests-list');
    list.innerHTML = '<p>Загрузка запросов...</p>';

    try {
        let requestsDocs;
        try {
            requestsDocs = (await requestsRef.where("status", "==", "active").orderBy("createdAt", "desc").limit(10).get()).docs;
        } catch (error) {
            if (error.code === 'failed-precondition') {
                requestsDocs = (await requestsRef.where("status", "==", "active").get()).docs
                    .sort((a, b) => (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0))
                    .slice(0, 10);
            } else {
                throw error;
            }
        }

        if (!requestsDocs.length) {
            list.innerHTML = '<p>Нет активных запросов</p>';
            return;
        }

        const requestIds = requestsDocs.map(doc => doc.id);
        const offersQuery = await offersRef.where("requestId", "in", requestIds).get().catch(() => ({ empty: true, forEach: () => {} }));
        const offersByRequest = {};
        offersQuery.forEach(offerDoc => {
            const offer = offerDoc.data();
            offersByRequest[offer.requestId] = offersByRequest[offer.requestId] || [];
            offersByRequest[offer.requestId].push(offer);
        });

        const user = auth.currentUser;
        let sellerPhone = '';
        if (user) {
            const shopQuery = await shopsRef.where("userId", "==", user.uid).get();
            if (!shopQuery.empty) sellerPhone = shopQuery.docs[0].data().shopPhone || '';
        }

        const hasShopProfile = !!sellerPhone;
        list.innerHTML = '';

        requestsDocs.forEach(doc => {
            const request = doc.data();
            if (request.buyerPhone === sellerPhone) return;

            const requestDate = request.createdAt ? new Date(request.createdAt.toDate()).toLocaleString() : 'недавно';
            const requestCard = document.createElement('div');
            requestCard.className = 'request-card';
            requestCard.innerHTML = `
                <div class="card-title">${request.partName || 'Без названия'}</div>
                <div class="card-meta">
                    <span>${requestDate}</span>
                    <span>Телефон покупателя: ${request.buyerPhone || 'не указан'}</span>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <span class="detail-label">Автомобиль:</span>
                        <span>${request.carBrand || ''} ${request.carModel || ''} ${request.carYear || ''}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Описание:</span>
                        <span>${request.details || 'Нет описания'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Желаемая цена:</span>
                        <span>${request.desiredPrice ? request.desiredPrice + ' ₸' : 'не указана'}</span>
                    </div>
                    ${request.photoData ? `
                        <div class="detail-item">
                            <span class="detail-label">Фото:</span>
                            <img src="${request.photoData}" class="photo-preview" alt="Фото запчасти" style="display: block;">
                        </div>
                    ` : ''}
                    ${request.buyerPhone ? `
                        <div class="whatsapp-btn-container">
                            <a href="https://wa.me/7${request.buyerPhone.substring(1)}" target="_blank" class="btn btn-whatsapp">
                                <svg class="whatsapp-icon" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23c-1.48 0-2.93-.39-4.19-1.15l-.3-.17l-3.12.82l.83-3.04l-.2-.32a8.188 8.188 0 0 1-1.26-4.17c.01-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.15 0-.43.06-.66.31c-.22.25-.87.86-.87 2.07c0 1.22.89 2.39 1 2.56c.14.17 1.76 2.67 4.25 3.73c.59.27 1.05.42 1.41.53c.59.19 1.13.16 1.56.1c.48-.07 1.46-.6 1.67-1.18c.21-.58.21-1.07.15-1.18c-.07-.1-.23-.16-.48-.27c-.25-.14-1.47-.74-1.69-.82c-.23-.08-.37-.12-.56.12c-.18.25-.7.81-.86.97c-.15.17-.31.19-.58.07c-.27-.13-1.13-.42-2.16-1.34c-.8-.7-1.34-1.57-1.5-1.83c-.16-.27 0-.42.11-.56c.12-.12.27-.32.37-.48c.1-.15.13-.27.2-.44c.07-.17.03-.31-.02-.43c-.06-.11-.56-1.35-.77-1.84c-.2-.48-.4-.42-.56-.43c-.14 0-.31-.01-.47-.01z"/>
                                </svg>
                                Написать покупателю в WhatsApp
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;

            const offersList = document.createElement('div');
            offersList.className = 'offers-list';
            const offers = offersByRequest[doc.id] || [];
            offersList.innerHTML = offers.length === 0 ? '<p>Пока нет предложений</p>' : '<h4>Предложения продавцов:</h4>';
            offers.forEach(offer => {
                const offerDate = offer.createdAt ? new Date(offer.createdAt.toDate()).toLocaleString() : 'недавно';
                const offerCard = document.createElement('div');
                offerCard.className = 'offer-card';
                offerCard.innerHTML = `
                    <div class="seller-info">${offer.shopName || 'Магазин'}</div>
                    <div class="offer-price">${offer.price || '0'} ₸</div>
                    <div class="detail-item">
                        <span class="detail-label">Адрес:</span>
                        <span>${offer.shopAddress || 'не указан'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Телефон:</span>
                        <span>${offer.shopPhone || 'не указан'}</span>
                    </div>
                    ${offer.comment ? `<p>Комментарий: ${offer.comment}</p>` : ''}
                    <div class="card-meta">${offerDate}</div>
                `;
                offersList.appendChild(offerCard);
            });

            if (hasShopProfile) {
                const offerForm = document.createElement('div');
                offerForm.className = 'offer-form';
                offerForm.innerHTML = `
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-success offer-btn" data-request-id="${doc.id}">
                            Предложить запчасть
                        </button>
                    </div>
                `;
                requestCard.appendChild(offerForm);
            }

            requestCard.appendChild(offersList);
            list.appendChild(requestCard);
        });

        if (hasShopProfile) await checkOfferLimitations();
    } catch (error) {
        list.innerHTML = `
            <div class="message error">
                <p>Ошибка загрузки запросов: ${error.message}</p>
                <p>Пожалуйста, попробуйте перезагрузить страницу</p>
            </div>
        `;
    }
}

// Check Offer Limitations
async function checkOfferLimitations() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const offersQuery = await offersRef.where("sellerId", "==", user.uid).get();
        const lastOfferTimes = {};
        offersQuery.forEach(doc => {
            const offer = doc.data();
            if (!lastOfferTimes[offer.requestId] || lastOfferTimes[offer.requestId].seconds < offer.createdAt.seconds) {
                lastOfferTimes[offer.requestId] = offer.createdAt;
            }
        });

        document.querySelectorAll('.offer-btn').forEach(btn => {
            const requestId = btn.getAttribute('data-request-id');
            const lastOfferTime = lastOfferTimes[requestId];
            if (lastOfferTime) {
                const now = new Date();
                const diffMinutes = (now - lastOfferTime.toDate()) / (1000 * 60);
                if (diffMinutes < 15) {
                    btn.disabled = true;
                    btn.classList.add('btn-disabled');
                    btn.textContent = `Повторно через ${Math.ceil(15 - diffMinutes)} мин`;
                }
            }
        });
    } catch (error) {
        console.error("Ошибка проверки ограничений:", error);
    }
}

// Show Offer Form
window.showOfferForm = async function(requestId) {
    const user = auth.currentUser;
    if (!user) {
        alert('Для размещения предложения войдите в систему!');
        showPopup();
        return;
    }

    try {
        const allOffersQuery = await offersRef.where("requestId", "==", requestId).where("sellerId", "==", user.uid).get();
        const now = new Date();
        let hasRecentOffer = false;
        allOffersQuery.forEach(doc => {
            const diffMinutes = (now - doc.data().createdAt.toDate()) / (1000 * 60);
            if (diffMinutes < 15) hasRecentOffer = true;
        });

        if (hasRecentOffer) {
            alert("Вы уже отправляли предложение по этому запросу менее 15 минут назад.");
            return;
        }
    } catch (error) {
        console.error("Ошибка проверки предложения:", error);
        alert("Произошла ошибка. Попробуйте позже.");
        return;
    }

    const shopQuery = await shopsRef.where("userId", "==", user.uid).get();
    if (shopQuery.empty) {
        alert('Заполните данные магазина в профиле!');
        showShopProfilePopup();
        return;
    }

    const shopData = shopQuery.docs[0].data();
    const price = prompt("Введите вашу цену (тенге):");
    if (!price || isNaN(price)) {
        alert("Введите корректную цену!");
        return;
    }

    const comment = prompt("Дополнительный комментарий (необязательно):") || '';
    try {
        await user.getIdToken(true);
        await offersRef.add({
            requestId,
            sellerId: user.uid,
            shopName: shopData.shopName,
            shopPhone: shopData.shopPhone,
            shopAddress: shopData.shopAddress,
            price: Number(price),
            comment,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Ваше предложение отправлено!");
        loadPublicRequests();
    } catch (error) {
        let errorMessage = error.message;
        if (error.code === 'permission-denied') errorMessage = 'Ошибка прав доступа';
        alert(`Ошибка: ${errorMessage}`);
    }
};

// Notify Sellers
async function notifySellers() {
    try {
        console.log("Уведомление продавцов о новом запросе");
        const sellers = await usersRef.where("role", "==", "seller").get();
        sellers.forEach(seller => console.log(`Уведомление отправлено продавцу: ${seller.id}`));
    } catch (error) {
        console.error("Ошибка уведомления:", error);
    }
}

// Load Car Brands
function loadLocalCarBrands() {
    carBrands = [
        'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Hyundai', 'Kia', 'Volkswagen', 'BMW', 'Mercedes-Benz',
        'Audi', 'Mazda', 'Subaru', 'Lexus', 'Jeep', 'Mitsubishi', 'Renault', 'Peugeot', 'Skoda', 'Volvo',
        'Lada', 'UAZ', 'GAZ', 'Tesla', 'Porsche'
    ].sort();
}

// Load Car Models
function loadCarModels(brand) {
    const modelsDatabase = {
        'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Land Cruiser', 'Hilux', 'Avalon', 'Tacoma', 'Tundra'],
        'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Fit', 'Odyssey', 'HR-V', 'Passport'],
        'Ford': ['Fiesta', 'Focus', 'Fusion', 'Mustang', 'Explorer', 'Escape', 'Edge', 'F-150', 'Ranger'],
        'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Murano', 'Qashqai', 'X-Trail', 'Juke', 'Leaf'],
        'Hyundai': ['Sonata', 'Elantra', 'Tucson', 'Santa Fe', 'Kona', 'Accent', 'Creta', 'Palisade'],
        'Kia': ['Rio', 'Seltos', 'Sportage', 'Sorento', 'Optima', 'Ceed', 'Cerato', 'Stinger'],
        'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Jetta', 'Polo', 'Touareg', 'Arteon', 'T-Roc'],
        'BMW': ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X1', 'X7', 'Z4'],
        'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'A-Class', 'GLA', 'GLS'],
        'Lada': ['Granta', 'Vesta', 'Niva', 'Largus', 'XRAY', '4x4'],
        'UAZ': ['Patriot', 'Hunter', 'Pickup', 'Profi', 'Bukhanka'],
        'Tesla': ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'],
        'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3', 'Q3', 'A8', 'TT']
    };
    carModels = (modelsDatabase[brand] || []).sort();
}

// Handle Brand Input
function handleBrandInput() {
    const value = elements.carBrandInput.value.toLowerCase();
    elements.brandResults.innerHTML = '';
    if (value.length < 1) {
        elements.brandResults.classList.add('hidden');
        elements.carModelInput.disabled = true;
        return;
    }

    const filteredBrands = carBrands.filter(brand => brand.toLowerCase().includes(value)).slice(0, 10);
    if (value.trim() && !filteredBrands.some(b => b.toLowerCase() === value.toLowerCase())) {
        const manualOption = document.createElement('div');
        manualOption.className = 'autocomplete-item manual-option';
        manualOption.innerHTML = `<strong>Использовать "${elements.carBrandInput.value}"</strong>`;
        manualOption.addEventListener('click', () => {
            selectedBrand = elements.carBrandInput.value;
            elements.carModelInput.disabled = false;
            elements.carModelInput.focus();
            elements.brandResults.classList.add('hidden');
        });
        elements.brandResults.appendChild(manualOption);
    }

    if (filteredBrands.length > 0) {
        filteredBrands.forEach(brand => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = brand;
            item.addEventListener('click', () => {
                elements.carBrandInput.value = brand;
                elements.brandResults.classList.add('hidden');
                selectedBrand = brand;
                elements.carModelInput.disabled = false;
                loadCarModels(brand);
                elements.carModelInput.focus();
            });
            elements.brandResults.appendChild(item);
        });
        elements.brandResults.classList.remove('hidden');
    } else if (value.trim()) {
        elements.brandResults.classList.remove('hidden');
    } else {
        elements.brandResults.classList.add('hidden');
    }
}

// Handle Model Input
function handleModelInput() {
    const value = elements.carModelInput.value.toLowerCase();
    elements.modelResults.innerHTML = '';
    if (value.length < 1) {
        elements.modelResults.classList.add('hidden');
        return;
    }

    const filteredModels = carModels.filter(model => model.toLowerCase().includes(value)).slice(0, 10);
    if (value.trim() && !filteredModels.some(m => m.toLowerCase() === value.toLowerCase())) {
        const manualOption = document.createElement('div');
        manualOption.className = 'autocomplete-item manual-option';
        manualOption.innerHTML = `<strong>Использовать "${elements.carModelInput.value}"</strong>`;
        manualOption.addEventListener('click', () => elements.modelResults.classList.add('hidden'));
        elements.modelResults.appendChild(manualOption);
    }

    if (filteredModels.length > 0) {
        filteredModels.forEach(model => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = model;
            item.addEventListener('click', () => {
                elements.carModelInput.value = model;
                elements.modelResults.classList.add('hidden');
            });
            elements.modelResults.appendChild(item);
        });
        elements.modelResults.classList.remove('hidden');
    } else if (value.trim()) {
        elements.modelResults.classList.remove('hidden');
    } else {
        elements.modelResults.classList.add('hidden');
    }
}

// Hide Autocomplete on Click Outside
document.addEventListener('click', e => {
    if (!elements.carBrandInput.contains(e.target) && !elements.brandResults.contains(e.target)) {
        elements.brandResults.classList.add('hidden');
    }
    if (!elements.carModelInput.contains(e.target) && !elements.modelResults.contains(e.target)) {
        elements.modelResults.classList.add('hidden');
    }
});
