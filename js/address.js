// Address autocomplete using OpenStreetMap Nominatim API
// This replaces Google Maps Places API with a free, open-source alternative

var autocompleteResults = [];
var currentUserLocation = null;
var debounceTimer = null;
var autocompleteDropdown = null;

// Initialize the autocomplete functionality
function initialize() {
  var addressInput = document.getElementById('address-search');
  if (!addressInput) return;

  // Hide address fields initially
  for (var component in componentForm) {
    var element = document.getElementById(component);
    if (element) {
      element.style.display = 'none';
      element.disabled = true;
    }
  }

  // Create autocomplete dropdown
  createAutocompleteDropdown();

  // Add event listeners
  addressInput.addEventListener('input', handleInput);
  addressInput.addEventListener('keydown', handleKeyDown);
  addressInput.addEventListener('blur', function() {
    // Delay hiding dropdown to allow click events
    setTimeout(function() {
      hideAutocompleteDropdown();
    }, 200);
  });

  // Get user location for biasing results to Australia
  geolocate();
}

// Create the autocomplete dropdown element
function createAutocompleteDropdown() {
  var addressInput = document.getElementById('address-search');
  if (!addressInput) return;

  autocompleteDropdown = document.createElement('div');
  autocompleteDropdown.id = 'autocomplete-dropdown';
  autocompleteDropdown.className = 'autocomplete-dropdown';
  addressInput.parentNode.appendChild(autocompleteDropdown);
}

// Show autocomplete dropdown
function showAutocompleteDropdown() {
  if (autocompleteDropdown) {
    autocompleteDropdown.style.display = 'block';
  }
}

// Hide autocomplete dropdown
function hideAutocompleteDropdown() {
  if (autocompleteDropdown) {
    autocompleteDropdown.style.display = 'none';
  }
}

// Handle input changes with debouncing
function handleInput(event) {
  var query = event.target.value.trim();
  
  // Clear previous timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // If query is too short, hide dropdown
  if (query.length < 3) {
    hideAutocompleteDropdown();
    return;
  }

  // Debounce API calls
  debounceTimer = setTimeout(function() {
    searchAddresses(query);
  }, 300);
}

// Handle keyboard navigation
function handleKeyDown(event) {
  var items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  var selectedItem = autocompleteDropdown.querySelector('.autocomplete-item.selected');
  var selectedIndex = -1;

  if (selectedItem) {
    selectedIndex = Array.from(items).indexOf(selectedItem);
  }

  switch(event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      selectAutocompleteItem(items[selectedIndex]);
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
      selectAutocompleteItem(items[selectedIndex]);
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedItem) {
        selectAddress(selectedItem.dataset.index);
      }
      break;
    case 'Escape':
      hideAutocompleteDropdown();
      break;
  }
}

// Select an autocomplete item visually
function selectAutocompleteItem(item) {
  var items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  items.forEach(function(i) { i.classList.remove('selected'); });
  if (item) {
    item.classList.add('selected');
    item.scrollIntoView({ block: 'nearest' });
  }
}

// Search addresses using Nominatim API
function searchAddresses(query) {
  // Build Nominatim API URL
  // Restrict to Australia and limit results
  var url = 'https://nominatim.openstreetmap.org/search?';
  var params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'au', // Restrict to Australia
    'accept-language': 'en'
  });

  // Add location bias if available
  if (currentUserLocation) {
    params.append('viewbox', 
      (currentUserLocation.lon - 1) + ',' + 
      (currentUserLocation.lat - 1) + ',' + 
      (currentUserLocation.lon + 1) + ',' + 
      (currentUserLocation.lat + 1));
    params.append('bounded', '1');
  }

  // Make API request
  // Note: Browsers don't allow custom User-Agent headers, but Nominatim
  // will identify the request from the Referer header when hosted on S3
  fetch(url + params.toString(), {
    method: 'GET',
    mode: 'cors'
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(function(data) {
    autocompleteResults = data;
    displayAutocompleteResults(data);
  })
  .catch(function(error) {
    console.error('Error fetching addresses:', error);
    hideAutocompleteDropdown();
  });
}

// Display autocomplete results
function displayAutocompleteResults(results) {
  if (!autocompleteDropdown || results.length === 0) {
    hideAutocompleteDropdown();
    return;
  }

  autocompleteDropdown.innerHTML = '';
  
  results.forEach(function(result, index) {
    var item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.dataset.index = index;
    item.textContent = result.display_name;
    item.addEventListener('click', function() {
      selectAddress(index);
    });
    item.addEventListener('mouseenter', function() {
      selectAutocompleteItem(item);
    });
    autocompleteDropdown.appendChild(item);
  });

  showAutocompleteDropdown();
}

// Select an address and fill the form
function selectAddress(index) {
  if (index < 0 || index >= autocompleteResults.length) return;

  var result = autocompleteResults[index];
  var address = result.address || {};

  // Show and enable all address fields
  for (var component in componentForm) {
    var element = document.getElementById(component);
    if (element) {
      element.style.display = 'block';
      element.disabled = false;
      element.value = '';
    }
  }

  // Map Nominatim address components to form fields
  // Nominatim uses different field names than Google Places
  var streetNumber = address.house_number || '';
  var streetName = address.road || '';
  var suburb = address.suburb || address.city_district || address.town || address.village || '';
  var state = address.state || '';
  var postcode = address.postcode || '';

  // Fill in the form fields
  var streetNumberEl = document.getElementById('street_number');
  var routeEl = document.getElementById('route');
  var localityEl = document.getElementById('locality');
  var stateEl = document.getElementById('administrative_area_level_1');
  var postcodeEl = document.getElementById('postal_code');

  if (streetNumberEl) streetNumberEl.value = streetNumber;
  if (routeEl) routeEl.value = streetName;
  if (localityEl) localityEl.value = suburb;
  if (stateEl) stateEl.value = state;
  if (postcodeEl) postcodeEl.value = postcode;

  // Update the search input with the selected address
  var addressInput = document.getElementById('address-search');
  if (addressInput) {
    addressInput.value = result.display_name;
  }

  hideAutocompleteDropdown();
}

// Geolocate user for biasing search results
function geolocate() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        currentUserLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
      },
      function(error) {
        console.log('Geolocation not available or denied:', error);
        // Default to Australia center if geolocation fails
        currentUserLocation = {
          lat: -25.2744,
          lon: 133.7751
        };
      }
    );
  } else {
    // Default to Australia center if geolocation not supported
    currentUserLocation = {
      lat: -25.2744,
      lon: 133.7751
    };
  }
}

// Component form mapping (kept for compatibility)
var componentForm = {
  street_number: 'short_name',
  route: 'long_name',
  locality: 'long_name',
  administrative_area_level_1: 'short_name',
  postal_code: 'short_name'
};

// Initialize on page load
window.onload = function() {
  initialize();
};
