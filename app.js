// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2Sfe5fYXf4u4qgJKdqtLSh1dJKo4vkJA",
    authDomain: "autoparts-d08ea.firebaseapp.com",
    projectId: "autoparts-d08ea",
    storageBucket: "autoparts-d08ea.appspot.com",
    messagingSenderId: "536268004529",
    appId: "1:536268004529:web:0a8629bd11899679709690"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Firestore collections
const requestsRef = db.collection("requests");
const offersRef = db.collection("offers");
const usersRef = db.collection("users");
const shopsRef = db.collection("shops");

// DOM elements
const elements = {
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    profileBtn: document.getElementById('profile-btn'),
    loginPopup: document.getElementById('login-popup'),
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
    photoInfo: document.getElementById('photo-info'),
    buyerPhoneInput: document.getElementById('buyer-phone'),
    viewPhoneInput: document.getElementById('view-phone'),
    requestMessage: document.getElementById('request-message'),
    viewMessage: document.getElementById('view-message'),
    buyerRequestsList: document.getElementById('buyer-requests-list'),
    publicRequestsList: document.getElementById('public-requests-list'),
    popupContainer: document.getElementById('popup-container'),
    popupTitle: document.getElementById('popup-title'),
    popupMessage: document.getElementById('popup-message'),
    sellerDetails: document.getElementById('seller-details')
};

// Global variables
let carBrands = [];
let carModels = [];
let selectedBrand = '';
let popupMode = 'register';

// Initialize application
function init() {
    setupEventListeners();
    loadLocalCarBrands();
    setupAuthStateListener();
}

// Set up event listeners
function setupEventListeners() {
    // Phone formatting
    elements.buyerPhoneInput.addEventListener('input', formatPhone);
    elements.viewPhoneInput.addEventListener('input', formatPhone);
    
    // Form fields
    elements.carYearInput.addEventListener('input', handleYearInput);
    document.getElementById('buyer-price').addEventListener('input', handlePriceInput);
    
    // Autocomplete
    elements.carBrandInput.addEventListener('input', handleBrandInput);
    elements.carModelInput.addEventListener('input', handleModelInput);
    
    // Photo upload
    elements.partPhotoInput.addEventListener('change', handlePhotoUpload);
    
    // Buttons
    elements.loginBtn.addEventListener('click', () => showPopup('login'));
    elements.registerBtn2.addEventListener('click', () => showPopup('register'));
    elements.logoutBtn.addEventListener('click', () => auth.signOut());
    elements.profileBtn.addEventListener('click', showShopProfilePopup);
    elements.createRequestBtn.addEventListener('click', createRequest);
    elements.buyerRequestsBtn.addEventListener('click', showBuyerRequests);
    elements.viewRequestsBtn.addEventListener('click', loadBuyerRequests);
    elements.backToRequestForm.addEventListener('click', showRequestForm);
    elements.homeLink.addEventListener('click', reloadPage);
    
    // Outside click
    document.addEventListener('click', handleOutsideClick);
}

// Handle authentication state
function setupAuthStateListener() {
    auth.onAuthStateChanged(user => {
        if (user) handleAuthenticatedUser(user);
        else handleUnauthenticatedUser();
    });
}

// Format phone number
function formatPhone(e) {
    const input = e.target;
    let value = input.value.replace(/\D/g, '');
    
    if (value.startsWith('7')) value = '8' + value.substring(1);
    if (value.length > 11) value = value.substring(0, 11);
    
    let formattedValue = '';
    if (value.length > 0) {
        formattedValue = value.substring(0, 1);
        if (value.length > 1) formattedValue += ' (' + value.substring(1, 4);
        if (value.length > 4) formattedValue += ') ' + value.substring(4, 7);
        if (value.length > 7) formattedValue += '-' + value.substring(7, 9);
        if (value.length > 9) formattedValue += '-' + value.substring(9, 11);
    }
    
    input.value = formattedValue;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// ... (Other functions remain mostly unchanged from the optimized version)
// Note: Include all other functions (handleYearInput, handlePriceInput, etc.)
// exactly as they were in the optimized version above
