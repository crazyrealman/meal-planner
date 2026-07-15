// Weekly Meal Planner App

let mealsData = [];
let selectedMeals = new Set();
let planData = {};

// Load meals data
async function loadMeals() {
    try {
        const response = await fetch('data/weekly-meals.json');
        const data = await response.json();
        planData = data;
        mealsData = data.meals;
        document.getElementById('weekInfo').textContent = `Week of ${data.weekOf}`;
        renderNutritionPlan(data);
        renderDailyTracker(data);
        renderRecipeLibrary(data.recipeLibrary || []);
        renderApprovedFoods(data);
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

function renderNutritionPlan(data) {
    const panel = document.getElementById('targetPanel');
    if (!panel) return;

    const target = data.macroTarget || {};
    const goals = data.nutritionPlan?.goals || [];
    const habits = data.nutritionPlan?.dailyHabits || [];

    panel.innerHTML = `
        <span class="section-kicker">Daily target</span>
        <h2>${target.calories || 0} calories</h2>
        <div class="target-macros">
            <div><strong>${target.protein || 0}g</strong><span>Protein</span></div>
            <div><strong>${target.carbs || 0}g</strong><span>Carbs</span></div>
            <div><strong>${target.fat || 0}g</strong><span>Fat</span></div>
        </div>
        <div class="goal-row">
            ${goals.map(goal => `<span>${goal}</span>`).join('')}
        </div>
        <ul class="habit-list">
            ${habits.slice(0, 4).map(habit => `<li>${habit}</li>`).join('')}
        </ul>
    `;
}

function todayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function trackerStorageKey(date = todayKey()) {
    return `dailyTracker:${date}`;
}

function getTrackerState() {
    const saved = localStorage.getItem(trackerStorageKey());
    if (saved) return JSON.parse(saved);

    return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0,
        weight: '',
        workout: false,
        meals: {}
    };
}

function saveTrackerState(state) {
    localStorage.setItem(trackerStorageKey(), JSON.stringify(state));
}

function renderDailyTracker(data) {
    const panel = document.getElementById('dailyTracker');
    if (!panel) return;

    const target = data.macroTarget || {};
    const defaults = data.trackerDefaults || {};
    const slots = defaults.mealSlots || ['Breakfast', 'Lunch', 'Dinner', 'High-protein snack'];
    const state = getTrackerState();

    panel.innerHTML = `
        <div class="tracker-head">
            <div>
                <span class="section-kicker">Today</span>
                <h2>Daily check-in</h2>
            </div>
            <span class="date-pill">${todayKey()}</span>
        </div>
        <div class="meal-checks">
            ${slots.map(slot => `
                <label>
                    <input type="checkbox" data-tracker-meal="${slot}" ${state.meals?.[slot] ? 'checked' : ''}>
                    <span>${slot}</span>
                </label>
            `).join('')}
        </div>
        <div class="tracker-inputs">
            ${trackerInput('calories', 'Calories', state.calories, target.calories)}
            ${trackerInput('protein', 'Protein', state.protein, target.protein, 'g')}
            ${trackerInput('carbs', 'Carbs', state.carbs, target.carbs, 'g')}
            ${trackerInput('fat', 'Fat', state.fat, target.fat, 'g')}
            ${trackerInput('water', 'Water', state.water, defaults.waterGoalOz || 100, 'oz')}
            ${trackerInput('weight', 'Weight', state.weight, null, 'lb')}
        </div>
        <label class="workout-check">
            <input type="checkbox" id="workoutDone" ${state.workout ? 'checked' : ''}>
            <span>${defaults.workoutGoal || 'Complete planned workout'}</span>
        </label>
        <div class="tracker-progress" id="trackerProgress"></div>
    `;

    panel.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateTrackerFromInputs);
        input.addEventListener('change', updateTrackerFromInputs);
    });
    updateTrackerProgress(state, target, defaults);
}

function trackerInput(key, label, value, target, unit = '') {
    const targetText = target ? `<span>/${target}${unit}</span>` : '';
    return `
        <label class="tracker-field">
            <span>${label}</span>
            <div>
                <input type="number" min="0" step="${key === 'weight' ? '0.1' : '1'}" data-tracker="${key}" value="${value ?? ''}">
                ${targetText}
            </div>
        </label>
    `;
}

function updateTrackerFromInputs() {
    const panel = document.getElementById('dailyTracker');
    const state = getTrackerState();

    panel.querySelectorAll('[data-tracker]').forEach(input => {
        const key = input.dataset.tracker;
        state[key] = key === 'weight' ? input.value : Number(input.value || 0);
    });

    panel.querySelectorAll('[data-tracker-meal]').forEach(input => {
        state.meals[input.dataset.trackerMeal] = input.checked;
    });

    state.workout = document.getElementById('workoutDone')?.checked || false;
    saveTrackerState(state);
    updateTrackerProgress(state, planData.macroTarget || {}, planData.trackerDefaults || {});
}

function updateTrackerProgress(state, target, defaults) {
    const progress = document.getElementById('trackerProgress');
    if (!progress) return;

    const rows = [
        ['Calories', state.calories || 0, target.calories || 0, ''],
        ['Protein', state.protein || 0, target.protein || 0, 'g'],
        ['Carbs', state.carbs || 0, target.carbs || 0, 'g'],
        ['Fat', state.fat || 0, target.fat || 0, 'g'],
        ['Water', state.water || 0, defaults.waterGoalOz || 100, 'oz']
    ];

    progress.innerHTML = rows.map(([label, value, goal, unit]) => {
        const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
        return `
            <div class="progress-row">
                <div><span>${label}</span><strong>${value}${unit} / ${goal}${unit}</strong></div>
                <div class="progress-track"><span style="width: ${pct}%"></span></div>
            </div>
        `;
    }).join('');
}

function renderRecipeLibrary(recipes) {
    const tabs = document.getElementById('recipeTabs');
    const library = document.getElementById('recipeLibrary');
    if (!tabs || !library) return;

    const categories = ['All', ...new Set(recipes.map(recipe => recipe.category))];
    tabs.innerHTML = categories.map(category => `
        <button class="library-tab ${category === 'All' ? 'active' : ''}" data-category="${category}">${category}</button>
    `).join('');

    tabs.querySelectorAll('.library-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.querySelectorAll('.library-tab').forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            renderRecipeCards(recipes, tab.dataset.category);
        });
    });

    renderRecipeCards(recipes, 'All');
}

function renderRecipeCards(recipes, category) {
    const library = document.getElementById('recipeLibrary');
    const filtered = category === 'All' ? recipes : recipes.filter(recipe => recipe.category === category);

    library.innerHTML = filtered.map(recipe => `
        <article class="library-card">
            <div class="library-card-head">
                <span>${recipe.category}</span>
                <strong>${recipe.prepTime} min</strong>
            </div>
            <h3>${recipe.name}</h3>
            <p>${recipe.source}</p>
            <div class="macro-card compact">
                <span><strong>${recipe.macroPerServing.calories}</strong> cal</span>
                <span><strong>${recipe.macroPerServing.protein}g</strong> protein</span>
                <span><strong>${recipe.macroPerServing.carbs}g</strong> carbs</span>
                <span><strong>${recipe.macroPerServing.fat}g</strong> fat</span>
            </div>
            <details>
                <summary>Ingredients and steps</summary>
                <ul>${recipe.ingredients.map(item => `<li>${item}</li>`).join('')}</ul>
                <ol>${recipe.instructions.map(step => `<li>${step}</li>`).join('')}</ol>
            </details>
        </article>
    `).join('');
}

function renderApprovedFoods(data) {
    const approved = document.getElementById('approvedFoods');
    const swaps = document.getElementById('proteinSwaps');
    if (!approved || !swaps) return;

    const foods = data.approvedFoods || {};
    approved.innerHTML = `
        <span class="section-kicker">Approved foods</span>
        <h2>Build-a-plate list</h2>
        <div class="food-columns">
            ${Object.entries(foods).map(([group, items]) => `
                <div>
                    <h3>${group}</h3>
                    <ul>${items.slice(0, 12).map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            `).join('')}
        </div>
    `;

    swaps.innerHTML = `
        <span class="section-kicker">Protein swaps</span>
        <h2>30g quick picks</h2>
        <div class="swap-list">
            ${(data.proteinEquivalents || []).map(item => `
                <div><strong>${item.food}</strong><span>${item.serving}</span></div>
            `).join('')}
        </div>
    `;
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
                ${meal.macroPerServing ? `
                    <div class="macro-card">
                        <span><strong>${meal.macroPerServing.calories}</strong> cal</span>
                        <span><strong>${meal.macroPerServing.protein}g</strong> protein</span>
                        <span><strong>${meal.macroPerServing.carbs}g</strong> carbs</span>
                        <span><strong>${meal.macroPerServing.fat}g</strong> fat</span>
                    </div>
                    ${meal.macroFit ? `<div class="macro-fit">${meal.macroFit}</div>` : ''}
                ` : ''}
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
