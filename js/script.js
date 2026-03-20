const categories = {
    sfw: ['waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy', 'wink', 'poke', 'dance', 'cringe'],
    nsfw: ['waifu', 'neko', 'trap', 'blowjob']
};

const animeImg = document.getElementById('anime-img');
const dropdownTrigger = document.getElementById('dropdown-trigger');
const dropdownPopover = document.getElementById('dropdown-popover');
const categoryGrid = document.getElementById('category-grid');
const selectedCategoryText = document.getElementById('selected-category');
const typeToggle = document.getElementById('type-toggle');
const findBtn = document.getElementById('find-btn');
const downloadBtn = document.getElementById('download-btn');
const loader = document.getElementById('loader');
const placeholder = document.getElementById('placeholder');
const sfwLabel = document.querySelector('.toggle-label.sfw');
const nsfwLabel = document.querySelector('.toggle-label.nsfw');

let currentImageUrl = '';
let selectedCategory = 'waifu';

// Initialize categories
function populateCategories() {
    const type = typeToggle.checked ? 'nsfw' : 'sfw';
    categoryGrid.innerHTML = '';
    
    // Ensure selected category exists in current type
    if (!categories[type].includes(selectedCategory)) {
        selectedCategory = categories[type][0];
    }
    
    selectedCategoryText.textContent = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);

    categories[type].forEach(cat => {
        const item = document.createElement('div');
        item.className = `category-item ${cat === selectedCategory ? 'selected' : ''}`;
        item.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        item.addEventListener('click', () => {
            selectedCategory = cat;
            selectedCategoryText.textContent = item.textContent;
            closeDropdown();
            updateSelectionUI();
        });
        categoryGrid.appendChild(item);
    });

    // Update labels
    if (type === 'sfw') {
        sfwLabel.classList.add('active');
        nsfwLabel.classList.remove('active');
    } else {
        nsfwLabel.classList.add('active');
        sfwLabel.classList.remove('active');
    }
}

function updateSelectionUI() {
    document.querySelectorAll('.category-item').forEach(item => {
        if (item.textContent.toLowerCase() === selectedCategory) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function toggleDropdown() {
    const isHidden = dropdownPopover.classList.toggle('hidden');
    dropdownTrigger.classList.toggle('active');
    dropdownTrigger.setAttribute('aria-expanded', !isHidden);
}

function closeDropdown() {
    dropdownPopover.classList.add('hidden');
    dropdownTrigger.classList.remove('active');
    dropdownTrigger.setAttribute('aria-expanded', 'false');
}

async function getAnime() {
    const type = typeToggle.checked ? 'nsfw' : 'sfw';
    
    // UI state
    findBtn.disabled = true;
    const originalBtnText = findBtn.textContent;
    findBtn.textContent = 'Searching...';
    
    loader.classList.remove('hidden');
    placeholder.classList.add('hidden');
    animeImg.classList.add('hidden');
    downloadBtn.disabled = true;

    try {
        const response = await fetch(`https://api.waifu.pics/${type}/${selectedCategory}`);
        const data = await response.json();
        
        if (data.url) {
            currentImageUrl = data.url;
            animeImg.src = data.url;
            animeImg.alt = `${selectedCategory} - Anime AMOLED`;
            
            // Wait for image to load before showing
            animeImg.onload = () => {
                loader.classList.add('hidden');
                animeImg.classList.remove('hidden');
                downloadBtn.disabled = false;
                findBtn.disabled = false;
                findBtn.textContent = originalBtnText;
            };
        }
    } catch (error) {
        console.error('Error fetching image:', error);
        alert('Failed to fetch image. Please try again.');
        findBtn.disabled = false;
        findBtn.textContent = originalBtnText;
        loader.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

async function downloadImage() {
    if (!currentImageUrl || downloadBtn.disabled) return;

    // UI Feedback
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Downloading...';
    downloadBtn.disabled = true;

    const cleanup = () => {
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    };

    try {
        const response = await fetch(currentImageUrl, {
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const filename = `anime_${selectedCategory}_${Date.now()}.png`;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            cleanup();
        }, 100);

    } catch (error) {
        console.error('Download failed:', error);
        
        const confirmFallback = confirm('Direct download blocked by browser security. Would you like to open the image in a new tab to save it manually?');
        if (confirmFallback) {
            window.open(currentImageUrl, '_blank');
        }
        
        cleanup();
    }
}

// Event Listeners
typeToggle.addEventListener('change', populateCategories);
findBtn.addEventListener('click', getAnime);
downloadBtn.addEventListener('click', downloadImage);
dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!dropdownPopover.contains(e.target) && !dropdownTrigger.contains(e.target)) {
        closeDropdown();
    }
});

// Initial load
populateCategories();