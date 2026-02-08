# 🚀 Quick Start Guide - Chart-Enabled Chatbot

## ⚡ Start in 3 Steps

### 1. Start Server
```bash
cd c:\Users\taman\knowledge-center
npm run dev
```

### 2. Upload Test Data
1. Open browser: `http://localhost:3000`
2. Navigate to `/import`
3. Upload `TEST_DATA_CHARTS.md`

### 3. Test Chatbot
1. Go to `/chatbot`
2. Ask: **"Compare maximum machine speed by model"**
3. You should see a **BAR CHART** with machine speeds!

---

## 📊 Chart Examples

### Bar Chart
**Question**: "Compare revenue by region"
**Result**: Bar chart showing revenue for each region

### Line Chart
**Question**: "Show sales trend over the last 6 months"
**Result**: Line chart showing sales progression

### Pie Chart
**Question**: "What is the market share distribution?"
**Result**: Pie chart showing percentage breakdown

### Area Chart
**Question**: "Display cumulative revenue growth"
**Result**: Area chart showing growth over time

---

## ✅ Test Questions (Copy-Paste Ready)

```
Compare maximum machine speed by model
```

```
Show me revenue by region
```

```
What are the prices of different paper cup machines?
```

```
Display power consumption by machine
```

```
Show market share breakdown
```

---

## 🎯 Keywords That Trigger Charts

- **compare**, **vs**, **versus**
- **show**, **display**, **chart**, **graph**
- **breakdown**, **distribution**, **share**
- **trend**, **over time**, **progression**
- **maximum**, **minimum**, **average**, **total**

---

## 🔍 Debugging

### If Charts Don't Appear:

1. **Check Browser Console** (F12):
   ```javascript
   // Look for chart data in logs
   ```

2. **Verify Data Has Numbers**:
   - Open uploaded file in `/database`
   - Ensure numeric values exist

3. **Try Simpler Questions**:
   - ❌ "tell me about data"
   - ✅ "compare sales by product"

### Common Issues:

| Issue | Solution |
|-------|----------|
| No chart appears | Use words like "compare", "show", "chart" |
| Wrong chart type | Be specific: "show BAR chart of..." |
| Empty chart | Ensure data has numeric values |
| Slow response | Normal - Gemini is generating insights |

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/components/ChartRenderer.tsx` | Chart display logic |
| `src/lib/insight-prompt.ts` | AI instructions for charts |
| `src/app/chatbot/page.tsx` | Chatbot UI with charts |
| `TEST_DATA_CHARTS.md` | Sample data to upload |
| `IMPLEMENTATION_SUMMARY.md` | Full documentation |

---

## 🎨 Chart Customization

To change chart colors, edit:
```typescript
// src/components/ChartRenderer.tsx
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
```

To adjust chart height, edit:
```typescript
// src/components/ChartRenderer.tsx
<div className="h-80 w-full">  // Change h-80 to h-96, etc.
```

---

## 💾 Export Reports

Click **"Save Report"** button to download PDF with:
- ✅ All chat messages
- ✅ Analytical insights
- ✅ Charts as images
- ✅ Timestamps

---

## 🔄 Update Flow

```
Question → Database → Context → Gemini → Insight + Chart → Display
```

**Average Response Time**: 3-5 seconds
**Max Chart Data Points**: 10 (recommended: 5-7)
**Supported Chart Types**: 4 (bar, line, pie, area)

---

## 🎓 Advanced Tips

### Get Better Charts:
1. **Be specific**: Mention exact fields
2. **Use numbers**: Ask for quantitative data
3. **Request comparisons**: Use "compare X by Y"
4. **Specify chart type**: "show bar chart of..."

### Question Templates:
```
Compare [METRIC] by [CATEGORY]
Show [METRIC] trend over time
Display [METRIC] distribution
What is the breakdown of [METRIC] by [CATEGORY]
```

---

## 📞 Need Help?

1. Check `IMPLEMENTATION_SUMMARY.md` for overview
2. Read `CHART_IMPLEMENTATION_GUIDE.md` for details
3. Use `src/lib/chart-debug.ts` for debugging
4. Check browser console (F12) for errors

---

**Quick Test**: Run `npm run dev`, go to `/chatbot`, ask "Compare revenue by region"

Should see: ✅ Text insights + ✅ Bar chart
