(function () {
  const app = document.getElementById('app');
  const themeToggle = document.getElementById('themeToggle');
  let allCountries = [];
  let currentRegion = '';
  let currentPage = 1;
  const perPage = 20;
  let filteredCountries = [];

  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      updateThemeIcon(true);
    }
  }

  function updateThemeIcon(isDark) {
    themeToggle.innerHTML = isDark
      ? '<i class="fa-solid fa-moon"></i><span>Light Mode</span>'
      : '<i class="fa-regular fa-moon"></i><span>Dark Mode</span>';
  }

  themeToggle.addEventListener('click', function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      updateThemeIcon(false);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      updateThemeIcon(true);
    }
  });

  function formatPopulation(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function getRegionList(countries) {
    const regions = {};
    countries.forEach(function (c) {
      if (c.region) regions[c.region] = true;
    });
    return Object.keys(regions).sort();
  }

  function loadData(cb) {
    if (allCountries.length) {
      cb(allCountries);
      return;
    }
    fetch('data.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allCountries = data;
        cb(data);
      })
      .catch(function () {
        app.innerHTML = '<p class="no-results">Failed to load country data.</p>';
      });
  }

  function renderHome() {
    app.innerHTML = '<p class="loading">Loading countries...</p>';

    loadData(function (countries) {
      const regions = getRegionList(countries);
      const controlsHtml =
        '<div class="home__controls">' +
          '<div class="search">' +
            '<i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="text" id="searchInput" placeholder="Search for a country..." autocomplete="off">' +
          '</div>' +
          '<div class="filter">' +
            '<button class="filter__button" id="filterBtn">' +
              '<span id="filterLabel">Filter by Region</span>' +
              '<i class="fa-solid fa-chevron-down"></i>' +
            '</button>' +
            '<div class="filter__dropdown" id="filterDropdown">' +
              regions.map(function (r) {
                return '<button class="filter__option" data-region="' + r + '">' + r + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="countries" id="countriesGrid"></div>' +
        '<nav class="pagination" id="pagination"></nav>';

      app.innerHTML = controlsHtml;
      filteredCountries = countries.slice();
      currentPage = 1;
      renderPage();
      setupHomeEvents(regions);
    });
  }

  function countryCardHtml(c) {
    return '<a href="#/country/' + c.alpha3Code + '" class="country-card">' +
      '<img class="country-card__flag" src="' + c.flags.png + '" alt="' + c.name + ' flag" loading="lazy">' +
      '<div class="country-card__info">' +
        '<h2 class="country-card__name">' + c.name + '</h2>' +
        '<p class="country-card__detail"><span>Population: </span>' + formatPopulation(c.population) + '</p>' +
        '<p class="country-card__detail"><span>Region: </span>' + c.region + '</p>' +
        '<p class="country-card__detail"><span>Capital: </span>' + (c.capital || 'N/A') + '</p>' +
      '</div>' +
    '</a>';
  }

  function renderCountries(countries) {
    const grid = document.getElementById('countriesGrid');
    if (!grid) return;

    if (countries.length === 0) {
      grid.innerHTML = '<p class="no-results">No countries found.</p>';
      return;
    }

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageItems = countries.slice(start, end);
    grid.innerHTML = pageItems.map(countryCardHtml).join('');
  }

  function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    const totalPages = Math.ceil(filteredCountries.length / perPage);
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let html = '<button class="pagination__btn" data-page="prev" ' + (currentPage === 1 ? 'disabled' : '') + '><i class="fa-solid fa-chevron-left"></i></button>';

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    if (startPage > 1) {
      html += '<button class="pagination__btn" data-page="1">1</button>';
      if (startPage > 2) html += '<span class="pagination__ellipsis">...</span>';
    }

    for (let i = startPage; i <= endPage; i++) {
      html += '<button class="pagination__btn' + (i === currentPage ? ' pagination__btn--active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += '<span class="pagination__ellipsis">...</span>';
      html += '<button class="pagination__btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }

    html += '<button class="pagination__btn" data-page="next" ' + (currentPage === totalPages ? 'disabled' : '') + '><i class="fa-solid fa-chevron-right"></i></button>';

    pagination.innerHTML = html;

    pagination.querySelectorAll('.pagination__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const page = btn.getAttribute('data-page');
        const total = Math.ceil(filteredCountries.length / perPage);
        if (page === 'prev') currentPage = Math.max(1, currentPage - 1);
        else if (page === 'next') currentPage = Math.min(total, currentPage + 1);
        else currentPage = parseInt(page, 10);
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function renderPage() {
    renderCountries(filteredCountries);
    renderPagination();
  }

  function setupHomeEvents() {
    const searchInput = document.getElementById('searchInput');
    const filterBtn = document.getElementById('filterBtn');
    const filterDropdown = document.getElementById('filterDropdown');
    const filterLabel = document.getElementById('filterLabel');
    const filterOptions = document.querySelectorAll('.filter__option');

    function filterCountries() {
      const query = searchInput.value.toLowerCase().trim();
      filteredCountries = allCountries.filter(function (c) {
        const matchesSearch = !query || c.name.toLowerCase().indexOf(query) !== -1;
        const matchesRegion = !currentRegion || c.region === currentRegion;
        return matchesSearch && matchesRegion;
      });
      currentPage = 1;
      renderPage();
    }

    searchInput.addEventListener('input', filterCountries);

    filterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      filterDropdown.classList.toggle('open');
      filterBtn.classList.toggle('open');
    });

    filterOptions.forEach(function (opt) {
      opt.addEventListener('click', function () {
        currentRegion = opt.getAttribute('data-region');
        filterLabel.textContent = currentRegion;
        filterDropdown.classList.remove('open');
        filterBtn.classList.remove('open');
        filterCountries();
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.filter')) {
        filterDropdown.classList.remove('open');
        filterBtn.classList.remove('open');
      }
    });
  }

  function renderDetail(code) {
    app.innerHTML = '<p class="loading">Loading country details...</p>';

    loadData(function (countries) {
      const country = countries.find(function (c) { return c.alpha3Code === code; });

      if (!country) {
        app.innerHTML = '<p class="no-results">Country not found.</p>';
        return;
      }

      const currencies = (country.currencies || []).map(function (c) { return c.name; }).join(', ') || 'N/A';
      const languages = (country.languages || []).map(function (l) { return l.name; }).join(', ') || 'N/A';
      const tld = (country.topLevelDomain || []).join(', ') || 'N/A';

      let bordersHtml = '';
      if (country.borders && country.borders.length) {
        const borderBtns = country.borders.map(function (borderCode) {
          const border = countries.find(function (c) { return c.alpha3Code === borderCode; });
          const name = border ? border.name : borderCode;
          return '<a href="#/country/' + borderCode + '" class="detail__border-btn">' + name + '</a>';
        }).join('');
        bordersHtml =
          '<div class="detail__borders">' +
            '<h3 class="detail__borders-title">Border Countries:</h3>' +
            '<div class="detail__borders-list">' + borderBtns + '</div>' +
          '</div>';
      }

      app.innerHTML =
        '<a href="#/" class="detail__back"><i class="fa-solid fa-arrow-left"></i> Back</a>' +
        '<div class="detail__content">' +
          '<img class="detail__flag" src="' + country.flags.png + '" alt="' + country.name + ' flag">' +
          '<div class="detail__info">' +
            '<h1 class="detail__name">' + country.name + '</h1>' +
            '<div class="detail__meta">' +
              '<div>' +
                '<p class="detail__meta-item"><span>Native Name: </span>' + (country.nativeName || 'N/A') + '</p>' +
                '<p class="detail__meta-item"><span>Population: </span>' + formatPopulation(country.population) + '</p>' +
                '<p class="detail__meta-item"><span>Region: </span>' + (country.region || 'N/A') + '</p>' +
                '<p class="detail__meta-item"><span>Sub Region: </span>' + (country.subregion || 'N/A') + '</p>' +
                '<p class="detail__meta-item"><span>Capital: </span>' + (country.capital || 'N/A') + '</p>' +
              '</div>' +
              '<div>' +
                '<p class="detail__meta-item"><span>Top Level Domain: </span>' + tld + '</p>' +
                '<p class="detail__meta-item"><span>Currencies: </span>' + currencies + '</p>' +
                '<p class="detail__meta-item"><span>Languages: </span>' + languages + '</p>' +
              '</div>' +
            '</div>' +
            bordersHtml +
          '</div>' +
        '</div>';
    });
  }

  function router() {
    const hash = window.location.hash || '#/';
    const countryMatch = hash.match(/^#\/country\/(.+)$/);

    if (countryMatch) {
      renderDetail(countryMatch[1]);
    } else {
      renderHome();
    }
  }

  initTheme();
  window.addEventListener('hashchange', router);
  router();
})();
