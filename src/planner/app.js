// CineBrain Content Manager
// Start date: December 15, 2025

// App Configuration
const APP_CONFIG = {
    startDate: new Date('2025-12-15'),
    storageKey: 'cinebrain-state',
    toastDuration: 3000
};

// App State
const app = {
    currentDay: 1,
    filterType: 'all',
    filterStatus: 'all',
    searchTerm: '',
    completedPosts: new Set(),
    streak: 0
};

// DOM Elements
const elements = {
    menuToggle: document.getElementById('menuToggle'),
    sidebar: document.getElementById('sidebar'),
    sidebarClose: document.getElementById('sidebarClose'),
    overlay: document.getElementById('overlay'),
    searchBox: document.getElementById('searchBox'),
    searchClear: document.getElementById('searchClear'),
    daysList: document.getElementById('daysList'),
    mainContent: document.getElementById('mainContent'),
    totalProgress: document.getElementById('totalProgress'),
    completedCount: document.getElementById('completedCount'),
    currentStreak: document.getElementById('currentStreak'),
    todayProgress: document.getElementById('todayProgress'),
    todayProgressText: document.getElementById('todayProgressText'),
    calendarToggle: document.getElementById('calendarToggle'),
    calendarModal: document.getElementById('calendarModal'),
    modalClose: document.getElementById('modalClose'),
    calendarGrid: document.getElementById('calendarGrid'),
    previewModal: document.getElementById('previewModal'),
    previewClose: document.getElementById('previewClose'),
    previewBody: document.getElementById('previewBody'),
    exportBtn: document.getElementById('exportBtn'),
    toastContainer: document.getElementById('toastContainer'),
    // Mobile elements
    mobileProgress: document.getElementById('mobileProgress'),
    mobilePosts: document.getElementById('mobilePosts'),
    mobileStreak: document.getElementById('mobileStreak'),
    mobileCalendarBtn: document.getElementById('mobileCalendarBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initializeEventListeners();
    updateFilterCounts();
    initSidebar();
    renderContent();
    updateProgress();
    calculateStreak();
    checkForNotifications();
    updateMobileStats();
});

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem(APP_CONFIG.storageKey);
    if (saved) {
        const state = JSON.parse(saved);
        app.completedPosts = new Set(state.completedPosts || []);
    }

    // Set current day based on today's date
    app.currentDay = getCurrentDayNumber();
}

// Save state to localStorage
function saveState() {
    localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify({
        completedPosts: Array.from(app.completedPosts),
        lastVisit: new Date().toISOString()
    }));
}

// Get current day number based on start date
function getCurrentDayNumber() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(APP_CONFIG.startDate);
    startDate.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

    if (daysSinceStart < 0) return 1; // Before start date
    if (daysSinceStart >= 30) return ((daysSinceStart % 30) + 1); // Loop after 30 days
    return daysSinceStart + 1;
}

// Get actual date for a day number
function getDateForDay(dayNumber) {
    const date = new Date(APP_CONFIG.startDate);
    date.setDate(date.getDate() + dayNumber - 1);
    return date;
}

// Initialize event listeners
function initializeEventListeners() {
    // Mobile menu
    elements.menuToggle.addEventListener('click', toggleSidebar);
    elements.sidebarClose?.addEventListener('click', closeSidebar);
    elements.overlay.addEventListener('click', closeSidebar);

    // Search
    elements.searchBox.addEventListener('input', handleSearch);
    elements.searchClear.addEventListener('click', clearSearch);

    // Filters - Updated selectors
    document.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
        btn.addEventListener('click', handleFilterChange);
    });

    document.querySelectorAll('.filter-chip[data-status]').forEach(btn => {
        btn.addEventListener('click', handleStatusFilterChange);
    });

    // Calendar
    elements.calendarToggle?.addEventListener('click', openCalendar);
    elements.modalClose?.addEventListener('click', closeCalendar);
    elements.previewClose?.addEventListener('click', closePreview);

    // Mobile bottom nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', handleMobileNavClick);
    });

    // Close modals on outside click
    elements.calendarModal?.addEventListener('click', (e) => {
        if (e.target === elements.calendarModal) closeCalendar();
    });
    elements.previewModal?.addEventListener('click', (e) => {
        if (e.target === elements.previewModal) closePreview();
    });

    // Export
    elements.exportBtn?.addEventListener('click', exportData);

    // Window resize
    window.addEventListener('resize', handleResize);

    // Touch gestures
    initTouchGestures();

    // Keyboard shortcuts
    initKeyboardShortcuts();
}

// Handle mobile navigation
function handleMobileNavClick(e) {
    const btn = e.currentTarget;
    const view = btn.dataset.view;

    // Update active state
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    switch (view) {
        case 'posts':
            closeSidebar();
            break;
        case 'calendar':
            openCalendar();
            break;
        case 'stats':
            // You can implement a stats modal here
            showToast('Stats view coming soon!', 'info');
            break;
    }
}

// Toggle sidebar
function toggleSidebar() {
    elements.sidebar.classList.toggle('active');
    elements.overlay.classList.toggle('active');
    document.body.style.overflow = elements.sidebar.classList.contains('active') ? 'hidden' : '';
}

// Close sidebar
function closeSidebar() {
    elements.sidebar.classList.remove('active');
    elements.overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Handle search
function handleSearch(e) {
    app.searchTerm = e.target.value.toLowerCase().trim();
    renderContent();
}

// Clear search
function clearSearch() {
    elements.searchBox.value = '';
    app.searchTerm = '';
    renderContent();
}

// Handle filter change - Updated for new structure
function handleFilterChange(e) {
    const btn = e.currentTarget;
    document.querySelectorAll('.filter-chip[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    app.filterType = btn.dataset.filter;
    renderContent();
}

// Handle status filter change - Updated for new structure
function handleStatusFilterChange(e) {
    const btn = e.currentTarget;
    document.querySelectorAll('.filter-chip[data-status]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    app.filterStatus = btn.dataset.status;
    renderContent();
}

// Handle window resize
function handleResize() {
    if (window.innerWidth > 768) {
        closeSidebar();
    }
}

// Update filter counts - Updated for new structure
function updateFilterCounts() {
    const counts = {
        movie: 0,
        tv: 0,
        anime: 0,
        list: 0
    };

    cinebrain30Days.forEach(day => {
        day.posts.forEach(post => {
            if (post.template.includes('movie')) counts.movie++;
            else if (post.template.includes('tv')) counts.tv++;
            else if (post.template.includes('anime')) counts.anime++;
            else if (post.template.includes('list')) counts.list++;
        });
    });

    document.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
        const filter = btn.dataset.filter;
        const count = btn.querySelector('.chip-count');
        if (count && counts[filter] !== undefined) {
            count.textContent = counts[filter];
        } else if (count && filter === 'all') {
            count.textContent = Object.values(counts).reduce((a, b) => a + b, 0);
        }
    });
}

// Initialize sidebar
function initSidebar() {
    const daysList = elements.daysList;
    daysList.innerHTML = '';

    cinebrain30Days.forEach((day) => {
        const dayItem = createDayItem(day);
        daysList.appendChild(dayItem);
    });
}

// Create day item
function createDayItem(day) {
    const div = document.createElement('div');
    div.className = 'day-item';
    div.dataset.day = day.day;

    const completedCount = day.posts.filter(post =>
        app.completedPosts.has(`${day.day}-${post.time}`)
    ).length;

    const date = getDateForDay(day.day);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isToday = day.day === getCurrentDayNumber();

    if (day.day === app.currentDay) div.classList.add('active');
    if (completedCount === day.posts.length) div.classList.add('completed');
    if (isToday) div.classList.add('today');

    const progress = (completedCount / day.posts.length) * 100;

    div.innerHTML = `
        <div class="day-header">
            <div>
                <div class="day-title">Day ${day.day} - ${day.weekday}</div>
                <div class="day-date">${dateStr}${isToday ? ' (Today)' : ''}</div>
            </div>
            <div class="day-progress">${completedCount}/${day.posts.length}</div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
    `;

    div.addEventListener('click', () => selectDay(day.day));

    return div;
}

// Select day
function selectDay(dayNumber) {
    app.currentDay = dayNumber;
    renderContent();
    updateDaySelection();

    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// Update day selection in sidebar
function updateDaySelection() {
    document.querySelectorAll('.day-item').forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.day) === app.currentDay);
    });
}

// Render main content
function renderContent() {
    const mainContent = elements.mainContent;
    const currentDayData = cinebrain30Days.find(d => d.day === app.currentDay);

    if (!currentDayData) {
        mainContent.innerHTML = '<div class="empty-state"><h3>Day not found</h3></div>';
        return;
    }

    let filteredPosts = filterPosts(currentDayData.posts);
    const isToday = app.currentDay === getCurrentDayNumber();
    const date = getDateForDay(app.currentDay);
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let html = '';

    if (isToday) {
        const pendingCount = filteredPosts.filter(p =>
            !app.completedPosts.has(`${app.currentDay}-${p.time}`)
        ).length;

        html += `
            <div class="today-banner">
                <h2>Today's Posts</h2>
                <p>${currentDayData.weekday}, Day ${currentDayData.day} — ${pendingCount} posts remaining</p>
                <div class="current-date">${dateStr}</div>
            </div>
        `;
    } else {
        html += `
            <div class="today-banner" style="background: linear-gradient(135deg, var(--bg-card), var(--bg-card-hover));">
                <h2>Day ${currentDayData.day} - ${currentDayData.weekday}</h2>
                <p>${filteredPosts.length} posts scheduled</p>
                <div class="current-date">${dateStr}</div>
            </div>
        `;
    }

    html += '<div class="posts-container">';

    if (filteredPosts.length === 0) {
        html += `
            <div class="empty-state">
                <h3>No posts found</h3>
                <p>Try adjusting your filters or search term</p>
            </div>
        `;
    } else {
        filteredPosts.forEach(post => {
            html += createPostCard(post, currentDayData.day);
        });
    }

    html += '</div>';
    mainContent.innerHTML = html;

    // Add event listeners
    initPostCardListeners();
    updateTodayProgress();
}

// Filter posts
function filterPosts(posts) {
    let filtered = [...posts];

    // Apply content type filter
    if (app.filterType !== 'all') {
        filtered = filtered.filter(post => {
            if (app.filterType === 'movie') {
                return post.template.includes('movie') || post.template.includes('hidden gem') || post.template.includes('mind bending');
            }
            if (app.filterType === 'tv') return post.template.includes('tv');
            if (app.filterType === 'anime') return post.template.includes('anime');
            if (app.filterType === 'list') return post.template.includes('list');
            return false;
        });
    }

    // Apply status filter
    if (app.filterStatus !== 'all') {
        filtered = filtered.filter(post => {
            const isCompleted = app.completedPosts.has(`${app.currentDay}-${post.time}`);
            return app.filterStatus === 'completed' ? isCompleted : !isCompleted;
        });
    }

    // Apply search filter
    if (app.searchTerm) {
        filtered = filtered.filter(post => {
            const searchable = [
                post.title || '',
                post.listTitle || '',
                post.hook || '',
                post.overview || '',
                post.template || '',
                ...(post.hashtags || []),
                ...(post.items || [])
            ].join(' ').toLowerCase();

            return searchable.includes(app.searchTerm);
        });
    }

    return filtered;
}

// Create post card HTML
function createPostCard(post, dayNumber) {
    const postId = `${dayNumber}-${post.time}`;
    const isCompleted = app.completedPosts.has(postId);

    let contentHtml = '';

    // Handle list-type posts
    if (post.items) {
        contentHtml = `
            <div class="post-section">
                <div class="post-section-title">${post.listTitle || 'List'}</div>
                <ul class="post-list">
                    ${post.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        // Regular post
        contentHtml = `
            <div class="post-section">
                <div class="post-section-title">Hook</div>
                <div class="post-content">${escapeHtml(post.hook || '')}</div>
            </div>
            <div class="post-section">
                <div class="post-section-title">Overview</div>
                <div class="post-content">${escapeHtml(post.overview || '')}</div>
            </div>
        `;
    }

    // Build title with year and region/platform
    let titleExtra = '';
    if (post.year) titleExtra += `<span class="post-year">(${post.year})</span>`;
    if (post.region) titleExtra += `<span class="post-year">• ${post.region}</span>`;
    if (post.platform) titleExtra += `<span class="post-year">• ${post.platform}</span>`;
    if (post.season) titleExtra += `<span class="post-year">• Season ${post.season}</span>`;
    if (post.note) titleExtra += `<span class="post-year">• ${post.note}</span>`;

    const displayTitle = post.title || post.listTitle || 'Untitled';

    return `
        <div class="post-card ${isCompleted ? 'completed' : ''}" data-post-id="${postId}">
            <div class="post-header">
                <div class="post-time">${post.time}</div>
                <div class="post-template">${post.template}</div>
            </div>
            
            <h3 class="post-title">
                ${escapeHtml(displayTitle)}
                ${titleExtra}
            </h3>
            
            ${contentHtml}
            
            <div class="post-hashtags">
                ${(post.hashtags || []).map(tag => `<span class="hashtag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            
            <div class="post-actions">
                <button class="complete-btn ${isCompleted ? 'completed' : ''}" data-post-id="${postId}">
                    ${isCompleted ? '✓ Completed' : 'Mark Complete'}
                </button>
                <button class="copy-btn" data-post-id="${postId}">
                    📋 Copy
                </button>
                <button class="preview-btn" data-post-id="${postId}">
                    👁 Preview
                </button>
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize post card event listeners
function initPostCardListeners() {
    // Complete buttons
    document.querySelectorAll('.complete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePostComplete(btn.dataset.postId);
        });
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyPostContent(btn.dataset.postId);
        });
    });

    // Preview buttons
    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            previewPost(btn.dataset.postId);
        });
    });
}

// Toggle post complete status
function togglePostComplete(postId) {
    if (app.completedPosts.has(postId)) {
        app.completedPosts.delete(postId);
        showToast('Post marked as pending', 'info');
    } else {
        app.completedPosts.add(postId);
        showToast('Post marked as complete! 🎉', 'success');
    }

    saveState();
    updateProgress();
    calculateStreak();
    updateMobileStats();
    initSidebar();
    renderContent();
}

// Copy post content to clipboard
function copyPostContent(postId) {
    const [dayNum, ...timeParts] = postId.split('-');
    const time = timeParts.join('-'); // Rejoin in case time has dashes
    const day = cinebrain30Days.find(d => d.day === parseInt(dayNum));
    const post = day?.posts.find(p => p.time === time);

    if (!post) {
        showToast('Post not found', 'error');
        return;
    }

    const content = generatePostText(post);

    navigator.clipboard.writeText(content).then(() => {
        const btn = document.querySelector(`.copy-btn[data-post-id="${postId}"]`);
        if (btn) {
            btn.classList.add('copied');
            btn.innerHTML = '✓ Copied!';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '📋 Copy';
            }, 2000);
        }
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for mobile
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }

        document.body.removeChild(textarea);
    });
}

// Generate post text for copying
function generatePostText(post) {
    let text = '';

    if (post.items) {
        // List post
        text += `${post.listTitle || 'Top List'}\n\n`;
        post.items.forEach((item, index) => {
            text += `${index + 1}. ${item}\n`;
        });
    } else {
        // Regular post
        const title = post.title || '';
        const year = post.year ? ` (${post.year})` : '';
        const region = post.region ? ` [${post.region}]` : '';
        const platform = post.platform ? ` on ${post.platform}` : '';
        const season = post.season ? ` - Season ${post.season}` : '';

        text += `${title}${year}${region}${platform}${season}\n\n`;

        if (post.hook) {
            text += `${post.hook}\n\n`;
        }

        if (post.overview) {
            text += `${post.overview}\n\n`;
        }
    }

    if (post.hashtags && post.hashtags.length > 0) {
        text += '\n' + post.hashtags.join(' ');
    }

    return text.trim();
}

// Preview post
function previewPost(postId) {
    const [dayNum, ...timeParts] = postId.split('-');
    const time = timeParts.join('-');
    const day = cinebrain30Days.find(d => d.day === parseInt(dayNum));
    const post = day?.posts.find(p => p.time === time);

    if (!post) {
        showToast('Post not found', 'error');
        return;
    }

    const content = generatePostText(post);

    elements.previewBody.innerHTML = `
        <div class="preview-post">${escapeHtml(content)}</div>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <button class="copy-btn" onclick="copyPreviewContent()" style="flex: 1; padding: var(--space-md);">
                📋 Copy to Clipboard
            </button>
        </div>
    `;

    elements.previewModal.classList.add('active');
}

// Copy preview content
function copyPreviewContent() {
    const content = elements.previewBody.querySelector('.preview-post').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for mobile
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy', 'error');
        }

        document.body.removeChild(textarea);
    });
}

// Close preview modal
function closePreview() {
    elements.previewModal.classList.remove('active');
}

// Update today's progress bar
function updateTodayProgress() {
    const todayDay = getCurrentDayNumber();
    const todayData = cinebrain30Days.find(d => d.day === todayDay);

    if (!todayData) return;

    const completedCount = todayData.posts.filter(post =>
        app.completedPosts.has(`${todayDay}-${post.time}`)
    ).length;

    const progress = (completedCount / todayData.posts.length) * 100;

    if (elements.todayProgress) {
        elements.todayProgress.style.width = `${progress}%`;
    }

    if (elements.todayProgressText) {
        elements.todayProgressText.textContent = `${Math.round(progress)}%`;
    }
}

// Update overall progress
function updateProgress() {
    const totalPosts = cinebrain30Days.reduce((sum, day) => sum + day.posts.length, 0);
    const completedCount = app.completedPosts.size;
    const percentage = Math.round((completedCount / totalPosts) * 100);

    elements.totalProgress.textContent = `${percentage}%`;
    elements.completedCount.textContent = `${completedCount}/${totalPosts}`;

    updateTodayProgress();
}

// Update mobile stats
function updateMobileStats() {
    if (elements.mobileProgress) {
        elements.mobileProgress.textContent = elements.totalProgress.textContent;
    }
    if (elements.mobilePosts) {
        elements.mobilePosts.textContent = elements.completedCount.textContent;
    }
    if (elements.mobileStreak) {
        elements.mobileStreak.textContent = elements.currentStreak.textContent + 'd';
    }
}

// Calculate streak
function calculateStreak() {
    let streak = 0;
    const today = getCurrentDayNumber();

    // Check consecutive completed days going backwards from yesterday
    for (let i = today - 1; i >= 1; i--) {
        const dayData = cinebrain30Days.find(d => d.day === i);
        if (!dayData) break;

        const dayCompleted = dayData.posts.every(post =>
            app.completedPosts.has(`${i}-${post.time}`)
        );

        if (dayCompleted) {
            streak++;
        } else {
            break;
        }
    }

    // Check if today is fully completed
    const todayData = cinebrain30Days.find(d => d.day === today);
    if (todayData) {
        const todayCompleted = todayData.posts.every(post =>
            app.completedPosts.has(`${today}-${post.time}`)
        );
        if (todayCompleted) {
            streak++;
        }
    }

    app.streak = streak;
    elements.currentStreak.textContent = streak;
    updateMobileStats();
}

// Open calendar modal
function openCalendar() {
    renderCalendar();
    elements.calendarModal.classList.add('active');
}

// Close calendar modal
function closeCalendar() {
    elements.calendarModal.classList.remove('active');
}

// Render calendar
function renderCalendar() {
    const grid = elements.calendarGrid;
    grid.innerHTML = '';

    cinebrain30Days.forEach(day => {
        const completedCount = day.posts.filter(post =>
            app.completedPosts.has(`${day.day}-${post.time}`)
        ).length;

        const date = getDateForDay(day.day);
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        const isToday = day.day === getCurrentDayNumber();
        const isCompleted = completedCount === day.posts.length;

        const dayEl = document.createElement('div');
        dayEl.className = `calendar-day ${isToday ? 'today' : ''} ${isCompleted ? 'completed' : ''}`;
        dayEl.innerHTML = `
            <span class="calendar-day-weekday">${weekday}</span>
            <span class="calendar-day-number">${day.day}</span>
            <span class="calendar-day-progress">${completedCount}/${day.posts.length}</span>
        `;

        dayEl.addEventListener('click', () => {
            selectDay(day.day);
            closeCalendar();
        });

        grid.appendChild(dayEl);
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, APP_CONFIG.toastDuration);
}

// Export data
function exportData() {
    const data = {
        exportDate: new Date().toISOString(),
        completedPosts: Array.from(app.completedPosts),
        stats: {
            totalPosts: cinebrain30Days.reduce((sum, day) => sum + day.posts.length, 0),
            completedCount: app.completedPosts.size,
            streak: app.streak
        },
        days: cinebrain30Days.map(day => ({
            day: day.day,
            weekday: day.weekday,
            completedPosts: day.posts.filter(p =>
                app.completedPosts.has(`${day.day}-${p.time}`)
            ).length,
            totalPosts: day.posts.length
        }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinebrain-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Data exported successfully!', 'success');
}

// Check for notifications
function checkForNotifications() {
    const today = getCurrentDayNumber();
    const todayData = cinebrain30Days.find(d => d.day === today);

    if (!todayData) return;

    const pendingPosts = todayData.posts.filter(post =>
        !app.completedPosts.has(`${today}-${post.time}`)
    );

    if (pendingPosts.length > 0) {
        // Check if it's close to posting time
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        pendingPosts.forEach(post => {
            const [time, period] = post.time.split(' ');
            let [hours, minutes] = time.split(':').map(Number);

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            const timeDiff = (hours * 60 + minutes) - (currentHour * 60 + currentMinute);

            if (timeDiff > 0 && timeDiff <= 30) {
                showToast(`Reminder: "${post.title || post.listTitle}" posts in ${timeDiff} minutes!`, 'info');
            }
        });
    }
}

// Initialize touch gestures for mobile
function initTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;

    const mainContent = elements.mainContent;

    mainContent.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    mainContent.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 100;
        const diff = touchEndX - touchStartX;

        if (Math.abs(diff) < swipeThreshold) return;

        if (diff > 0 && window.innerWidth <= 768) {
            // Swipe right - open sidebar
            toggleSidebar();
        } else if (diff < 0 && elements.sidebar.classList.contains('active')) {
            // Swipe left - close sidebar
            closeSidebar();
        }
    }
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Escape - close modals
        if (e.key === 'Escape') {
            closeCalendar();
            closePreview();
            closeSidebar();
        }

        // Arrow keys for navigation (when not in input)
        if (document.activeElement.tagName !== 'INPUT') {
            if (e.key === 'ArrowLeft' && app.currentDay > 1) {
                selectDay(app.currentDay - 1);
            } else if (e.key === 'ArrowRight' && app.currentDay < 30) {
                selectDay(app.currentDay + 1);
            }
        }

        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.searchBox.focus();
        }

        // Ctrl/Cmd + E for export
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            exportData();
        }
    });
}

// Periodic checks
setInterval(() => {
    checkForNotifications();
}, 60000); // Check every minute

// Make copyPreviewContent available globally
window.copyPreviewContent = copyPreviewContent;

// Service worker registration for PWA capabilities
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('ServiceWorker registration failed:', err);
        });
    });
}