// Custom Cursor
const cursor = document.querySelector('.custom-cursor');
document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

// Slider Navigation Logic
// Slides: 0 (Wall Left), 1 (Main Center), 2 (Wall Right)
const sliderContainer = document.querySelector('.slider-container');
let currentSlide = 1;

function goToSlide(index) {
    sliderContainer.style.transform = `translateX(-${index * 100}vw)`;
    currentSlide = index;
}

// Interactive Slider Trigger (Click side walls to move)
document.querySelector('.slide-1').addEventListener('click', () => goToSlide(0));
document.querySelector('.slide-3').addEventListener('click', () => goToSlide(2));
document.querySelector('.slide-2').addEventListener('click', () => goToSlide(1));

// Walking Man Animation on Scroll
const walkingMan = document.getElementById('walkingMan');
const walkingSection = document.querySelector('.walking-section');

window.addEventListener('scroll', () => {
    const sectionTop = walkingSection.offsetTop;
    const sectionHeight = walkingSection.offsetHeight;
    const scrollPos = window.scrollY;

    if (scrollPos > sectionTop - window.innerHeight && scrollPos < sectionTop + sectionHeight) {
        const progress = (scrollPos - (sectionTop - window.innerHeight)) / (sectionHeight + window.innerHeight);
        // Move from right (-200px) to left (window width + 200px)
        const moveX = progress * (window.innerWidth + 400);
        walkingMan.style.right = `${moveX - 200}px`;
    }
});

// Work Tree Reveal on Scroll
const nodes = document.querySelectorAll('.node');
const observerOptions = {
    threshold: 0.2
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
        }
    });
}, observerOptions);

nodes.forEach(node => {
    node.style.opacity = "0";
    node.style.transform = "translateY(50px)";
    node.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
    observer.observe(node);
});

// Testimonials Cycle
const testimonials = document.querySelectorAll('.testi-card');
let testiIndex = 0;

function rotateTestimonials() {
    testimonials.forEach(t => t.classList.remove('active'));
    testiIndex = (testiIndex + 1) % testimonials.length;
    testimonials[testiIndex].classList.add('active');
}

setInterval(rotateTestimonials, 4000);

// Form Submission Feedback
const form = document.getElementById('enquiryForm');
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.innerHTML = "SENT ✓";
    btn.style.background = "#27ae60";
    form.reset();
    setTimeout(() => {
        btn.innerHTML = "SEND";
        btn.style.background = "#1a1a1a";
    }, 3000);
});

// Horizontal parallax on mouse move for images
document.querySelectorAll('.wall-item').forEach(item => {
    item.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.pageX) / 25;
        const y = (window.innerHeight / 2 - e.pageY) / 25;
        item.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
    });
    item.addEventListener('mouseleave', () => {
        item.style.transform = `translate(0, 0) scale(1)`;
    });
});
