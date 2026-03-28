// Weekly Meal Planner App

let mealsData = [];
let selectedMeals = new Set();

// Load meals data
async function loadMeals() {
    try {
        const response = await fetch('data/weekly-meals.json');
        const data = await response.json();
        mealsData = data.meals;
        document.getElementById('weekInfo').textContent = `Week of ${data.weekOf}`;
        renderMeals(mealsData);
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
    
    if (selectedMeals.size === 0) {
        listContainer.innerHTML = '<p class="empty-state">Select meals above to build your shopping list</p>';
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
    listContainer.innerHTML = Object.entries(byStore).map(([store, items]) => `
        <div class="store-group">
            <h4>${store}</h4>
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

// Copy shopping list to clipboard
function copyShoppingList() {
    if (selectedMeals.size === 0) {
        showCopyFeedback('Select some meals first!', 'error');
        return;
    }
    
    // Build plain text list
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
    
    // Format as plain text
    let text = '🛒 Shopping List\n\n';
    
    Object.entries(byStore).forEach(([store, items]) => {
        text += `📍 ${store}\n`;
        items.forEach(item => {
            text += `• ${item.name} - ${item.quantity} ${item.unit}\n`;
        });
        text += '\n';
    });
    
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

// Load saved selections
function loadSavedSelections() {
    const saved = localStorage.getItem('selectedMeals');
    if (saved) {
        selectedMeals = new Set(JSON.parse(saved));
    }
}

// Initialize
loadSavedSelections();
loadMeals();
