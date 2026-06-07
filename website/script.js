document.addEventListener('DOMContentLoaded', () => {
  // Intersection Observer for scroll animations
  const revealElements = document.querySelectorAll('.reveal');
  
  const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Optional: Stop observing once revealed
        // observer.unobserve(entry.target);
      }
    });
  };

  const revealOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealObserver = new IntersectionObserver(revealCallback, revealOptions);

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // Simple parallax effect for hero visual
  const heroVisual = document.querySelector('.hero-screenshot');
  if (heroVisual) {
    document.addEventListener('mousemove', (e) => {
      const mouseX = e.clientX / window.innerWidth - 0.5;
      const mouseY = e.clientY / window.innerHeight - 0.5;
      
      // subtle tilt effect
      heroVisual.style.transform = `perspective(1000px) rotateY(${mouseX * 4}deg) rotateX(${-mouseY * 4}deg)`;
    });
    
    // reset on leave
    document.addEventListener('mouseleave', () => {
      heroVisual.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg)`;
    });
  }
});
