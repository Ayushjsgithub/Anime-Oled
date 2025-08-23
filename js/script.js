/* ─── CONFIG ─────────────────────────────────────────────────
 *  All available categories for SFW and NSFW modes.
 *  Source: https://docs.waifu.im/docs/tags
 * ─────────────────────────────────────────────────────────── */
const categories = {
    sfw: [
        { id: 'waifu', name: 'Waifu', api: 'waifu.im', tag: 'waifu' },
        { id: 'maid', name: 'Maid', api: 'waifu.im', tag: 'maid' },
        { id: 'uniform', name: 'Uniform', api: 'waifu.im', tag: 'uniform' },
        { id: 'selfies', name: 'Selfies', api: 'waifu.im', tag: 'selfies' },
        { id: 'genshin', name: 'Genshin', api: 'waifu.im', tag: 'genshin-impact' },
        { id: 'rem', name: 'Rem', api: 'waifu.im', tag: 'rem' },
        { id: 'nekos_catgirl', name: 'Catgirl (Nekos)', api: 'nekos.best', tag: 'neko' },
        { id: 'nekos_foxgirl', name: 'Foxgirl (Nekos)', api: 'nekos.best', tag: 'kitsune' },
        { id: 'nekos_random', name: 'Random (Nekos)', api: 'nekos.best', tag: 'waifu' }
    ],
    nsfw: [
        { id: 'ero', name: 'Ero', api: 'waifu.im', tag: 'ero' },
        { id: 'ecchi', name: 'Ecchi', api: 'waifu.im', tag: 'ecchi' },
        { id: 'oppai', name: 'Oppai', api: 'waifu.im', tag: 'oppai' },
        { id: 'hentai', name: 'Hentai', api: 'waifu.im', tag: 'hentai' },
        { id: 'milf', name: 'Milf', api: 'waifu.im', tag: 'milf' },
        { id: 'ass', name: 'Ass', api: 'waifu.im', tag: 'ass' },
        { id: 'nekos_catgirl', name: 'Catgirl (Nekos)', api: 'nekos.best', tag: 'neko' },
        { id: 'nekos_foxgirl', name: 'Foxgirl (Nekos)', api: 'nekos.best', tag: 'kitsune' },
        { id: 'nekos_random', name: 'Random (Nekos)', api: 'nekos.best', tag: 'waifu' }
    ]
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

const drawer            = document.getElementById('drawer');
const drawerBackdrop    = document.getElementById('drawer-backdrop');
const drawerToggle      = document.getElementById('drawer-toggle');
const drawerClose       = document.getElementById('drawer-close');

const dropdownTrigger    = document.getElementById('dropdown-trigger');
const dropdownPopover    = document.getElementById('dropdown-popover');
const categoryGrid       = document.getElementById('category-grid');
const selectedCategoryText = document.getElementById('selected-category');
const customSearchInput  = document.getElementById('custom-search');

const typeToggle         = document.getElementById('type-toggle');
const modeToggle         = document.getElementById('mode-toggle');
const groupCategory      = document.getElementById('group-category');
const groupSearch        = document.getElementById('group-search');

const findBtn            = document.getElementById('find-btn');
const downloadBtn        = document.getElementById('download-btn');
const loader             = document.getElementById('loader');
const placeholder        = document.getElementById('placeholder');
const sfwLabel           = document.querySelector('.toggle-label.sfw');
const nsfwLabel          = document.querySelector('.toggle-label.nsfw');
const modeCatLabel       = document.querySelector('.toggle-label.mode-cat');
const modeSearchLabel    = document.querySelector('.toggle-label.mode-search');

/* ─── STATE ──────────────────────────────────────────────────
 *  Maintains the fetched collection and active navigation state.
 * ─────────────────────────────────────────────────────────── */
let imageUrls        = [];      // Array of fetched image URLs
let currentIndex     = 0;       // Active image index
let selectedCategory = categories.sfw[0]; // Active category object

/* ─── DROPDOWN ───────────────────────────────────────────────
 *  Builds the category grid based on active content type.
 * ─────────────────────────────────────────────────────────── */
function populateCategories() {
    const type = typeToggle.checked ? 'nsfw' : 'sfw';
    categoryGrid.innerHTML = ''; 

    if (!categories[type].find(c => c.id === selectedCategory.id)) {
        selectedCategory = categories[type][0];
    }

    selectedCategoryText.textContent = selectedCategory.name;

    categories[type].forEach(cat => {
        const item = document.createElement('div');
        item.className = `category-item ${cat.id === selectedCategory.id ? 'selected' : ''}`;
        item.textContent = cat.name;
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
    document.querySelectorAll('#category-grid .category-item').forEach(item => {
        item.classList.toggle('selected', item.textContent === selectedCategory.name);
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
 *  Uses the selected API to fetch up to 30 images at once.
 * ─────────────────────────────────────────────────────────── */
async function getAnime() {
    let apiUrl = '';
    let isCustomSearch = modeToggle && modeToggle.checked;
    
    if (isCustomSearch) {
        if (!customSearchInput || customSearchInput.value.trim() === '') {
            alert('Please enter an anime name or tag to search.');
            return;
        }
        const searchValue = customSearchInput.value.trim().replace(/\s+/g, '_');
        const ratingTag = typeToggle.checked ? '-rating:g' : 'rating:g';
        apiUrl = `https://danbooru.donmai.us/posts.json?tags=*${encodeURIComponent(searchValue)}*+${ratingTag}&limit=100`;
    } else if (selectedCategory.api === 'nekos.best') {
        apiUrl = `https://nekos.best/api/v2/${selectedCategory.tag}?amount=20`;
    } else {
        const isNsfw = typeToggle.checked ? 'True' : 'False';
        apiUrl = `https://api.waifu.im/images?IncludedTags=${selectedCategory.tag}&IsNsfw=${isNsfw}&PageSize=30`;
    }

    console.debug(`[API] Fetching collection: ${apiUrl}`);
    
    // Lock UI and show loader
    findBtn.disabled = true;
    // const originalBtnText = findBtn.textContent;
    // findBtn.textContent = 'Gathering...';
    loader.classList.remove('hidden');
    placeholder.classList.add('hidden');
    carouselViewport.classList.add('hidden');
    thumbnailArea.classList.add('hidden');
    downloadBtn.disabled = true;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        let fetchedUrls = [];
        if (isCustomSearch && Array.isArray(data) && data.length > 0) {
            // Filter out items that might not have a file_url (e.g. banned/deleted posts)
            fetchedUrls = data.filter(item => item.file_url).map(item => item.file_url);
        } else if (selectedCategory.api === 'nekos.best' && data.results && data.results.length > 0) {
            fetchedUrls = data.results.map(item => item.url);
        } else if (selectedCategory.api === 'waifu.im' && data.items && data.items.length > 0) {
            fetchedUrls = data.items.map(item => item.url);
        }

        // Randomize custom search results so it doesn't show the same images every time
        if (isCustomSearch && fetchedUrls.length > 0) {
            fetchedUrls = fetchedUrls.sort(() => 0.5 - Math.random()).slice(0, 30);
        }

        if (fetchedUrls.length > 0) {
            imageUrls = fetchedUrls;
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
                    // findBtn.textContent = originalBtnText;
                    console.debug('[Carousel] Ready with', imageUrls.length, 'images');
                };

                if (firstImg.complete) revealUI();
                else firstImg.onload = revealUI;
            }
        } else {
            throw new Error('Empty response from API or no images found');
        }
    } catch (error) {
        console.error('[API] Error:', error);
        alert('Failed to fetch images. Please try again.');
        findBtn.disabled = false;
        // findBtn.textContent = originalBtnText;
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

    const triggerDownload = (blob) => {
        // Gating: Only download if it's actually an image
        if (!blob.type.startsWith('image/')) {
            throw new Error('Not an image response');
        }

        // Detect extension from the URL (e.g., .jpg, .png, .gif) for maximum accuracy
        let ext = url.split('.').pop().toLowerCase();
        if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            ext = blob.type.split('/')[1] || 'png';
        }
        if (ext === 'jpeg') ext = 'jpg';

        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `anime_${selectedCategory.id}_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
            downloadBtn.disabled = false;
        }, 100);
    };

    try {
        const resp = await fetch(url, { mode: 'cors' });
        if (!resp.ok) throw new Error('Direct fetch failed');
        const blob = await resp.blob();
        triggerDownload(blob);
    } catch (err) {
        console.warn(`[Download] Direct fetch failed: ${err.message}. Retrying via proxy...`);
        const proxyUrl = `https://api.cors.lol/?url=${encodeURIComponent(url)}`;
        try {
            const resp = await fetch(proxyUrl);
            if (!resp.ok) throw new Error('Proxy fetch failed');
            const blob = await resp.blob();
            triggerDownload(blob);
        } catch (error) {
            console.error('[Download] All methods failed. Falling back to new tab:', error);
            window.open(url, '_blank');
            downloadBtn.disabled = false;
        }
    }
}

/* ─── EVENT LISTENERS ──────────────────────────────────────── */
if (drawerToggle) {
    drawerToggle.addEventListener('click', () => {
        drawer.classList.toggle('open');
        drawerBackdrop.classList.toggle('open');
    });
}
if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', () => {
        drawer.classList.remove('open');
        drawerBackdrop.classList.remove('open');
    });
}
if (drawerClose) {
    drawerClose.addEventListener('click', () => {
        drawer.classList.remove('open');
        drawerBackdrop.classList.remove('open');
    });
}

typeToggle.addEventListener('change', populateCategories);

if (modeToggle) {
    modeToggle.addEventListener('change', () => {
        if (modeToggle.checked) {
            groupCategory.classList.add('hidden');
            groupSearch.classList.remove('hidden');
            modeSearchLabel.classList.add('active');
            modeCatLabel.classList.remove('active');
            // optionally focus the search input
            customSearchInput.focus();
        } else {
            groupSearch.classList.add('hidden');
            groupCategory.classList.remove('hidden');
            modeCatLabel.classList.add('active');
            modeSearchLabel.classList.remove('active');
        }
    });
}

findBtn.addEventListener('click', getAnime);
downloadBtn.addEventListener('click', downloadImage);

if (customSearchInput) {
    customSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            getAnime();
        }
    });
}

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