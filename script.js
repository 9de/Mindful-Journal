let selectedMood = null;
let editingEntryIndex = null;
const DRAFT_KEY = 'currentDraft';
const ENTRIES_KEY = 'journalEntries';
const LAST_ENTRY_DATE_KEY = 'lastEntryDate';

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function showConfirmationDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.innerHTML = `
        <p>${message}</p>
        <div class="dialog-buttons">
            <button class="cancel" onclick="this.closest('.dialog-overlay').remove()">Cancel</button>
            <button class="confirm" onclick="confirmDialog(this)">Delete</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Store the callback
    dialog.dataset.confirmCallback = onConfirm;
}

function confirmDialog(button) {
    const dialog = button.closest('.dialog-overlay');
    const callback = dialog.querySelector('.confirmation-dialog').dataset.confirmCallback;
    if (callback) {
        eval(callback);
    }
    dialog.remove();
}

function updateStats() {
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    document.getElementById('total-entries').textContent = `${entries.length} entries`;
    
    // Calculate streak
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Sort entries by date in descending order
    const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sortedEntries.length > 0) {
        const mostRecentDate = new Date(sortedEntries[0].date);
        mostRecentDate.setHours(0, 0, 0, 0);
        
        if (mostRecentDate.getTime() === currentDate.getTime()) {
            streak = 1;
            
            for (let i = 1; i < sortedEntries.length; i++) {
                const entryDate = new Date(sortedEntries[i].date);
                const prevDate = new Date(sortedEntries[i-1].date);
                entryDate.setHours(0, 0, 0, 0);
                prevDate.setHours(0, 0, 0, 0);
                
                if ((prevDate.getTime() - entryDate.getTime()) === 86400000) {
                    streak++;
                } else {
                    break;
                }
            }
        }
    }
    
    document.getElementById('writing-streak').textContent = `${streak} day streak`;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleBold() {
    const textarea = document.getElementById('journal-text');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const selectedText = text.substring(start, end);
    const replacement = selectedText ? `**${selectedText}**` : '****';
    
    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    
    if (!selectedText) {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
    }
}

function toggleItalic() {
    const textarea = document.getElementById('journal-text');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const selectedText = text.substring(start, end);
    const replacement = selectedText ? `_${selectedText}_` : '__';
    
    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();
    
    if (!selectedText) {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
    }
}

function addHeading() {
    const textarea = document.getElementById('journal-text');
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Add a newline if we're not at the start of a line
    const prefix = start > 0 && text[start - 1] !== '\n' ? '\n' : '';
    textarea.value = text.substring(0, start) + prefix + '# ' + text.substring(start);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length + 2;
}

function addList() {
    const textarea = document.getElementById('journal-text');
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Add a newline if we're not at the start of a line
    const prefix = start > 0 && text[start - 1] !== '\n' ? '\n' : '';
    textarea.value = text.substring(0, start) + prefix + '- ' + text.substring(start);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length + 2;
}

function updateWordCount() {
    const text = document.getElementById('journal-text').value;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.querySelector('.word-count').textContent = `${wordCount} words`;
    
    // Save draft
    localStorage.setItem(DRAFT_KEY, text);
}

function selectMood(element) {
    const moodOptions = document.querySelectorAll('.mood-option');
    moodOptions.forEach(option => option.classList.remove('selected'));
    element.classList.add('selected');
    selectedMood = element.dataset.mood;
}

function extractTags(text) {
    const tagRegex = /#[\w]+/g;
    return [...new Set(text.match(tagRegex) || [])];
}

function saveEntry() {
    const text = document.getElementById('journal-text').value.trim();
    if (!text) {
        showNotification('Please write something before saving', 'error');
        return;
    }

    if (!selectedMood) {
        showNotification('Please select a mood for your entry', 'error');
        return;
    }

    const date = new Date();
    const entry = {
        date: date.toISOString(),
        text: text,
        mood: selectedMood,
        tags: extractTags(text)
    };

    let entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    
    if (editingEntryIndex !== null) {
        entries[editingEntryIndex] = entry;
        editingEntryIndex = null;
    } else {
        entries.unshift(entry);
    }
    
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    localStorage.setItem(LAST_ENTRY_DATE_KEY, date.toDateString());
    localStorage.removeItem(DRAFT_KEY);

    displayEntries();
    updateStats();
    
    showNotification('Entry saved successfully!');

    // Reset the form
    document.getElementById('journal-text').value = '';
    selectedMood = null;
    const moodOptions = document.querySelectorAll('.mood-option');
    moodOptions.forEach(option => option.classList.remove('selected'));
    updateWordCount();
    
    // Enable save button
    document.getElementById('save-button').disabled = false;
}

function editEntry(index) {
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    const entry = entries[index];
    
    document.getElementById('journal-text').value = entry.text;
    updateWordCount();
    
    const moodOption = document.querySelector(`[data-mood="${entry.mood}"]`);
    if (moodOption) {
        selectMood(moodOption);
    }
    
    editingEntryIndex = index;
    document.getElementById('save-button').textContent = 'Update Entry';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteEntry(index) {
    showConfirmationDialog(
        'Are you sure you want to delete this entry? This action cannot be undone.',
        `
            let entries = JSON.parse(localStorage.getItem('${ENTRIES_KEY}') || '[]');
            entries.splice(${index}, 1);
            localStorage.setItem('${ENTRIES_KEY}', JSON.stringify(entries));
            displayEntries();
            updateStats();
            showNotification('Entry deleted');
        `
    );
}

function searchEntries(query) {
    const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
    if (!query.trim()) {
        displayEntries(entries);
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const filteredEntries = entries.filter(entry => 
        entry.text.toLowerCase().includes(searchTerm) ||
        entry.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
    displayEntries(filteredEntries);
}

function displayEntries(entriesToShow) {
    const entriesContainer = document.getElementById('entries-container');
    const entries = entriesToShow || JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');

    entriesContainer.innerHTML = entries.map((entry, index) => `
        <div class="entry-card">
            <div class="entry-header">
                <div class="entry-date">${formatDate(new Date(entry.date))}</div>
                <div class="entry-mood">${entry.mood}</div>
            </div>
            <div class="entry-text">${entry.text.replace(/\n/g, '<br>')}</div>
            <div class="tags">
                ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="entry-actions">
                <button class="edit" onclick="editEntry(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete" onclick="deleteEntry(${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    if (entries.length === 0) {
        entriesContainer.innerHTML = '<p style="text-align: center; color: var(--secondary-color);">No entries found</p>';
    }
}

// Initialize the application
function initializeApp() {
    // Set up the current date display
    document.getElementById('current-date').textContent = formatDate(new Date());
    
    // Add event listeners
    const textarea = document.getElementById('journal-text');
    textarea.addEventListener('input', updateWordCount);
    
    // Check for daily reset
    const lastDate = localStorage.getItem(LAST_ENTRY_DATE_KEY);
    const today = new Date().toDateString();
    
    if (lastDate !== today) {
        textarea.value = '';
        localStorage.setItem(LAST_ENTRY_DATE_KEY, today);
    } else {
        // Restore any unsaved draft
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            textarea.value = savedDraft;
            updateWordCount();
        }
    }
    
    // Display existing entries
    displayEntries();
    
    // Update statistics
    updateStats();
    
    // Initialize word count
    updateWordCount();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.target.tagName.toLowerCase() === 'input') return;
        
        // Save - Ctrl/Cmd + S
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveEntry();
        }
        
        // Bold - Ctrl/Cmd + B
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            toggleBold();
        }
        
        // Italic - Ctrl/Cmd + I
        if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            toggleItalic();
        }
    });
    
    // Handle beforeunload
    window.addEventListener('beforeunload', function(e) {
        const currentText = textarea.value.trim();
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        
        if (currentText && currentText !== savedDraft) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);
