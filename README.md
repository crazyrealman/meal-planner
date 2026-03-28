# 🍽️ Weekly Meal Planner

A simple local web interface for weekly meal planning based on grocery store sales.

## Quick Start

Run from the meal-planner directory:

```bash
# Option 1: Python (usually pre-installed on Mac)
cd /Users/sonofanton3.0/clawd/meal-planner
python3 -m http.server 8080

# Option 2: Node.js
npx serve -p 8080
```

Then open: **http://localhost:8080**

## How It Works

1. **Every Sunday morning**, Son of Anton checks Harris Teeter and Aldi sales in Belmont
2. Finds protein deals and builds 5-6 dinner options
3. Updates `data/weekly-meals.json` with the week's meals
4. You open the web interface and pick your dinners for the week
5. Shopping list auto-generates based on selections

## Meal Criteria

- ✅ 4-6 oz protein per person
- ✅ Vegetable + complex carb
- ✅ Clean eating (whole foods, minimal processed)
- ✅ Under 30 min prep time
- ✅ Serves 5

## Features

- **Filter by protein type** (chicken, beef, pork, seafood)
- **Select meals** to add to your weekly plan
- **Auto-generated shopping list** grouped by store
- **Mobile-friendly** for checking at the store
- **Saves selections** in browser storage

## Files

- `index.html` - Main page
- `styles.css` - Styling
- `app.js` - Application logic
- `data/weekly-meals.json` - This week's meal options (updated Sundays)
