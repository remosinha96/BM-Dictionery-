document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const resultContainer = document.getElementById('result-container');

  let dictionary = [];

  // Normalize string: remove accents/diacritics and handle non-string inputs
  const normalize = (str) => {
    if (!str || typeof str !== 'string') return "";
    try {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    } catch (e) {
      console.error("Normalization error for:", str, e);
      return str.toLowerCase();
    }
  };

  // Highlight matches only at the beginning of words
  const highlight = (text, query) => {
    if (!query || !text) return text || "";
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return text;

    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use \b to match only at the beginning of words
      const regex = new RegExp(`\\b(${escapedQuery})`, 'gi');
      return String(text).replace(regex, '<mark>$1</mark>');
    } catch (e) {
      return text;
    }
  };

  // Show loading state
  resultContainer.innerHTML = `
    <div class="empty-state">
    </div>
  `;

  // Fetch the dictionary data
  // Path is relative to index.html
  fetch('dictionary.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        dictionary = data;
        console.log(`Dictionary loaded successfully: ${dictionary.length} entries`);
        if (dictionary.length > 0) {
          console.log('Sample entries:', dictionary.slice(0, 3));
        }
        resultContainer.innerHTML = `
          <div class="empty-state">
          </div>
        `;
      } else {
        throw new Error('Data is not an array');
      }
    })
    .catch(error => {
      console.error('Error loading dictionary:', error);
      resultContainer.innerHTML = `
        <div class="error">
          <p>Failed to load dictionary data.</p>
          <p style="font-size: 0.8rem; margin-top: 0.5rem;">Error: ${error.message}</p>
        </div>
      `;
    });

  const performSearch = () => {
    const query = searchInput.value.trim();
    const normalizedQuery = normalize(query);
    
    if (!query) {
      // Reset SEO to default
      document.title = "BM Dictionary - Learn Regional Language Meanings";
      const metaDesc = document.getElementById('meta-description');
      const canonLink = document.getElementById('canonical-link');
      if (metaDesc) metaDesc.setAttribute('content', "Explore the BM Dictionary to find meanings of regional words in English and Bangla. A simple, fast, and modern dictionary app.");
      if (canonLink) canonLink.setAttribute('href', window.location.origin);

      resultContainer.innerHTML = `
        <div class="empty-state">
        </div>
      `;
      return;
    }

    if (dictionary.length === 0) {
      resultContainer.innerHTML = '<p class="empty-state">Dictionary is still loading or empty...</p>';
      return;
    }

    // Filter results based on Roman word, Bangla word, or English meaning (starting with query)
    const matches = dictionary.filter(item => {
      const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const queryRegex = new RegExp(`\\b${escapedQuery}`, 'i');
      
      const romanMatch = item.word_roman && queryRegex.test(normalize(item.word_roman));
      const banglaMatch = item.word_bangla && item.word_bangla.includes(query);
      const meaningMatch = item.meaning_english && queryRegex.test(normalize(item.meaning_english));
      
      return romanMatch || banglaMatch || meaningMatch;
    });

    // Sort matches: prioritize those where the word starts with the query
    matches.sort((a, b) => {
      const aRoman = normalize(a.word_roman);
      const bRoman = normalize(b.word_roman);
      const aStarts = aRoman.startsWith(normalizedQuery);
      const bStarts = bRoman.startsWith(normalizedQuery);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    // Dynamic SEO Update
    const metaDescription = document.getElementById('meta-description');
    const canonicalLink = document.getElementById('canonical-link');
    const defaultTitle = "BM Dictionary - Learn Regional Language Meanings";
    const defaultDesc = "Explore the BM Dictionary to find meanings of regional words in English and Bangla. A simple, fast, and modern dictionary app.";

    if (matches.length > 0) {
      const topMatch = matches[0];
      const wordName = topMatch.word_roman || topMatch.word_bangla;
      const meaning = topMatch.meaning_english || topMatch.meaning_bangla;
      
      // Update Title
      document.title = `${wordName} - BM Dictionary`;
      
      // Update Meta Description
      if (metaDescription) {
        metaDescription.setAttribute('content', `Learn the meaning of ${wordName} in our regional language dictionary: ${meaning}`);
      }
      
      // Update Canonical Link
      if (canonicalLink) {
        const url = new URL(window.location.href);
        url.searchParams.set('q', query);
        canonicalLink.setAttribute('href', url.toString());
      }

      // Limit results for performance if many matches
      const displayMatches = matches.slice(0, 50);
      
      resultContainer.innerHTML = displayMatches.map(entry => `
        <div class="result-card">
          <div class="word-header">
            <h2 class="word-roman">${highlight(entry.word_roman, query)}</h2>
            <span class="word-bangla">${entry.word_bangla || ''}</span>
          </div>
          <div class="category-tag">${entry.category || 'Word'}</div>
          
          <div class="meaning-section">
            <h3 class="section-label label-english">English Meaning</h3>
            <p class="meaning-text english-meaning">${highlight(entry.meaning_english, query)}</p>
          </div>
          
          <div class="meaning-section">
            <h3 class="section-label label-bangla">Bangla Meaning</h3>
            <p class="meaning-text bangla-meaning bangla-text">${entry.meaning_bangla || ''}</p>
          </div>
        </div>
      `).join('');

      if (matches.length > 50) {
        // Just show the results, no "Showing top 50" message
      }
    } else {
      // Reset SEO to default
      document.title = defaultTitle;
      if (metaDescription) metaDescription.setAttribute('content', defaultDesc);
      if (canonicalLink) canonicalLink.setAttribute('href', window.location.origin);

      resultContainer.innerHTML = `
        <div class="error">
          <p>No matches found for "<strong>${query}</strong>".</p>
        </div>
      `;
    }
  };

  // Real-time search on input
  searchInput.addEventListener('input', performSearch);

  // Page Navigation Logic
  const pages = document.querySelectorAll('.page');
  const navLinks = document.querySelectorAll('.desktop-nav a, .mobile-nav-link, #logo-link, .footer-link');
  const backButtons = document.querySelectorAll('.back-btn');

  const showPage = (pageId) => {
    pages.forEach(page => {
      if (page.id === `${pageId}-page`) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });
    
    // Scroll to top when switching pages
    window.scrollTo(0, 0);
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      let target = link.id ? link.id.replace('nav-', '') : link.getAttribute('data-target');
      
      if (link.id === 'logo-link') target = 'home';
      
      if (target === 'home' || target === 'dictionary') {
        showPage('dictionary');
      } else if (target === 'intro') {
        showPage('introduction');
      }
      
      // Close mobile drawer if it's open
      if (mobileDrawer.classList.contains('active')) {
        toggleMenu();
      }
    });
  });

  backButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target');
      if (target === 'home') {
        showPage('dictionary');
      }
    });
  });

  // Hamburger Menu Toggle
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close');

  const toggleMenu = () => {
    hamburgerBtn.classList.toggle('active');
    mobileDrawer.classList.toggle('active');
  };

  if (hamburgerBtn && mobileDrawer) {
    hamburgerBtn.addEventListener('click', toggleMenu);
    
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', toggleMenu);
    }
  }
});
