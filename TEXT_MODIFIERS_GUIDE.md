# Text Modifiers Guide
**Inline Formatting for Ticker & Popup Messages**

## Overview

You can now use simple markdown-like syntax to add **standard** and **animated** text effects to your ticker and popup messages. Text modifiers work inline within any message and can be combined for powerful visual impact.

---

## Standard Modifiers

### **Bold Text**
**Syntax:** `**text**`  
**Example:** `This is **BREAKING NEWS** from our studio`  
**Effect:** Bold font weight

### *Italic Text*
**Syntax:** `*text*`  
**Example:** `Check out our *new* sponsor`  
**Effect:** Italic text style

### <u>Underline Text</u>
**Syntax:** `__text__`  
**Example:** `Join us __live__ at 8pm`  
**Effect:** Underlined text with offset

### ~~Strikethrough Text~~
**Syntax:** `~~text~~`  
**Example:** `~~Old price $50~~ Now only $30!`  
**Effect:** Line through text with reduced opacity

---

## Animated Modifiers

### 🌈 Rainbow Wave
**Syntax:** `***text***`  
**Example:** `***GRAND OPENING***`  
**Effect:** Smooth rainbow gradient that waves across the text
- Multi-color gradient (pink → orange → gold → green → blue → purple)
- Continuous animation
- Perfect for announcements and celebrations

### ✨ Glow Pulse
**Syntax:** `^^^^text^^^^`  
**Example:** `^^^^LIVE NOW^^^^`  
**Effect:** Gold glowing text with pulsing intensity
- Pulsing glow effect
- Gold accent color
- Great for live indicators

### ⚡ Shimmer Slide
**Syntax:** `~~~~text~~~~`  
**Example:** `~~~~Premium Content~~~~`  
**Effect:** Glossy shimmer that slides across text
- Smooth light reflection effect
- Creates luxury/premium feel
- Subtle but eye-catching

### 💫 Pulse Scale
**Syntax:** `@@text@@`  
**Example:** `@@SUBSCRIBE NOW@@`  
**Effect:** Text pulses with scale and opacity changes
- Rhythmic pulsing
- Gold accent color
- Good for calls-to-action

### 🎨 Highlight
**Syntax:** `##text##`  
**Example:** `Win ##$1000## in our giveaway`  
**Effect:** Gold gradient background highlight
- Dark text on gold background
- Box shadow glow
- Makes text pop visually

### 👻 Fade Cycle
**Syntax:** `%%text%%`  
**Example:** `%%Coming Soon%%`  
**Effect:** Text fades in and out continuously
- Smooth opacity transition
- Gentle attention grabber
- Subtle animation

### ✨ Sparkle Float
**Syntax:** `$$text$$`  
**Example:** `$$Winner Announced$$`  
**Effect:** Text with floating sparkle emoji
- Animated sparkle (✨) that floats up
- Gold accent color
- Celebratory feel

### 🌑 Deep Shadow
**Syntax:** `===text===`  
**Example:** `===DRAMATIC ENTRANCE===`  
**Effect:** Layered dark shadows for depth
- Multiple shadow layers
- Creates 3D depth effect
- Bold and dramatic

### 💙 Neon Flicker
**Syntax:** `+++text+++`  
**Example:** `+++CYBERPUNK VIBES+++`  
**Effect:** Cyan neon sign with realistic flicker
- Electric cyan color
- Flickers like a real neon sign
- Retro/futuristic aesthetic

### 🌊 Wave Motion
**Syntax:** `~~~text~~~`  
**Example:** `~~~DANCING TEXT~~~`  
**Effect:** Each letter bounces up and down in sequence
- Character-by-character wave animation
- Staggered timing
- Playful and dynamic

---

## Combining Modifiers

You can **nest** and **combine** modifiers for unique effects!

### Examples:

**Bold + Rainbow:**
```
**Look at this ***AMAZING*** deal!**
```
Result: Bold text with "AMAZING" in animated rainbow

**Italic + Glow:**
```
*Now ^^^^LIVE^^^^*
```
Result: Italic text with glowing "LIVE"

**Highlight + Bold:**
```
##**50% OFF**## everything in store
```
Result: Bold text inside gold highlight box

**Multiple effects:**
```
***SUPER*** @@SALE@@ - $$Everything Must Go$$
```
Result: Rainbow "SUPER", pulsing "SALE", sparkling "Everything Must Go"

---

## Practical Examples

### Ticker Messages:

**Breaking News:**
```
***BREAKING*** - ^^^^LIVE^^^^ coverage starts now
```

**Product Launch:**
```
##New Product## launching **tonight** at @@8PM@@
```

**Sponsorship:**
```
This stream brought to you by ~~~~Premium Sponsor~~~~
```

**Giveaway:**
```
$$WIN BIG$$ - Enter now for ***EXCLUSIVE PRIZES***
```

**Event Countdown:**
```
+++LIVE IN 5 MINUTES+++ - @@Don't Miss It@@
```

**Sale Announcement:**
```
~~$100~~ Now **$49.99** - ##Limited Time##
```

### Popup Messages:

**Welcome Message:**
```
***WELCOME*** to the stream! @@Subscribe@@ for more content
```

**Alert:**
```
^^^^ALERT^^^^: $$Special Guest$$ appearing in **5 minutes**
```

**Thank You:**
```
##THANK YOU## for the ~~~~generous donation~~~~
```

**Call to Action:**
```
===JOIN US=== every **Monday** at @@7PM ET@@
```

**Celebration:**
```
***🎉 MILESTONE REACHED 🎉*** - $$1000 Followers$$
```

---

## Best Practices

### 1. **Don't Overdo It**
- Use 1-3 modifiers per message maximum
- Too many effects = visual chaos
- Let key words stand out

### 2. **Match Effect to Purpose**
- **Rainbow** → Celebrations, announcements, excitement
- **Glow** → Live indicators, urgent items
- **Shimmer** → Premium content, sponsors
- **Pulse** → Calls-to-action, important info
- **Highlight** → Numbers, prices, key facts
- **Neon** → Modern/tech themes, futuristic vibes
- **Wave** → Fun, playful content

### 3. **Readability First**
- Ensure text is still easy to read
- Test on actual overlay before going live
- Some effects work better with ALL CAPS

### 4. **Performance**
- All animations are GPU-accelerated
- No performance impact even with multiple effects
- Safe to use many modifiers across messages

### 5. **Accessibility**
- Effects are purely visual
- Screen readers will read the plain text
- All text remains selectable

---

## Technical Details

### How It Works:
1. Messages are parsed for modifier patterns
2. Text is wrapped in `<span>` elements with CSS classes
3. CSS animations handle all visual effects
4. Caching ensures high performance

### Performance:
- ✅ GPU-accelerated CSS animations
- ✅ Parsed results are cached
- ✅ No JavaScript animation loops
- ✅ Minimal CPU usage
- ✅ Works smoothly with unlimited messages

### Browser Compatibility:
- ✅ Chrome/Edge (90+)
- ✅ Firefox (88+)
- ✅ Safari (14+)
- ✅ OBS Browser Source
- ⚠️ Older browsers may show plain text (graceful degradation)

### Limitations:
- Modifiers cannot span across accent words
- Some effects may be subtle on light backgrounds
- Wave effect limited to 10 characters (more will still work but won't wave)

---

## Quick Reference Chart

| Syntax | Effect | Type | Best For |
|--------|--------|------|----------|
| `**text**` | Bold | Standard | Emphasis |
| `*text*` | Italic | Standard | Subtle emphasis |
| `__text__` | Underline | Standard | Links, names |
| `~~text~~` | Strikethrough | Standard | Old prices, corrections |
| `***text***` | Rainbow Wave | Animated | Celebrations |
| `^^^^text^^^^` | Glow Pulse | Animated | Live indicators |
| `~~~~text~~~~` | Shimmer Slide | Animated | Premium content |
| `@@text@@` | Pulse Scale | Animated | CTAs |
| `##text##` | Highlight | Animated | Key info |
| `%%text%%` | Fade Cycle | Animated | Coming soon |
| `$$text$$` | Sparkle Float | Animated | Winners |
| `===text===` | Deep Shadow | Animated | Drama |
| `+++text+++` | Neon Flicker | Animated | Tech/Retro |
| `~~~text~~~` | Wave Motion | Animated | Fun/Playful |

---

## Examples by Use Case

### 🎮 Gaming Stream:
```
***GG WP*** - @@Next Game@@ starts in **2 minutes**
```

### 🎵 Music Stream:
```
Now playing: ~~~~Artist Name~~~~ - **Song Title**
```

### 🛍️ Shopping/E-commerce:
```
##Flash Sale## - ~~$99.99~~ **$49.99** - $$Limited Stock$$
```

### 📺 News/Talk Show:
```
***BREAKING*** - ^^^^LIVE COVERAGE^^^^ - **Major Update**
```

### 🎨 Creative/Art:
```
Watch me create ===something amazing=== **LIVE**
```

### 🏆 Competition/Tournament:
```
***FINALS*** @@NOW@@ - $$Grand Prize: $10,000$$
```

### 💬 Chat/Community:
```
##Moderator## *Username* is now **live**
```

### 🎓 Educational:
```
**Lesson 5:** ~~~~Advanced Techniques~~~~ - *Live Q&A*
```

---

## Tips & Tricks

### Layering Effects:
```
**Bold and ***rainbow*** together**
```
Creates bold text with rainbow word inside

### Accent Words + Modifiers:
You can still use accent words! They work alongside modifiers:
```
Message: "***LIVE*** coverage of the event"
Accent Words: "event"
Result: Rainbow "LIVE" + gold accent on "event"
```

### Testing Effects:
Add a test message in your dashboard:
```
***Rainbow*** ^^^^Glow^^^^ ~~~~Shimmer~~~~ @@Pulse@@ ##Highlight## %%Fade%% $$Sparkle$$ ===Shadow=== +++Neon+++ ~~~Wave~~~
```
This shows all animated effects at once for preview.

### Keyboard Shortcuts:
Most modifiers use repeated symbols on your keyboard:
- Shift + 8 = `*` (asterisk)
- Shift + 6 = `^` (caret)
- Shift + ` = `~` (tilde)
- Shift + 3 = `#` (hash)
- Shift + 2 = `@` (at)
- Shift + 4 = `$` (dollar)
- Shift + = = `+` (plus)

---

## Troubleshooting

**Q: Modifiers not showing?**  
A: Clear browser cache and refresh overlay

**Q: Text looks weird?**  
A: Check for unclosed modifiers (e.g., `**bold` instead of `**bold**`)

**Q: Performance issues?**  
A: Reduce number of simultaneous animated effects (3-4 max recommended)

**Q: Effect not visible in OBS?**  
A: Ensure OBS Browser Source is using hardware acceleration

**Q: Can I disable all animations?**  
A: Standard modifiers (bold, italic, etc.) will always work. Animations require CSS support.

---

## Future Additions

Potential future modifiers:
- `<<<text>>>` - Slide in/out
- `{{{text}}}` - Shake/vibrate
- `^^^text^^^` - Float up
- `|||text|||` - Glitch effect
- `:::text:::` - Matrix style

Have suggestions? Let us know!

---

**Happy Streaming! 🎬✨**
