// Weekly Meal Planner App

let mealsData = [];
let staplesData = {};
let selectedMeals = new Set();

// Load meals data
async function loadMeals() {
    try {
        const response = await fetch('data/weekly-meals.json');
        const data = await response.json();
        mealsData = data.meals;
        staplesData = data.staples || {};
        document.getElementById('weekInfo').textContent = `Week of ${data.weekOf}`;
        renderMeals(mealsData);
        updateShoppingList(); // Show staples immediately
    } catch (error) {
        console.error('Error loading meals:', error);
        document.getElementById('mealsGrid').innerHTML = `
            <div class="empty-state">
                <p>No meals loaded yet. Check back Sunday morning!</p>
            </div>
        `;
    }
}

// Render meal cards
function renderMeals(meals) {
    const grid = document.getElementById('mealsGrid');
    
    if (!meals || meals.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No meals match this filter.</p></div>';
        return;
    }
    
    grid.innerHTML = meals.map(meal => `
        <div class="meal-card ${selectedMeals.has(meal.id) ? 'selected' : ''}" 
             data-id="${meal.id}" 
             data-protein-type="${meal.proteinType}"
             onclick="toggleMeal('${meal.id}')">
            <div class="header">
                <h3>${meal.name}</h3>
                <span class="store-badge ${meal.store.toLowerCase().replace(' ', '-')}">${meal.store}</span>
            </div>
            <div class="meal-components">
                <div class="component">
                    <span class="component-icon">🥩</span>
                    <span class="component-label">Protein:</span>
                    <span>${meal.protein} (${meal.proteinOzPerServing}oz/person)</span>
                </div>
                <div class="component">
                    <span class="component-icon">🥦</span>
                    <span class="component-label">Veggie:</span>
                    <span>${meal.vegetable}</span>
                </div>
                <div class="component">
                    <span class="component-icon">🍚</span>
                    <span class="component-label">Carb:</span>
                    <span>${meal.carb}</span>
                </div>
            </div>
            <div class="meal-meta">
                <span>⏱️ ${meal.prepTime} min prep</span>
                <span>👨‍👩‍👧‍👦 Serves ${meal.servings}</span>
                <span class="price-tag">~$${meal.estimatedCost.toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}

// Toggle meal selection
function toggleMeal(id) {
    if (selectedMeals.has(id)) {
        selectedMeals.delete(id);
    } else {
        selectedMeals.add(id);
    }
    
    // Update card visual
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('selected');
    }
    
    // Update shopping list
    updateShoppingList();
    
    // Save to localStorage
    localStorage.setItem('selectedMeals', JSON.stringify([...selectedMeals]));
}

// Update shopping list based on selected meals
function updateShoppingList() {
    const listContainer = document.getElementById('shoppingList');
    
    // Build staples section
    let staplesHtml = '';
    if (staplesData.breakfast || staplesData.lunch) {
        staplesHtml = '<div class="store-group staples-group"><h4>☀️ Weekly Staples</h4>';
        
        if (staplesData.breakfast && staplesData.breakfast.length > 0) {
            staplesHtml += '<div class="staple-category"><strong>Breakfast:</strong><ul>';
            staplesData.breakfast.forEach(item => {
                staplesHtml += `<li><span>${item.name}</span><span class="item-qty">${item.quantity} ${item.unit}</span></li>`;
            });
            staplesHtml += '</ul></div>';
        }
        
        if (staplesData.lunch && staplesData.lunch.length > 0) {
            staplesHtml += '<div class="staple-category"><strong>Lunch:</strong><ul>';
            staplesData.lunch.forEach(item => {
                staplesHtml += `<li><span>${item.name}</span><span class="item-qty">${item.quantity} ${item.unit}</span></li>`;
            });
            staplesHtml += '</ul></div>';
        }
        staplesHtml += '</div>';
    }
    
    if (selectedMeals.size === 0) {
        listContainer.innerHTML = staplesHtml + '<p class="empty-state">Select meals above to add dinner ingredients</p>';
        return;
    }
    
    // Group items by store
    const byStore = {};
    
    selectedMeals.forEach(id => {
        const meal = mealsData.find(m => m.id === id);
        if (!meal) return;
        
        const store = meal.store;
        if (!byStore[store]) {
            byStore[store] = [];
        }
        
        // Add ingredients
        meal.ingredients.forEach(ing => {
            const existing = byStore[store].find(i => i.name === ing.name);
            if (existing) {
                existing.quantity += ing.quantity;
            } else {
                byStore[store].push({ ...ing });
            }
        });
    });
    
    // Render shopping list
    const dinnerHtml = Object.entries(byStore).map(([store, items]) => `
        <div class="store-group">
            <h4>🍽️ ${store}</h4>
            <ul>
                ${items.map(item => `
                    <li>
                        <span>${item.name}</span>
                        <span class="item-qty">${item.quantity} ${item.unit}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
    
    listContainer.innerHTML = staplesHtml + dinnerHtml;
}

// Filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        
        if (filter === 'all') {
            renderMeals(mealsData);
        } else if (filter === 'selected') {
            const selectedMealsData = mealsData.filter(m => selectedMeals.has(m.id));
            renderMeals(selectedMealsData);
        } else {
            const filtered = mealsData.filter(m => m.proteinType === filter);
            renderMeals(filtered);
        }
    });
});

// Load saved selections
function loadSavedSelections() {
    const saved = localStorage.getItem('selectedMeals');
    if (saved) {
        selectedMeals = new Set(JSON.parse(saved));
    }
}

// Copy shopping list to clipboard
function copyShoppingList() {
    // Build plain text list
    let text = '🛒 Shopping List\n\n';
    
    // Add staples first
    if (staplesData.breakfast || staplesData.lunch) {
        text += '☀️ WEEKLY STAPLES\n';
        
        if (staplesData.breakfast && staplesData.breakfast.length > 0) {
            text += '\nBreakfast:\n';
            staplesData.breakfast.forEach(item => {
                text += `• ${item.name} - ${item.quantity} ${item.unit}\n`;
            });
        }
        
        if (staplesData.lunch && staplesData.lunch.length > 0) {
            text += '\nLunch:\n';
            staplesData.lunch.forEach(item => {
                text += `• ${item.name} - ${item.quantity} ${item.unit}\n`;
            });
        }
        text += '\n';
    }
    
    // Add dinner ingredients if meals selected
    if (selectedMeals.size > 0) {
        const byStore = {};
        
        selectedMeals.forEach(id => {
            const meal = mealsData.find(m => m.id === id);
            if (!meal) return;
            
            const store = meal.store;
            if (!byStore[store]) {
                byStore[store] = [];
            }
            
            meal.ingredients.forEach(ing => {
                const existing = byStore[store].find(i => i.name === ing.name);
                if (existing) {
                    existing.quantity += ing.quantity;
                } else {
                    byStore[store].push({ ...ing });
                }
            });
        });
        
        text += '🍽️ DINNER INGREDIENTS\n\n';
        Object.entries(byStore).forEach(([store, items]) => {
            text += `📍 ${store}\n`;
            items.forEach(item => {
                text += `• ${item.name} - ${item.quantity} ${item.unit}\n`;
            });
            text += '\n';
        });
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback('✓ Copied to clipboard!', 'success');
    }).catch(err => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showCopyFeedback('✓ Copied to clipboard!', 'success');
    });
}

// Show copy feedback message
function showCopyFeedback(message, type) {
    const feedback = document.getElementById('copyFeedback');
    feedback.textContent = message;
    feedback.className = 'copy-feedback ' + type;
    
    setTimeout(() => {
        feedback.className = 'copy-feedback';
    }, 2500);
}

// Initialize
loadSavedSelections();
loadMeals();
