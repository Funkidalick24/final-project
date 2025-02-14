class FlightSearch {
    constructor() {
        this.form = document.getElementById('flightSearchForm');
        this.resultsContainer = document.getElementById('searchResults');
        this.swapBtn = document.getElementById('swapAirports');
        this.fromInput = document.getElementById('fromAirport');
        this.toInput = document.getElementById('toAirport');
        this.departDate = document.getElementById('departDate');
        
        // Add dropdown containers
        this.fromDropdown = document.createElement('div');
        this.toDropdown = document.createElement('div');
        this.fromDropdown.className = 'airport-dropdown';
        this.toDropdown.className = 'airport-dropdown';
        this.fromInput.parentNode.insertBefore(this.fromDropdown, this.fromInput.nextSibling);
        this.toInput.parentNode.insertBefore(this.toDropdown, this.toInput.nextSibling);
        
        this.config = {
            apiEndpoint: 'https://sky-scrapper.p.rapidapi.com/api/v2/flights/searchFlightsComplete',
            airportDataPath: '../json/airports.json',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-rapidapi-ua': 'RapidAPI-Playground',
                'x-rapidapi-key': 'afbba5b9f4mshb703ccb8c024495p1b99e8jsn3b425c0a67e3',
                'x-rapidapi-host': 'sky-scrapper.p.rapidapi.com'
            }
        };
        this.resultsPerPage = 15;
        this.currentPage = 1;
        this.allFlights = [];
        this.offset = 0;
        this.limit = 100;
        
        // Add debounce to prevent too many API calls
        this.debounceTimeout = null;
        
        // Initialize cache for recent searches
        this.airportCache = new Map();
        this.recentSearches = new Set();
        
        // Load cached searches from localStorage
        this.loadCachedSearches();
        
        // Store airports data
        this.airports = [];
        this.loadAirportsData();
        
        this.initializeForm();
    }

    initializeForm() {
        // Set minimum dates to today
        const today = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow booking up to 1 year ahead

        const todayStr = today.toISOString().split('T')[0];
        const maxDateStr = maxDate.toISOString().split('T')[0];

        // Set min/max for departure date
        this.departDate.min = todayStr;
        this.departDate.max = maxDateStr;
        
        // Initialize other event listeners
        this.form.addEventListener('submit', (e) => this.handleSearch(e));
        this.swapBtn.addEventListener('click', () => this.swapAirports());

        // Add airport search functionality
        this.fromInput.addEventListener('input', (e) => this.handleAirportSearch(e, this.fromDropdown));
        this.toInput.addEventListener('input', (e) => this.handleAirportSearch(e, this.toDropdown));
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.airport-input-container')) {
                this.fromDropdown.style.display = 'none';
                this.toDropdown.style.display = 'none';
            }
        });
    }

    swapAirports() {
        const temp = this.fromInput.value;
        this.fromInput.value = this.toInput.value;
        this.toInput.value = temp;
    }

    async handleSearch(e) {
        e.preventDefault();
        
        if (!this.validateAirports()) {
            this.showError(this.resultsContainer, 'Please select valid airports from the dropdown.');
            return;
        }

        const formData = {
            from: this.fromInput.dataset.iata,
            to: this.toInput.dataset.iata,
            date: this.departDate.value,
            adult: document.getElementById('passengers').value,
            type: document.getElementById('cabinClass').value,
            currency: document.getElementById('currency').value
        };

        this.showLoadingState();

        try {
            const flights = await this.searchFlights(formData);
            this.displayResults(flights);
        } catch (error) {
            console.error('Error searching flights:', error);
            this.showError('Unable to search flights. Please try again later.');
        }
    }

    async searchFlights(params) {
        try {
            // Build query parameters
            const queryParams = new URLSearchParams({
                originSkyId: params.from,
                destinationSkyId: params.to,
                date: params.date,
                cabinClass: params.type?.toLowerCase() || 'economy',
                adults: params.adult || '1',
                sortBy: 'best',
                currency: params.currency || 'USD',
                market: 'en-US',
                countryCode: 'US'
            });

            const response = await fetch(`${this.config.apiEndpoint}?${queryParams}`, {
                method: 'GET',
                headers: this.config.headers,
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'API Error');
            }
            
            return this.transformResponse(data);
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    transformResponse(data) {
        return {
            data: data.itineraries?.map(itinerary => {
                const leg = itinerary.legs[0];
                const segment = leg.segments[0];
                const carrier = leg.carriers.marketing[0];
                
                return {
                    id: itinerary.id,
                    airline: {
                        name: carrier.name,
                        iata: carrier.alternateId,
                        logo: carrier.logoUrl
                    },
                    flight: {
                        iata: segment.flightNumber
                    },
                    departure: {
                        scheduled: leg.departure,
                        iata: leg.origin.displayCode,
                        terminal: segment?.origin?.terminal,
                        city: leg.origin.city
                    },
                    arrival: {
                        scheduled: leg.arrival,
                        iata: leg.destination.displayCode,
                        terminal: segment?.destination?.terminal,
                        city: leg.destination.city
                    },
                    flight_status: 'scheduled',
                    price: {
                        amount: parseFloat(itinerary.price.raw),
                        currency: itinerary.price.currency || 'USD',
                        formatted: itinerary.price.formatted
                    },
                    stops: leg.stopCount,
                    duration: leg.durationInMinutes,
                    eco: itinerary.eco
                };
            }) || []
        };
    }

    showLoadingState() {
        this.resultsContainer.innerHTML = `
            <div class="loading">
                <p>Searching for flights...</p>
            </div>
        `;
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="error">
                <p>${message}</p>
                ${message.includes('cors-anywhere.herokuapp.com/corsdemo') ? `
                    <p>
                        <strong>Important:</strong> You need to enable CORS access first:
                        <ol>
                            <li>Click the button below</li>
                            <li>Click "Request temporary access to the demo server"</li>
                            <li>Return here and try your search again</li>
                        </ol>
                        <a href="https://cors-anywhere.herokuapp.com/corsdemo" 
                           target="_blank" 
                           class="enable-cors-btn">
                            Enable CORS Access
                        </a>
                    </p>
                ` : ''}
            </div>
        `;
    }

    displayResults(data) {
        if (!data.data || data.data.length === 0) {
            this.showError('No flights found for your search criteria.');
            return;
        }
        this.allFlights = data.data;
        this.currentPage = 1;
        this.renderPage();
    }

    renderPage() {
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = startIndex + this.resultsPerPage;
        const pageFlights = this.allFlights.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.allFlights.length / this.resultsPerPage);

        this.resultsContainer.innerHTML = `
            <div class="flights-list">
                ${pageFlights.map(flight => this.renderFlightCard(flight)).join('')}
            </div>
            ${this.renderPagination(totalPages)}
        `;

        // Add event listeners to pagination buttons
        const paginationButtons = this.resultsContainer.querySelectorAll('.pagination-btn');
        paginationButtons.forEach(button => {
            button.addEventListener('click', () => {
                const page = parseInt(button.dataset.page);
                if (page !== this.currentPage) {
                    this.currentPage = page;
                    this.renderPage();
                    this.resultsContainer.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    renderFlightCard(flight) {
        return `
            <div class="flight-card">
                <div class="airline-info">
                    <img src="${flight.airline.logo}" 
                         alt="${flight.airline.name}" 
                         class="airline-logo">
                    <div class="airline-name">${flight.airline.name}</div>
                </div>
                <div class="flight-details">
                    <div class="route-info">
                        <div class="departure">
                            <div class="time">${new Date(flight.departure.scheduled).toLocaleTimeString()}</div>
                            <div class="airport">${flight.departure.iata}</div>
                            <div class="city">${flight.departure.city}</div>
                        </div>
                        <div class="flight-path">
                            <div class="duration">${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m</div>
                            <div class="stops">${flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
                            <div class="path-line"></div>
                        </div>
                        <div class="arrival">
                            <div class="time">${new Date(flight.arrival.scheduled).toLocaleTimeString()}</div>
                            <div class="airport">${flight.arrival.iata}</div>
                            <div class="city">${flight.arrival.city}</div>
                        </div>
                    </div>
                    <div class="price-info">
                        <div class="status ${flight.flight_status}">${flight.flight_status.toUpperCase()}</div>
                        <div class="price">${flight.price.formatted}</div>
                        ${flight.eco ? `<div class="eco-info">🌱 Eco-friendly option</div>` : ''}
                        <button class="select-btn" data-flight-id="${flight.id}">Select</button>
                    </div>
                </div>
            </div>
        `;
    }

    calculateDuration(departure, arrival) {
        const dep = new Date(departure);
        const arr = new Date(arrival);
        const diff = arr - dep;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }

    renderPagination(totalPages) {
        if (totalPages <= 1) return '';

        let buttons = [];
        const maxVisibleButtons = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisibleButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

        if (endPage - startPage + 1 < maxVisibleButtons) {
            startPage = Math.max(1, endPage - maxVisibleButtons + 1);
        }

        // Previous button
        if (this.currentPage > 1) {
            buttons.push(`
                <button class="pagination-btn prev" data-page="${this.currentPage - 1}">
                    Previous
                </button>
            `);
        }

        // First page
        if (startPage > 1) {
            buttons.push(`
                <button class="pagination-btn" data-page="1">1</button>
                ${startPage > 2 ? '<span class="pagination-ellipsis">...</span>' : ''}
            `);
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(`
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">
                    ${i}
                </button>
            `);
        }

        // Last page
        if (endPage < totalPages) {
            buttons.push(`
                ${endPage < totalPages - 1 ? '<span class="pagination-ellipsis">...</span>' : ''}
                <button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>
            `);
        }

        // Next button
        if (this.currentPage < totalPages) {
            buttons.push(`
                <button class="pagination-btn next" data-page="${this.currentPage + 1}">
                    Next
                </button>
            `);
        }

        // Add load more button if there are more results available
        if (this.offset > 0) {
            buttons.push(`
                <button class="pagination-btn load-more" onclick="flightSearch.loadMoreResults()">
                    Load More Results
                </button>
            `);
        }

        return `
            <div class="pagination">
                ${buttons.join('')}
            </div>
        `;
    }

    // Add method to load more results
    async loadMoreResults() {
        try {
            const formData = {
                date: this.departDate.value,
                status: document.getElementById('flightStatus')?.value
            };
            
            const moreFlights = await this.searchFlights(formData);
            if (moreFlights.data && moreFlights.data.length > 0) {
                this.allFlights = [...this.allFlights, ...moreFlights.data];
                this.renderPage();
            }
        } catch (error) {
            console.error('Error loading more results:', error);
        }
    }

    async handleAirportSearch(e, dropdownElement) {
        const query = e.target.value
            .trim()
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        // Show loading state
        if (query.length >= 2) {
            dropdownElement.innerHTML = `
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <div>Searching airports...</div>
                </div>
            `;
            dropdownElement.style.display = 'block';
        }

        // Clear previous timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        
        // Hide dropdown if query is too short
        if (!query || query.length < 2) {
            dropdownElement.style.display = 'none';
            if (query.length === 0) {
                this.showRecentSearches(dropdownElement, e.target);
            }
            return;
        }

        // Debounce the API call
        this.debounceTimeout = setTimeout(async () => {
            try {
                // Check cache first
                if (this.airportCache.has(query)) {
                    this.showAirportDropdown(this.airportCache.get(query), dropdownElement, e.target);
                    return;
                }

                const airports = await this.searchAirports(query);
                
                // Only cache if we got valid results
                if (airports && airports.length > 0) {
                    this.airportCache.set(query, airports);
                    this.recentSearches.add(query);
                    this.saveCachedSearches();
                }

                this.showAirportDropdown(airports, dropdownElement, e.target);
            } catch (error) {
                console.error('Error searching airports:', error);
                this.showError(dropdownElement, 'Unable to search airports. Please try again.');
            }
        }, 300);
    }
    
    async searchAirports(query) {
        try {
            // Filter airports based on the query
            const filteredAirports = this.airports.filter(airport => {
                const searchTerm = query.toLowerCase();
                return (
                    airport.name.toLowerCase().includes(searchTerm) ||
                    airport.city.toLowerCase().includes(searchTerm) ||
                    airport.country.toLowerCase().includes(searchTerm) ||
                    airport.iata.toLowerCase().includes(searchTerm)
                );
            }).slice(0, 10); // Limit to 10 results

            return filteredAirports;

        } catch (error) {
            console.error('Airport search error:', error);
            return [];
        }
    }
    
    showAirportDropdown(airports, dropdownElement, inputElement) {
        if (!airports.length) {
            dropdownElement.style.display = 'none';
            this.showError(dropdownElement, 'No airports found matching your search.');
            return;
        }

        // Debug log to see the airport data
        console.log('Airports data:', airports);

        const html = airports.map(airport => this.renderAirportOption(airport)).join('');
        dropdownElement.innerHTML = html;
        dropdownElement.style.display = 'block';

        this.addAirportClickHandlers(dropdownElement, inputElement);
    }

    addAirportClickHandlers(dropdownElement, inputElement) {
        dropdownElement.querySelectorAll('.airport-option').forEach(option => {
            option.addEventListener('click', () => {
                inputElement.value = option.dataset.iata;
                inputElement.dataset.skyId = option.dataset.skyId;
                dropdownElement.style.display = 'none';
                inputElement.classList.remove('error');
                this.validateAirports();
            });
        });
    }

    showRecentSearches(dropdownElement, inputElement) {
        if (this.recentSearches.size === 0) return;

        const recentAirports = Array.from(this.recentSearches)
            .flatMap(query => this.airportCache.get(query) || [])
            .slice(0, 5);

        if (recentAirports.length > 0) {
            const html = `
                <div class="recent-searches">
                    <div class="recent-header">Recent Searches</div>
                    ${recentAirports.map(airport => this.renderAirportOption(airport)).join('')}
                </div>
            `;
            dropdownElement.innerHTML = html;
            dropdownElement.style.display = 'block';
            this.addAirportClickHandlers(dropdownElement, inputElement);
        }
    }

    renderAirportOption(airport) {
        const displayName = `${airport.name} (${airport.iata})`;
        
        return `
            <div class="airport-option" data-iata="${airport.iata}">
                <div class="airport-code">${airport.iata}</div>
                <div class="airport-details">
                    <div class="airport-name">${displayName}</div>
                    <div class="airport-location">${airport.city}, ${airport.country}</div>
                </div>
            </div>
        `;
    }

    showError(dropdownElement, message) {
        dropdownElement.innerHTML = `
            <div class="airport-error">
                <div class="error-message">${message}</div>
                ${message.includes('No airports found') ? 
                    '<div class="error-hint">Try entering a city name (e.g., "London" or "New York")</div>' 
                    : ''}
            </div>
        `;
        dropdownElement.style.display = 'block';
    }

    validateAirports() {
        const fromValid = this.fromInput.dataset.iata;
        const toValid = this.toInput.dataset.iata;
        
        this.fromInput.classList.toggle('error', !fromValid);
        this.toInput.classList.toggle('error', !toValid);
        
        const submitBtn = this.form.querySelector('button[type="submit"]');
        submitBtn.disabled = !(fromValid && toValid);
        
        return fromValid && toValid;
    }

    loadCachedSearches() {
        try {
            const cached = localStorage.getItem('recentAirports');
            if (cached) {
                const { searches, timestamp } = JSON.parse(cached);
                // Only use cache if it's less than 24 hours old
                if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                    searches.forEach(search => {
                        this.airportCache.set(search.query, search.results);
                        this.recentSearches.add(search.query);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading cached searches:', error);
        }
    }

    saveCachedSearches() {
        try {
            const searches = Array.from(this.recentSearches).map(query => ({
                query,
                results: this.airportCache.get(query)
            }));
            // Add validation before saving
            const validSearches = searches.filter(search => 
                search.results && 
                search.results.length > 0 && 
                search.results.every(airport => airport.iata && airport.skyId)
            );
            localStorage.setItem('recentAirports', JSON.stringify({
                searches: validSearches,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Error saving cached searches:', error);
        }
    }

    async loadAirportsData() {
        try {
            const response = await fetch(this.config.airportDataPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.airports = await response.json();
            console.log('Airports data loaded:', this.airports.length, 'airports');
        } catch (error) {
            console.error('Error loading airports data:', error);
            this.airports = [];
        }
    }
}

// Initialize the flight search when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new FlightSearch();
}); 