class CurrencyConverter {
    constructor() {
        this.amount = document.getElementById('amount');
        this.fromCurrency = document.getElementById('fromCurrency');
        this.toCurrency = document.getElementById('toCurrency');
        this.convertBtn = document.getElementById('convertBtn');
        this.swapBtn = document.getElementById('swapCurrency');
        this.conversionRate = document.getElementById('conversionRate');
        this.convertedAmount = document.getElementById('convertedAmount');
        this.dateDisplay = document.getElementById('conversionDate');
        
        this.apiKey = '701b3495d95b3364ae51b82c';
        
        // Currency data
        this.currencies = {
            "USD": "United States Dollar",
            "EUR": "Euro",
            "GBP": "British Pound",
            "JPY": "Japanese Yen",
            "AUD": "Australian Dollar",
            "CAD": "Canadian Dollar",
            "CHF": "Swiss Franc",
            "CNY": "Chinese Renminbi",
            "HKD": "Hong Kong Dollar",
            "NZD": "New Zealand Dollar",
            "SEK": "Swedish Krona",
            "KRW": "South Korean Won",
            "SGD": "Singapore Dollar",
            "NOK": "Norwegian Krone",
            "MXN": "Mexican Peso",
            "INR": "Indian Rupee",
            "RUB": "Russian Ruble",
            "ZAR": "South African Rand",
            "TRY": "Turkish Lira",
            "BRL": "Brazilian Real",
            // Add more currencies as needed
        };
        
        this.initializeCurrencyDropdowns();
        this.initializeEventListeners();
        this.updateDate();
    }

    initializeCurrencyDropdowns() {
        // Clear existing options
        this.fromCurrency.innerHTML = '';
        this.toCurrency.innerHTML = '';

        // Add options to both dropdowns
        Object.entries(this.currencies).forEach(([code, name]) => {
            const fromOption = new Option(`${code} - ${name}`, code);
            const toOption = new Option(`${code} - ${name}`, code);
            
            this.fromCurrency.add(fromOption);
            this.toCurrency.add(toOption);
        });

        // Set default selections
        this.fromCurrency.value = 'USD';
        this.toCurrency.value = 'EUR';
    }

    initializeEventListeners() {
        this.convertBtn.addEventListener('click', () => this.convertCurrency());
        this.swapBtn.addEventListener('click', () => this.swapCurrencies());
        
        this.fromCurrency.addEventListener('change', () => this.convertCurrency());
        this.toCurrency.addEventListener('change', () => this.convertCurrency());
    }

    updateDate() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        this.dateDisplay.textContent = formattedDate;
    }

    swapCurrencies() {
        const temp = this.fromCurrency.value;
        this.fromCurrency.value = this.toCurrency.value;
        this.toCurrency.value = temp;
        this.convertCurrency();
    }

    async convertCurrency() {
        try {
            const amount = parseFloat(this.amount.value);
            if (isNaN(amount)) {
                throw new Error('Please enter a valid number');
            }

            const from = this.fromCurrency.value;
            const to = this.toCurrency.value;

            // Show loading state
            this.convertBtn.disabled = true;
            this.convertBtn.textContent = 'Converting...';

            const url = `https://v6.exchangerate-api.com/v6/${this.apiKey}/pair/${from}/${to}`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            if (data.result === "success") {
                const rate = data.conversion_rate;
                const convertedAmount = amount * rate;
                
                // Update conversion rate display
                this.conversionRate.textContent = `${rate.toFixed(4)} ${to}`;
                
                // Update converted amount
                this.convertedAmount.textContent = `${convertedAmount.toFixed(2)} ${to}`;
                
                // Update last updated time from API
                const lastUpdate = new Date(data.time_last_update_utc);
                this.dateDisplay.textContent = lastUpdate.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                throw new Error('Conversion failed');
            }

        } catch (error) {
            console.error('Error:', error);
            this.convertedAmount.textContent = 'Conversion failed';
            this.conversionRate.textContent = '-';
        } finally {
            // Reset button state
            this.convertBtn.disabled = false;
            this.convertBtn.textContent = 'Convert';
        }
    }
}

// Initialize the converter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
}); 