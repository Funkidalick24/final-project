class AttractionsCarousel {
    constructor() {
        this.cardsContainer = document.querySelector('.destination-cards');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.dotsContainer = document.querySelector('.carousel-dots');
        
        this.currentIndex = 0;
        this.cardsPerView = 3;
        this.totalCards = 10;
        
        this.popularCities = [
            'Paris', 'London', 'New York', 'Tokyo', 'Rome',
            'Barcelona', 'Dubai', 'Singapore', 'Amsterdam', 'Sydney'
        ];

        this.tripAdvisorKey = '3A0C6D6B302F48C5B8F4C6D467C03052';
        
        this.initializeCarousel();
    }

    async initializeCarousel() {
        try {
            const attractions = await this.fetchCityAttractions();
            this.renderCards(attractions);
            this.setupNavigation();
            this.createDots();
            this.updateDots();
            
            // Auto-rotate every 5 seconds
            setInterval(() => this.nextSlide(), 5000);
        } catch (error) {
            console.error('Error initializing carousel:', error);
        }
    }

    async fetchCityAttractions() {
        try {
            const cities = [];
            
            for (const cityName of this.popularCities) {
                // First, search for the city location
                const searchResponse = await fetch(`https://api.content.tripadvisor.com/api/v1/locations/search?searchQuery=${cityName}&category=cities`, {
                    headers: {
                        'Accept': 'application/json',
                        'X-TripAdvisor-API-Key': this.tripAdvisorKey
                    }
                });

                if (!searchResponse.ok) throw new Error(`Failed to search for ${cityName}`);
                const searchData = await searchResponse.json();
                
                if (searchData.data && searchData.data.length > 0) {
                    const locationId = searchData.data[0].location_id;
                    
                    // Fetch detailed information about the city
                    const [detailsResponse, photosResponse, reviewsResponse] = await Promise.all([
                        fetch(`https://api.content.tripadvisor.com/api/v1/location/${locationId}`, {
                            headers: {
                                'Accept': 'application/json',
                                'X-TripAdvisor-API-Key': this.tripAdvisorKey
                            }
                        }),
                        fetch(`https://api.content.tripadvisor.com/api/v1/location/${locationId}/photos?limit=1`, {
                            headers: {
                                'Accept': 'application/json',
                                'X-TripAdvisor-API-Key': this.tripAdvisorKey
                            }
                        }),
                        fetch(`https://api.content.tripadvisor.com/api/v1/location/${locationId}/reviews?limit=5`, {
                            headers: {
                                'Accept': 'application/json',
                                'X-TripAdvisor-API-Key': this.tripAdvisorKey
                            }
                        })
                    ]);

                    const [details, photos, reviews] = await Promise.all([
                        detailsResponse.json(),
                        photosResponse.json(),
                        reviewsResponse.json()
                    ]);

                    cities.push({
                        name: details.name,
                        country: details.address_obj.country,
                        photo_url: photos.data[0]?.images?.original?.url || 
                                 `https://source.unsplash.com/800x600/?${cityName.toLowerCase()},city`,
                        rating: details.rating,
                        rating_text: this.getRatingText(details.rating),
                        description: details.description || 
                                   `Discover the magic of ${cityName}, a vibrant city known for its unique culture and landmarks.`,
                        reviews: reviews.data.slice(0, 2).map(review => ({
                            title: review.title,
                            text: review.text,
                            rating: review.rating,
                            date: new Date(review.published_date).toLocaleDateString()
                        }))
                    });
                }
            }

            return cities;
        } catch (error) {
            console.error('Error fetching city attractions:', error);
            return [];
        }
    }

    getRatingText(rating) {
        if (rating >= 4.5) return 'Exceptional';
        if (rating >= 4.0) return 'Excellent';
        if (rating >= 3.5) return 'Very Good';
        if (rating >= 3.0) return 'Good';
        return 'Average';
    }

    renderCards(attractions) {
        this.cardsContainer.innerHTML = attractions.map(attraction => `
            <div class="destination-card">
                <img 
                    src="${attraction.photo_url}" 
                    alt="${attraction.name}"
                    class="destination-image"
                    loading="lazy"
                >
                <div class="destination-info">
                    <h3 class="destination-name">${attraction.name}, ${attraction.country}</h3>
                    <div class="destination-rating">
                        <span class="rating-score">${attraction.rating}</span>
                        <span>${attraction.rating_text}</span>
                    </div>
                    <p class="destination-description">
                        ${attraction.description}
                    </p>
                    ${attraction.reviews ? `
                        <div class="destination-reviews">
                            <h4>Recent Reviews</h4>
                            ${attraction.reviews.map(review => `
                                <div class="review">
                                    <div class="review-header">
                                        <span class="review-rating">${'★'.repeat(Math.round(review.rating))}</span>
                                        <span class="review-date">${review.date}</span>
                                    </div>
                                    <p class="review-title">${review.title}</p>
                                    <p class="review-text">${review.text.substring(0, 100)}...</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    setupNavigation() {
        this.prevBtn.addEventListener('click', () => this.prevSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
    }

    createDots() {
        const totalDots = Math.ceil(this.totalCards / this.cardsPerView);
        this.dotsContainer.innerHTML = Array(totalDots)
            .fill('')
            .map((_, i) => `<div class="dot" data-index="${i}"></div>`)
            .join('');

        this.dotsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('dot')) {
                this.currentIndex = parseInt(e.target.dataset.index);
                this.updateSlide();
            }
        });
    }

    updateDots() {
        const dots = this.dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
        });
    }

    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % Math.ceil(this.totalCards / this.cardsPerView);
        this.updateSlide();
    }

    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + Math.ceil(this.totalCards / this.cardsPerView)) % Math.ceil(this.totalCards / this.cardsPerView);
        this.updateSlide();
    }

    updateSlide() {
        const offset = this.currentIndex * (100 / Math.ceil(this.totalCards / this.cardsPerView));
        this.cardsContainer.style.transform = `translateX(-${offset}%)`;
        this.updateDots();
    }
}

// Initialize the carousel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AttractionsCarousel();
}); 