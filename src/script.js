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

  // Highlight matches
  const highlight = (text, query) => {
    if (!query || !text) return text || "";
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return text;

    // Simple case-insensitive match for highlighting
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return String(text).replace(regex, '<mark>$1</mark>');
    } catch (e) {
      return text;
    }
  };

  // Show loading state
  resultContainer.innerHTML = `
    <div class="empty-state">
      <p>Loading dictionary...</p>
      <div style="margin-top: 1rem; font-size: 0.7rem; color: #94a3b8;">Please wait a moment.</div>
    </div>
  `;

  // Fetch the dictionary data with cache busting
  // Path is relative to index.html
  fetch(`./dictionary.json?v=${Date.now()}`)
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
            <p>Dictionary Loaded!</p>
            <p style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">Found ${dictionary.length} words. Type above to search.</p>
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
      resultContainer.innerHTML = `
        <div class="empty-state">
          <p>Type a word above to see its meaning.</p>
          <p style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">You can search in Roman, Bangla, or English.</p>
        </div>
      `;
      return;
    }

    if (dictionary.length === 0) {
      resultContainer.innerHTML = '<p class="empty-state">Dictionary is still loading or empty...</p>';
      return;
    }

    // Filter results based on Roman word, Bangla word, or English meaning
    const matches = dictionary.filter(item => {
      const romanMatch = item.word_roman && normalize(item.word_roman).includes(normalizedQuery);
      const banglaMatch = item.word_bangla && item.word_bangla.includes(query);
      const meaningMatch = item.meaning_english && normalize(item.meaning_english).includes(normalizedQuery);
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

    if (matches.length > 0) {
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
            <h3 class="section-label">English Meaning</h3>
            <p class="meaning-text english-meaning">${highlight(entry.meaning_english, query)}</p>
          </div>
          
          <div class="meaning-section">
            <h3 class="section-label">Bangla Meaning</h3>
            <p class="meaning-text bangla-meaning bangla-text">${entry.meaning_bangla || ''}</p>
          </div>
        </div>
      `).join('');

      if (matches.length > 50) {
        resultContainer.innerHTML += `<p style="text-align: center; color: #64748b; font-size: 0.8rem; padding: 1rem;">Showing top 50 of ${matches.length} matches.</p>`;
      }
    } else {
      resultContainer.innerHTML = `
        <div class="error">
          <p>No matches found for "<strong>${query}</strong>".</p>
          <p style="font-size: 0.8rem; margin-top: 0.5rem; color: #64748b;">Try searching for something else.</p>
        </div>
      `;
    }
  };

  // Real-time search on input
  searchInput.addEventListener('input', performSearch);
});
