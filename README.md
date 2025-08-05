# FauxPost 🕵️‍♂️✨

**FauxPost** is a satirical Chrome Extension that lets you rewrite the *appearance* of LinkedIn posts — without modifying the original content. It’s a tool for creative commentary, parody, and playful edits, giving you the power to present social posts with an alternate message while leaving the original untouched.

> ⚠️ Note: FauxPost does not modify LinkedIn’s backend or affect what others see natively. It overlays changes for you and other FauxPost users only.

---

## 🧩 How It Works

1. **Browse LinkedIn** as normal.
2. Next to eligible posts, you’ll see a new **“FauxPost”** button.
3. Click the button to open a popup:
   - View the original content
   - Rewrite the post however you like
   - Save and generate a unique `vkey` link
4. Share the new URL:
   - Anyone with FauxPost installed will see your custom message instead of the original
   - The original poster and other users will not be affected

---

## 🚀 Features

- ✍️ **Live editing** of visible LinkedIn post content
- 🔗 **Sharable URLs** for your rewritten versions
- 🔒 **Content is stored locally** in the browser — no external server required
- 📦 **No tracking, no analytics, no nonsense**
- 🧠 **Intended for satire, commentary, or just plain fun**

---

## 🔧 Developer Details

This project includes:
- `src/` – All core source code
- `src/images/` – Icons and assets
- `dist/` – Minified, ready-to-install version of the extension (optional)
- `manifest.json` – Chrome Extension manifest (v3)
- `README.md` – You’re reading it

See the `src/` folder for:

- `content-script.js` — Injected into the LinkedIn feed
- `fauxPost_enabled.html` — The popup interface
- `fauxPost_enabled.js` — Logic for the editor UI
- `background.js` — Background process (if used)
- *(Optionally)* `utils.js` — Reusable helper functions

---

## 🖼️ Screenshots

<!-- Add screenshots here -->
- Editor Popup
- Original vs FauxPost View
- FauxPost button on a post

---

## 📦 Installation (Unpacked)

1. Clone or download this repository.
2. In Chrome, go to `chrome://extensions/`
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `src/` or `dist/` folder.
5. Open LinkedIn and look for the FauxPost button on posts.

---

## 📜 License

This project is licensed under the **MIT License**. Attribution is appreciated. See [`LICENSE`](LICENSE) for details.

---

## 💬 Why FauxPost?

FauxPost was built as a playful critique of social media performativity — a tool to **decode the humblebrag**, **mock the nonsense**, or **say what we’re all thinking**, but in your own words.

Ideal for:
- Satirists
- Observational comedians
- Job seekers with a sense of humor
- Anyone tired of “influencer-speak”

---

## 🙋‍♂️ Author

Created by [Your Name]  
[LinkedIn] | [Website] | [GitHub]

*Built in desperation. Released in hope.*
