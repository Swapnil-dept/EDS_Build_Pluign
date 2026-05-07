export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // Each row is a slide: [background-image, title, cta-text, cta-link]
  const slides = rows.map((row) => {
    const cells = [...row.children];
    return {
      image: cells[0]?.querySelector('picture') || cells[0]?.querySelector('img'),
      title: cells[1]?.textContent.trim() || '',
      ctaText: cells[2]?.textContent.trim() || '',
      ctaLink: cells[3]?.querySelector('a')?.href || cells[3]?.textContent.trim() || '#',
    };
  });

  block.textContent = '';
  block.classList.add('project-hero');

  // Carousel wrapper
  const carousel = document.createElement('div');
  carousel.className = 'project-hero-carousel';

  slides.forEach((slide, i) => {
    const slideEl = document.createElement('div');
    slideEl.className = 'project-hero-slide' + (i === 0 ? ' active' : '');

    // Background
    if (slide.image) {
      const bg = document.createElement('div');
      bg.className = 'project-hero-bg';
      bg.append(slide.image);
      slideEl.append(bg);
    }

    // Overlay content
    const overlay = document.createElement('div');
    overlay.className = 'project-hero-overlay';

    const title = document.createElement('h1');
    title.className = 'project-hero-title';
    title.textContent = slide.title;
    overlay.append(title);

    if (slide.ctaText) {
      const cta = document.createElement('a');
      cta.className = 'project-hero-cta';
      cta.href = slide.ctaLink;
      cta.textContent = slide.ctaText;
      overlay.append(cta);
    }

    slideEl.append(overlay);
    carousel.append(slideEl);
  });

  block.append(carousel);

  // Navigation arrows
  if (slides.length > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'project-hero-arrow project-hero-prev';
    prevBtn.setAttribute('aria-label', 'Previous slide');
    prevBtn.innerHTML = '&#10094;';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'project-hero-arrow project-hero-next';
    nextBtn.setAttribute('aria-label', 'Next slide');
    nextBtn.innerHTML = '&#10095;';

    // Dots
    const dots = document.createElement('div');
    dots.className = 'project-hero-dots';
    slides.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'project-hero-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      dots.append(dot);
    });

    block.append(prevBtn, nextBtn, dots);

    let current = 0;
    const allSlides = carousel.querySelectorAll('.project-hero-slide');
    const allDots = dots.querySelectorAll('.project-hero-dot');

    function goToSlide(index) {
      allSlides[current].classList.remove('active');
      allDots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      allSlides[current].classList.add('active');
      allDots[current].classList.add('active');
    }

    prevBtn.addEventListener('click', () => goToSlide(current - 1));
    nextBtn.addEventListener('click', () => goToSlide(current + 1));

    // Auto-advance
    setInterval(() => goToSlide(current + 1), 5000);
  }
}
