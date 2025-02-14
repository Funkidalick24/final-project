class InfoCards {
    constructor() {
        this.weatherTemp = document.querySelector('.temperature');
        this.exchangeRates = document.querySelectorAll('.rate-value');
        this.newsItems = document.querySelectorAll('.news-item');
        this.rateElements = document.querySelectorAll('.rate');
        
        this.apiKey = '701b3495d95b3364ae51b82c'; // Exchange rate API key
        this.newsApiKey = 'YNoI3SUhFfCjtKe0udBlrF3AQTeEKAJaCSYo2nONghPp7Jzq'; // Currents API key
        
        // Add property to store all news articles
        this.allNews = [];
        
        this.weatherApiKey = '78ec6c06a32d185e90be2e95b738a84e';
        this.weatherCity = document.querySelector('.weather-city');
        this.weatherSearch = document.querySelector('.weather-search');
        this.cityList = document.querySelector('.city-list');
        this.selectedCity = { name: 'Paris', lat: 48.8566, lon: 2.3522 }; // Default city
        
        // Add base currencies array for rotation
        this.baseCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
        this.currentBaseIndex = 0;
        
        this.initializeWeatherSearch();
        this.initializeUpdates();
    }

    initializeUpdates() {
        // Update weather every 5 minutes
        this.updateWeather();
        setInterval(() => this.updateWeather(), 300000);

        // Update exchange rates every minute
        this.updateExchangeRates();
        setInterval(() => this.updateExchangeRates(), 60000);

        // Fetch news every 15 minutes
        this.updateNews();
        setInterval(() => this.updateNews(), 900000);

        // Rotate news headlines every 15 seconds
        setInterval(() => this.rotateNews(), 15000);

        // Add exchange rate base currency rotation
        setInterval(() => {
            this.currentBaseIndex = (this.currentBaseIndex + 1) % this.baseCurrencies.length;
            this.updateExchangeRates();
        }, 15000);
    }

    initializeWeatherSearch() {
        let searchTimeout;

        this.weatherSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim();
            
            if (searchTerm.length < 2) {
                this.cityList.innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(() => this.searchCities(searchTerm), 500);
        });

        // Close city list when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.weather-search-container')) {
                this.cityList.innerHTML = '';
            }
        });
    }

    async searchCities(query) {
        try {
            const response = await fetch(
                `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${this.weatherApiKey}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch cities');
            
            const cities = await response.json();
            this.cityList.innerHTML = '';

            cities.forEach(city => {
                const cityElement = document.createElement('div');
                cityElement.className = 'city-item';
                cityElement.innerHTML = `${city.name}, ${city.country}`;
                
                cityElement.addEventListener('click', () => {
                    this.selectedCity = {
                        name: city.name,
                        lat: city.lat,
                        lon: city.lon
                    };
                    this.weatherSearch.value = `${city.name}, ${city.country}`;
                    this.cityList.innerHTML = '';
                    this.updateWeather();
                });

                this.cityList.appendChild(cityElement);
            });
        } catch (error) {
            console.error('Error searching cities:', error);
        }
    }

    async updateWeather() {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?` +
                `lat=${this.selectedCity.lat}&lon=${this.selectedCity.lon}&` +
                `appid=${this.weatherApiKey}&units=metric`
            );

            if (!response.ok) throw new Error('Failed to fetch weather');

            const data = await response.json();
            
            const weatherContainer = document.querySelector('.weather-info');
            weatherContainer.innerHTML = `
                <div class="weather-header">
                    <h4>${this.selectedCity.name}</h4>
                    <img 
                        src="http://openweathermap.org/img/w/${data.weather[0].icon}.png" 
                        alt="${data.weather[0].description}"
                        class="weather-icon"
                    >
                </div>
                <div class="temperature">${Math.round(data.main.temp)}°C</div>
                <div class="weather-details">
                    <p>${data.weather[0].description}</p>
                    <p>Humidity: ${data.main.humidity}%</p>
                    <p>Wind: ${Math.round(data.wind.speed * 3.6)} km/h</p>
                </div>
            `;
        } catch (error) {
            console.error('Error updating weather:', error);
            const weatherContainer = document.querySelector('.weather-info');
            weatherContainer.innerHTML = `
                <div class="weather-error">
                    <p>Unable to load weather</p>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    async updateExchangeRates() {
        try {
            const baseCurrency = this.baseCurrencies[this.currentBaseIndex];
            const targetCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].filter(
                currency => currency !== baseCurrency
            );

            const pairs = targetCurrencies.map(target => ({
                base: baseCurrency,
                target: target
            }));

            const ratesContainer = document.querySelector('.exchange-rates');
            
            // Add fade-out effect before updating
            ratesContainer.classList.add('fade-out');
            
            // Wait for fade-out animation
            await new Promise(resolve => setTimeout(resolve, 300));
            
            ratesContainer.innerHTML = '';

            for (const pair of pairs) {
                const url = `https://v6.exchangerate-api.com/v6/${this.apiKey}/pair/${pair.base}/${pair.target}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch exchange rate');
                }

                const data = await response.json();
                
                if (data.result === "success") {
                    const rate = data.conversion_rate;
                    
                    const rateElement = document.createElement('div');
                    rateElement.className = 'rate';
                    rateElement.innerHTML = `
                        <span>${pair.base}/${pair.target}:</span>
                        <span class="rate-value">${rate.toFixed(4)}</span>
                    `;
                    ratesContainer.appendChild(rateElement);
                }
            }

            // Remove fade-out and add fade-in
            ratesContainer.classList.remove('fade-out');
            ratesContainer.classList.add('fade-in');
            
            // Remove fade-in class after animation completes
            setTimeout(() => {
                ratesContainer.classList.remove('fade-in');
            }, 500);

        } catch (error) {
            console.error('Error updating exchange rates:', error);
            this.exchangeRates.forEach(rate => {
                rate.textContent = 'Error';
            });
        }
    }

    async updateNews() {
        try {
            const url = `https://api.currentsapi.services/v1/latest-news?` + 
                       `language=en&` +
                       `apiKey=${this.newsApiKey}&` +
                       `category=travel&` +
                       `keywords=travel,tourism,vacation,destination&` +
                       `limit=15`; // Get more articles for rotation
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch news');
            }

            const data = await response.json();
            
            if (data.status === "ok" && data.news) {
                // Store filtered travel news for rotation
                this.allNews = data.news
                    .filter(article => 
                        article.title.toLowerCase().includes('travel') ||
                        article.description.toLowerCase().includes('travel') ||
                        article.title.toLowerCase().includes('tourism') ||
                        article.description.toLowerCase().includes('tourism')
                    );

                // Display initial set of news
                this.rotateNews();
            }
        } catch (error) {
            console.error('Error updating news:', error);
            const newsContainer = document.querySelector('.news-list');
            newsContainer.innerHTML = `
                <div class="news-item">
                    <h4>Unable to load travel news</h4>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }

    rotateNews() {
        if (!this.allNews.length) return;

        const newsContainer = document.querySelector('.news-list');
        newsContainer.innerHTML = '';

        // Get 2 random articles
        const selectedNews = [];
        const availableIndices = Array.from(Array(this.allNews.length).keys());

        for (let i = 0; i < Math.min(2, this.allNews.length); i++) {
            const randomIndex = Math.floor(Math.random() * availableIndices.length);
            const articleIndex = availableIndices.splice(randomIndex, 1)[0];
            selectedNews.push(this.allNews[articleIndex]);
        }

        // Display selected news with fade effect
        selectedNews.forEach(article => {
            const publishDate = new Date(article.published);
            const formattedDate = publishDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            const newsElement = document.createElement('div');
            newsElement.className = 'news-item fade-in';
            newsElement.innerHTML = `
                <a href="${article.url}" target="_blank" class="news-link">
                    <div class="news-header">
                        <h4>${article.title}</h4>
                        <span class="news-date">${formattedDate}</span>
                    </div>
                    <p>${article.description ? article.description.substring(0, 100) + '...' : ''}</p>
                </a>
            `;
            newsContainer.appendChild(newsElement);
        });

        // Add placeholder if we have fewer than 2 articles
        if (selectedNews.length < 2) {
            const remainingSlots = 2 - selectedNews.length;
            for (let i = 0; i < remainingSlots; i++) {
                const placeholderElement = document.createElement('div');
                placeholderElement.className = 'news-item fade-in';
                placeholderElement.innerHTML = `
                    <div class="news-link">
                        <div class="news-header">
                            <h4>More travel news coming soon...</h4>
                        </div>
                        <p>Check back later for updates</p>
                    </div>
                `;
                newsContainer.appendChild(placeholderElement);
            }
        }
    }
}

// Initialize the info cards when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new InfoCards();
}); 