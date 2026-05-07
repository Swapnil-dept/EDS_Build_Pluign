/* ===== STUB DATA ===== */
const STUB_USERS = [
  {
    email: 'dr.rishi@cipla.com',
    password: 'password123',
    name: 'Dr. Rishi Bhargava',
    specialty: 'Dermatology',
  },
  {
    email: 'dr.priya@cipla.com',
    password: 'password123',
    name: 'Dr. Priya Mehta',
    specialty: 'Cardiology',
  },
];

const STUB_TOP_PICKS = [
  {
    tag: 'CONFERENCE HIGHLIGHTS',
    title: 'ESCMID 2026: Updates on Skin and Soft Tissue Infections',
    date: '28 Apr, 26',
    source: 'ESCMID 2026',
    likes: 0,
    comments: 0,
    thumb: 'https://placehold.co/200x160/e3f2fd/1565c0?text=ESCMID+2026',
  },
  {
    tag: 'CLINICAL UPDATES',
    title: 'Novel Biologic Therapies in Moderate-to-Severe Psoriasis: A 2026 Review',
    date: '26 Apr, 26',
    source: 'Dermatology Today',
    likes: 3,
    comments: 1,
    thumb: 'https://placehold.co/200x160/e8f5e9/2e7d32?text=Psoriasis',
  },
  {
    tag: 'RESEARCH',
    title: 'Antibiotic Stewardship in Respiratory Infections: What\'s New?',
    date: '25 Apr, 26',
    source: 'Pulmonary Review',
    likes: 5,
    comments: 2,
    thumb: 'https://placehold.co/200x160/fff3e0/e65100?text=Antibiotics',
  },
];

const STUB_FEATURED = [
  {
    tag: 'KEY TRIALS',
    title: 'Fractional Microneedle Radiofrequency with Topical Antioxidants for Neck Rejuvenation',
    date: '27 Apr, 26',
    likes: 0,
    comments: 0,
    thumb: 'https://placehold.co/144x144/e8f5e9/2e7d32?text=Skin',
  },
  {
    tag: 'GUIDELINES',
    title: 'Updated WHO Guidelines for Management of Drug-Resistant Tuberculosis',
    date: '24 Apr, 26',
    likes: 2,
    comments: 0,
    thumb: 'https://placehold.co/144x144/e3f2fd/1565c0?text=TB',
  },
  {
    tag: 'CASE STUDY',
    title: 'Successful Use of Combination Inhaler Therapy in Severe COPD',
    date: '22 Apr, 26',
    likes: 7,
    comments: 3,
    thumb: 'https://placehold.co/144x144/fce4ec/c62828?text=COPD',
  },
];

/* ===== DOM REFERENCES ===== */
const loginBtn = document.getElementById('loginBtn');
const loginOverlay = document.getElementById('loginOverlay');
const loginClose = document.getElementById('loginClose');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const welcomeBanner = document.getElementById('welcomeBanner');
const doctorNameEl = document.getElementById('doctorName');
const specialtySelect = document.getElementById('specialtySelect');
const topPicksList = document.getElementById('topPicksList');
const featuredList = document.getElementById('featuredList');

/* ===== LOGIN LOGIC ===== */
let currentUser = null;

loginBtn.addEventListener('click', () => {
  if (currentUser) {
    // If logged in, clicking again logs out
    currentUser = null;
    welcomeBanner.style.display = 'none';
    loginBtn.innerHTML = '<i class="fas fa-user-circle"></i>';
    loginBtn.title = 'Login';
    return;
  }
  loginOverlay.classList.add('show');
  document.getElementById('loginEmail').focus();
});

loginClose.addEventListener('click', () => {
  loginOverlay.classList.remove('show');
  loginError.textContent = '';
});

loginOverlay.addEventListener('click', (e) => {
  if (e.target === loginOverlay) {
    loginOverlay.classList.remove('show');
    loginError.textContent = '';
  }
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const user = STUB_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  if (!user) {
    loginError.textContent = 'Invalid credentials. Please try again.';
    return;
  }

  // Successful login
  currentUser = user;
  loginOverlay.classList.remove('show');
  loginError.textContent = '';
  loginForm.reset();
  showWelcome(user);
});

function showWelcome(user) {
  doctorNameEl.textContent = user.name;
  specialtySelect.value = user.specialty;
  welcomeBanner.style.display = 'block';
  loginBtn.innerHTML = '<i class="fas fa-right-from-bracket"></i>';
  loginBtn.title = 'Logout';
}

/* ===== CAROUSEL ===== */
const slides = document.querySelectorAll('.carousel-slide');
const dotsContainer = document.getElementById('carouselDots');
let currentSlide = 0;

// Create dots
slides.forEach((_, i) => {
  const dot = document.createElement('span');
  dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => goToSlide(i));
  dotsContainer.appendChild(dot);
});

function goToSlide(index) {
  slides[currentSlide].classList.remove('active');
  dotsContainer.children[currentSlide].classList.remove('active');
  currentSlide = (index + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dotsContainer.children[currentSlide].classList.add('active');
}

document.getElementById('carouselPrev').addEventListener('click', () => goToSlide(currentSlide - 1));
document.getElementById('carouselNext').addEventListener('click', () => goToSlide(currentSlide + 1));

// Auto-advance every 5s
setInterval(() => goToSlide(currentSlide + 1), 5000);

/* ===== RENDER CARDS ===== */
function renderTopPicks() {
  topPicksList.innerHTML = STUB_TOP_PICKS.map(
    (item) => `
    <article class="card">
      <div class="card-body">
        <span class="card-tag">${item.tag}</span>
        <h3 class="card-title">${item.title}</h3>
        <div class="card-meta">
          <span><i class="far fa-calendar"></i> ${item.date}</span>
          <span><i class="fas fa-link"></i> ${item.source}</span>
        </div>
        <div class="card-actions">
          <span class="card-action"><i class="fas fa-share-nodes"></i></span>
          <span class="card-action"><i class="far fa-bookmark"></i></span>
          <span class="card-action"><i class="far fa-thumbs-up"></i> ${item.likes}</span>
          <span class="card-action"><i class="far fa-comment"></i> ${item.comments}</span>
        </div>
      </div>
      <div class="card-thumb">
        <img src="${item.thumb}" alt="${item.title}">
      </div>
    </article>
  `
  ).join('');
}

function renderFeatured() {
  featuredList.innerHTML = STUB_FEATURED.map(
    (item) => `
    <article class="featured-card">
      <div class="featured-card-body">
        <span class="card-tag">${item.tag}</span>
        <h3 class="card-title">${item.title}</h3>
        <div class="card-meta">
          <span>${item.date}</span>
        </div>
        <div class="card-actions">
          <span class="card-action"><i class="fas fa-share-nodes"></i></span>
          <span class="card-action"><i class="far fa-bookmark"></i></span>
          <span class="card-action"><i class="far fa-thumbs-up"></i> ${item.likes}</span>
          <span class="card-action"><i class="far fa-comment"></i> ${item.comments}</span>
        </div>
      </div>
      <div class="featured-card-thumb">
        <img src="${item.thumb}" alt="${item.title}">
      </div>
    </article>
  `
  ).join('');
}

/* ===== INIT ===== */
renderTopPicks();
renderFeatured();
