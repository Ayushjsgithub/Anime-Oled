/* ─── CONFIG ─────────────────────────────────────────────────
 *  All available categories for SFW and NSFW modes.
 * ─────────────────────────────────────────────────────────── */
const categories = {
    sfw: ['waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy', 'wink', 'poke', 'dance', 'cringe'],
    nsfw: ['waifu', 'neko', 'trap', 'blowjob']
};

/* ─── DOM REFS ───────────────────────────────────────────────
 *  Cached element references for the dynamic carousel structure.
 * ─────────────────────────────────────────────────────────── */
const carouselViewport  = document.getElementById('carousel-viewport');
const carouselTrack     = document.getElementById('carousel-track');
const thumbnailArea     = document.getElementById('thumbnail-area');
const thumbnailTrack    = document.getElementById('thumbnail-track');
const prevBtn           = document.getElementById('prev-btn');
const nextBtn           = document.getElementById('next-btn');

const dropdownTrigger    = document.getElementById('dropdown-trigger');
const dropdownPopover    = document.getElementById('dropdown-popover');
const categoryGrid       = document.getElementById('category-grid');
const selectedCategoryText = document.getElementById('selected-category');
const typeToggle         = document.getElementById('type-toggle');
const findBtn            = document.getElementById('find-btn');
const downloadBtn        = document.getElementById('download-btn');
const loader             = document.getElementById('loader');
const placeholder        = document.getElementById('placeholder');
const sfwLabel           = document.querySelector('.toggle-label.sfw');
const nsfwLabel          = document.querySelector('.toggle-label.nsfw');

/* ─── STATE ──────────────────────────────────────────────────
 *  Maintains the fetched collection and active navigation state.
 * ─────────────────────────────────────────────────────────── */
let imageUrls        = [];      // Array of fetched image URLs
let currentIndex     = 0;       // Active image index
let selectedCategory = 'waifu'; // Active category selection

/* ─── DROPDOWN ───────────────────────────────────────────────
 *  Builds the category grid based on active content type.
 * ─────────────────────────────────────────────────────────── */
function populateCategories() {
    const type = typeToggle.checked ? 'nsfw' : 'sfw';
    categoryGrid.innerHTML = ''; 

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

    if (type === 'sfw') {
        sfwLabel.classList.add('active');
        nsfwLabel.classList.remove('active');
    } else {
        nsfwLabel.classList.add('active');
        sfwLabel.classList.remove('active');
    }
}

/** Syncs the 'selected' class across all rendered category items. */
function updateSelectionUI() {
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.toggle('selected', item.textContent.toLowerCase() === selectedCategory);
    });
}

/** Opens/closes the category dropdown popover. */
function toggleDropdown() {
    const isHidden = dropdownPopover.classList.toggle('hidden');
    dropdownTrigger.classList.toggle('active');
}

/** Closes and resets the category dropdown to its default state. */
function closeDropdown() {
    dropdownPopover.classList.add('hidden');
    dropdownTrigger.classList.remove('active');
}

/* ─── CAROUSEL LOGIC ─────────────────────────────────────────
 *  Handles the rendering and sliding behavior of the carousel.
 * ─────────────────────────────────────────────────────────── */

/** Injects slides and thumbnails into the DOM based on current state. */
function renderCarousel() {
    carouselTrack.innerHTML = '';
    thumbnailTrack.innerHTML = '';

    // Add Start Spacer to allow centering of first item
    const startSpacer = document.createElement('div');
    startSpacer.className = 'thumb-spacer';
    thumbnailTrack.appendChild(startSpacer);

    imageUrls.forEach((url, index) => {
        // Create Main Slide
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        const img = document.createElement('img');
        img.src = url;
        img.alt = `${selectedCategory} image ${index + 1}`;
        slide.appendChild(img);
        carouselTrack.appendChild(slide);

        // Create Navigation Thumbnail (Dynamic Strip)
        const thumbBtn = document.createElement('button');
        thumbBtn.className = `thumb-btn ${index === 0 ? 'active' : ''}`;
        thumbBtn.type = 'button';
        thumbBtn.setAttribute('aria-label', `Open image ${index + 1}`);
        thumbBtn.innerHTML = `<img src="${url}" alt="Thumbnail ${index + 1}">`;
        thumbBtn.addEventListener('click', () => setCarouselIndex(index));
        thumbnailTrack.appendChild(thumbBtn);
    });

    // Add End Spacer to allow centering of last item
    const endSpacer = document.createElement('div');
    endSpacer.className = 'thumb-spacer';
    thumbnailTrack.appendChild(endSpacer);

    setCarouselIndex(0); 
}

/** 
 * Updates the track position and thumbnail states.
 * Also handles button states and auto-scrolling centering.
 */
function setCarouselIndex(index) {
    if (index < 0 || index >= imageUrls.length) return;
    
    currentIndex = index;

    // Slide the main track
    carouselTrack.style.transform = `translateX(-${index * 100}%)`;

    // Update Thumbnail States (triggers width expansion in CSS)
    const thumbs = document.querySelectorAll('.thumb-btn');
    thumbs.forEach((t, i) => {
        const isActive = i === currentIndex;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    // Update Nav Arrows
    prevBtn.disabled = (currentIndex === 0);
    nextBtn.disabled = (currentIndex === imageUrls.length - 1);

    // Auto-scroll active thumbnail to center of view
    // Using manual scrollTo avoids jumping the entire page
    setTimeout(() => {
        const activeThumb = thumbs[currentIndex];
        if (activeThumb && thumbnailTrack) {
            const trackWidth = thumbnailTrack.offsetWidth;
            const thumbOffset = activeThumb.offsetLeft;
            const thumbWidth = activeThumb.offsetWidth;
            
            // MATH: target = elementCenter - containerCenter
            // thumbOffset is already relative to the track thanks to position:relative in CSS
            const targetScroll = thumbOffset - (trackWidth / 2) + (thumbWidth / 2);
            
            thumbnailTrack.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    }, 50);
}

/* ─── API FETCH ──────────────────────────────────────────────
 *  Uses the 'many' endpoint to fetch up to 30 images at once.
 *  POST https://api.waifu.pics/many/{type}/{category}
 * ─────────────────────────────────────────────────────────── */
async function getAnime() {
    const type = typeToggle.checked ? 'nsfw' : 'sfw';
    const apiUrl = `https://api.waifu.pics/many/${type}/${selectedCategory}`;
    console.debug(`[API] Fetching collection: ${apiUrl}`);
    
    // Lock UI and show loader
    findBtn.disabled = true;
    const originalBtnText = findBtn.textContent;
    findBtn.textContent = 'Gathering...';
    loader.classList.remove('hidden');
    placeholder.classList.add('hidden');
    carouselViewport.classList.add('hidden');
    thumbnailArea.classList.add('hidden');
    downloadBtn.disabled = true;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exclude: [] })
        });
        const data = await response.json();

        if (data.files && data.files.length > 0) {
            imageUrls = data.files;
            currentIndex = 0;
            
            renderCarousel();

            // Reveal thumbnails and UI once the first image is ready
            const firstImg = carouselTrack.querySelector('img');
            if (firstImg) {
                const revealUI = () => {
                    loader.classList.add('hidden');
                    carouselViewport.classList.remove('hidden');
                    thumbnailArea.classList.remove('hidden');
                    downloadBtn.disabled = false;
                    findBtn.disabled = false;
                    findBtn.textContent = originalBtnText;
                    console.debug('[Carousel] Ready with', imageUrls.length, 'images');
                };

                if (firstImg.complete) revealUI();
                else firstImg.onload = revealUI;
            }
        } else {
            throw new Error('Empty response from API');
        }
    } catch (error) {
        console.error('[API] Error:', error);
        alert('Failed to fetch images. Please try again.');
        findBtn.disabled = false;
        findBtn.textContent = originalBtnText;
        loader.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

/* ─── DOWNLOAD ───────────────────────────────────────────────
 *  Downloads the currently active carousel image.
 * ─────────────────────────────────────────────────────────── */
async function downloadImage() {
    const url = imageUrls[currentIndex];
    if (!url || downloadBtn.disabled) return;

    downloadBtn.disabled = true;
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Downloading...';

    const triggerDownload = (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `anime_${selectedCategory}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }, 100);
    };

    try {
        const resp = await fetch(url, { mode: 'cors' });
        if (!resp.ok) throw new Error('Direct fetch failed');
        const blob = await resp.blob();
        triggerDownload(blob);
    } catch {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        try {
            const resp = await fetch(proxyUrl);
            const blob = await resp.blob();
            triggerDownload(blob);
        } catch {
            window.open(url, '_blank');
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        }
    }
}

/* ─── EVENT LISTENERS ──────────────────────────────────────── */
typeToggle.addEventListener('change', populateCategories);
findBtn.addEventListener('click', getAnime);
downloadBtn.addEventListener('click', downloadImage);

prevBtn.addEventListener('click', () => setCarouselIndex(currentIndex - 1));
nextBtn.addEventListener('click', () => setCarouselIndex(currentIndex + 1));

dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
});

document.addEventListener('click', (e) => {
    if (!dropdownPopover.contains(e.target) && !dropdownTrigger.contains(e.target)) {
        closeDropdown();
    }
});

/* ─── INIT ─────────────────────────────────────────────────── */
console.debug('[Init] Anime OLED loaded. Populating categories...');
populateCategories();