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
        renderDealBoard(data);
        updatePlannerSummary();
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

// Render weekly deals and freezer recommendations
function renderDealBoard(data) {
    const board = document.getElementById('dealBoard');
    if (!board) return;

    const deals = [
        ...(data.topDeals?.harristeeter || []).map(deal => ({ ...deal, store: 'Harris Teeter' })),
        ...(data.topDeals?.aldi || []).map(deal => ({ ...deal, store: 'Aldi' }))
    ].slice(0, 6);

    const freezerPicks = data.freezerRecommendations || [];

    board.innerHTML = `
        <div class="deal-panel">
            <div class="section-heading">
                <span class="section-kicker">Sale intel</span>
                <h2>Best protein deals</h2>
            </div>
            <div class="deal-chips">
                ${deals.map(deal => `
                    <div class="deal-chip ${deal.store.toLowerCase().replace(' ', '-')}">
                        <span class="deal-store">${deal.store}</span>
                        <strong>${deal.item}</strong>
                        <span>${deal.price}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="freezer-panel">
            <span class="section-kicker">Freezer move</span>
            <h2>Stock-up shortlist</h2>
            <ul>
                ${freezerPicks.slice(0, 3).map(pick => `
                    <li><strong>${pick.item}</strong><span>${pick.pricePerLb} · ${pick.reason}</span></li>
                `).join('')}
            </ul>
        </div>
    `;
}

function updatePlannerSummary() {
    const selected = mealsData.filter(meal => selectedMeals.has(meal.id));
    const selectedCount = document.getElementById('selectedCount');
    const selectedCost = document.getElementById('selectedCost');

    if (!selectedCount || !selectedCost) return;

    const totalCost = selected.reduce((sum, meal) => sum + (meal.estimatedCost || 0), 0);
    selectedCount.textContent = selected.length;
    selectedCost.textContent = selected.length ? `~$${totalCost.toFixed(0)} planned` : '$0 planned';
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
             data-protein-type="${meal.proteinType}">
            ${meal.image ? `
                <div class="meal-photo-wrap" onclick="toggleMeal('${meal.id}')">
                    <img class="meal-photo" src="${meal.image}" alt="${meal.name}" loading="lazy">
                    <div class="meal-photo-gradient"></div>
                    <span class="photo-badge">${meal.prepTime} min</span>
                </div>
            ` : ''}
            <div class="select-ribbon">${selectedMeals.has(meal.id) ? '✓ Picked' : 'Tap to pick'}</div>
            <div class="card-main" onclick="toggleMeal('${meal.id}')">
                <div class="header">
                    <div>
                        <span class="deal-highlight">${meal.dealHighlight || 'Weeknight winner'}</span>
                        <h3>${meal.name}</h3>
                    </div>
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
                <div class="sale-price">Sale protein: ${meal.salePrice || 'weekly deal'}</div>
            </div>
            <button class="recipe-toggle" onclick="toggleRecipe('${meal.id}')">📖 View Recipe</button>
            <div class="recipe-section" id="recipe-${meal.id}">
                <h4>📝 Instructions</h4>
                <ol>
                    ${meal.instructions ? meal.instructions.map(step => `<li>${step}</li>`).join('') : '<li>Recipe coming soon!</li>'}
                </ol>
            </div>
        </div>
    `).join('');
}

// Toggle recipe visibility
function toggleRecipe(id) {
    const recipeSection = document.getElementById(`recipe-${id}`);
    const btn = recipeSection.previousElementSibling;
    
    if (recipeSection.classList.contains('show')) {
        recipeSection.classList.remove('show');
        btn.textContent = '📖 View Recipe';
    } else {
        recipeSection.classList.add('show');
        btn.textContent = '📖 Hide Recipe';
    }
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
        const ribbon = card.querySelector('.select-ribbon');
        if (ribbon) ribbon.textContent = selectedMeals.has(id) ? '✓ Picked' : 'Tap to pick';
    }
    
    // Update shopping list
    updateShoppingList();
    updatePlannerSummary();
    
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
