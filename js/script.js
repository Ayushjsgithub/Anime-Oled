/* ============================================================
 *  Anime OLED — script.js
 *  Fetches random anime images from the waifu.pics public API
 *  and handles SFW/NSFW toggling, category selection, and
 *  direct image download with CORS proxy fallback.
 * ============================================================ */


/* ─── CONFIG ─────────────────────────────────────────────────
 *  All available categories for SFW and NSFW modes.
 *  Source: https://waifu.pics/docs
 * ─────────────────────────────────────────────────────────── */
const categories = {
    sfw: ['waifu', 'neko', 'shinobu', 'megumin', 'bully', 'cuddle', 'cry', 'hug', 'awoo', 'kiss', 'lick', 'pat', 'smug', 'bonk', 'yeet', 'blush', 'smile', 'wave', 'highfive', 'handhold', 'nom', 'bite', 'glomp', 'slap', 'kill', 'kick', 'happy', 'wink', 'poke', 'dance', 'cringe'],
    nsfw: ['waifu', 'neko', 'trap', 'blowjob']
};


/* ─── DOM REFS ───────────────────────────────────────────────
 *  Cached element references — avoids repeated querySelector
 *  calls throughout the app lifecycle.
 * ─────────────────────────────────────────────────────────── */
const animeImg           = document.getElementById('anime-img');
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
 *  Minimal mutable state — keep this small and intentional.
 * ─────────────────────────────────────────────────────────── */
let currentImageUrl  = '';   // URL of the currently displayed image
let selectedCategory = 'waifu'; // Active category selection


/* ─── DROPDOWN ───────────────────────────────────────────────
 *  Builds the category grid based on active content type.
 *  Called on page load and whenever the SFW/NSFW toggle changes.
 * ─────────────────────────────────────────────────────────── */
function populateCategories() {
    const type = typeToggle.checked ? 'nsfw' : 'sfw';
    categoryGrid.innerHTML = ''; // Clear previous items

    // If the previous category doesn't exist in the new type, reset to first
    if (!categories[type].includes(selectedCategory)) {
        selectedCategory = categories[type][0];
        console.debug(`[Category] Reset to "${selectedCategory}" (not available in ${type} mode)`);
    }

    selectedCategoryText.textContent = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);

    // Render each category as a clickable grid item
    categories[type].forEach(cat => {
        const item = document.createElement('div');
        item.className = `category-item ${cat === selectedCategory ? 'selected' : ''}`;
        item.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        item.addEventListener('click', () => {
            selectedCategory = cat;
            selectedCategoryText.textContent = item.textContent;
            console.debug(`[Category] Selected: ${selectedCategory}`);
            closeDropdown();
            updateSelectionUI();
        });
        categoryGrid.appendChild(item);
    });

    // Highlight the active toggle label (SFW or NSFW)
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
    dropdownTrigger.setAttribute('aria-expanded', !isHidden);
}

/** Closes and resets the category dropdown to its default state. */
function closeDropdown() {
    dropdownPopover.classList.add('hidden');
    dropdownTrigger.classList.remove('active');
    dropdownTrigger.setAttribute('aria-expanded', 'false');
}


/* ─── API FETCH ──────────────────────────────────────────────
 *  Fetches a random image from waifu.pics for the active
 *  type + category combo and renders it in the image panel.
 *  API format: GET https://api.waifu.pics/{type}/{category}
 * ─────────────────────────────────────────────────────────── */
async function getAnime() {
    const type = typeToggle.checked ? 'nsfw' : 'sfw';
    const apiUrl = `https://api.waifu.pics/${type}/${selectedCategory}`;
    console.debug(`[API] Fetching: ${apiUrl}`);

    // Lock UI while loading
    findBtn.disabled = true;
    const originalBtnText = findBtn.textContent;
    findBtn.textContent = 'Searching...';
    loader.classList.remove('hidden');
    placeholder.classList.add('hidden');
    animeImg.classList.add('hidden');
    downloadBtn.disabled = true;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        console.debug('[API] Response:', data);

        if (data.url) {
            currentImageUrl = data.url;
            animeImg.src = data.url;
            animeImg.alt = `${selectedCategory} - Anime AMOLED`;

            // Only reveal the image once it has fully loaded — prevents layout flash
            animeImg.onload = () => {
                loader.classList.add('hidden');
                animeImg.classList.remove('hidden');
                downloadBtn.disabled = false;
                findBtn.disabled = false;
                findBtn.textContent = originalBtnText;
                console.debug('[Image] Loaded successfully:', currentImageUrl);
            };
        } else {
            // API responded but returned no URL — shouldn't happen but handle gracefully
            throw new Error('API returned no image URL');
        }
    } catch (error) {
        console.error('[API] Fetch error:', error);
        alert('Failed to fetch image. Please try again.');
        findBtn.disabled = false;
        findBtn.textContent = originalBtnText;
        loader.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}


/* ─── DOWNLOAD ───────────────────────────────────────────────
 *  Downloads the current image as a .png file.
 *
 *  Strategy (in order):
 *   1. Direct fetch — works if waifu.pics allows CORS on the CDN
 *   2. CORS proxy (corsproxy.io) — auto-fallback, no user prompt
 *   3. Open in new tab — absolute last resort if both fetches fail
 *
 *  Note: corsproxy.io only sees the public image URL.
 *  No sensitive data is ever proxied.
 * ─────────────────────────────────────────────────────────── */
async function downloadImage() {
    if (!currentImageUrl || downloadBtn.disabled) return;

    // Lock download button while in progress
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = 'Downloading...';
    downloadBtn.disabled = true;

    const cleanup = () => {
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
    };

    /** Creates a temporary <a> element to trigger a browser file download. */
    const triggerDownload = (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `anime_${selectedCategory}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        // Revoke the object URL after a short delay to free memory
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            cleanup();
        }, 100);
    };

    // Attempt list: direct URL first, then CORS proxy
    const attemptUrls = [
        { label: 'direct',     url: currentImageUrl },
        { label: 'cors-proxy', url: `https://corsproxy.io/?${encodeURIComponent(currentImageUrl)}` }
    ];

    for (const { label, url } of attemptUrls) {
        try {
            console.debug(`[Download] Trying ${label}:`, url);
            const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            console.debug(`[Download] Success via ${label}`);
            triggerDownload(blob);
            return; // Exit on first success
        } catch (err) {
            console.warn(`[Download] Failed via ${label}:`, err.message);
        }
    }

    // All fetch attempts failed — open in new tab as absolute last resort
    console.error('[Download] All fetch attempts failed. Opening in new tab.');
    alert('Download failed. Opening in a new tab — right-click the image to save it.');
    window.open(currentImageUrl, '_blank');
    cleanup();
}


/* ─── EVENT LISTENERS ────────────────────────────────────────
 *  Wire up all interactive elements to their handlers.
 * ─────────────────────────────────────────────────────────── */
typeToggle.addEventListener('change', populateCategories);
findBtn.addEventListener('click', getAnime);
downloadBtn.addEventListener('click', downloadImage);

// Toggle dropdown on button click (stop propagation to prevent immediate close)
dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
});

// Close dropdown when clicking anywhere outside it
document.addEventListener('click', (e) => {
    if (!dropdownPopover.contains(e.target) && !dropdownTrigger.contains(e.target)) {
        closeDropdown();
    }
});


/* ─── INIT ───────────────────────────────────────────────────
 *  Run once on page load to populate categories with defaults.
 * ─────────────────────────────────────────────────────────── */
console.debug('[Init] Anime OLED loaded. Populating categories...');
populateCategories();