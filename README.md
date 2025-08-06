![FauxPost Banner](/images/FauxPostImage.png)
# FauxPost 🕵️‍♂️✨

**FauxPost** is a Chrome Extension that allows users to creatively rewrite the appearance of LinkedIn posts, without altering the original content or changing how others see it by default. It provides a client-side way to explore parody, commentary, or playful customisation.

Users can modify the text of LinkedIn posts for personal use or share tailored versions with other FauxPost users via a link. This supports light-hearted reinterpretations, social commentary, or even interactive post trails, all while leaving the original post untouched and LinkedIn’s functionality intact.

> ⚠️ Note: FauxPost does not interfere with LinkedIn’s systems, alter stored data, or introduce unauthorised behaviour. All changes are purely visual and are only visible to users who have installed the extension.

---

## 🧩 How to Use FauxPost
1. **Install FauxPost**
   To install the FauxPost Chrome Extension, go to https://chromewebstore.google.com/detail/fauxpost/albklnhkabkccdpdimjnnlbppakgfgna and click the **"Add To Chrome"** button.
   
2. **Enable the FauxPost Extension**  
   Make sure the FauxPost Chrome Extension is switched on.  
   - Click the FauxPost icon in your browser toolbar to open its popup. Shown in red below.  
   - In the popup, you can toggle the extension **on or off**. Shown in blue below.  
   - It also displays how many FauxPosts you've saved and gives you the option to delete them.
   ![FauxPost Settings Popup](/images/SettingsPopup.png)

3. **Find a LinkedIn Post to Edit**  
   Once enabled, FauxPost buttons will appear underneath LinkedIn posts as you browse.  
   These buttons are only visible when the extension is active. You can see a button surrounded by a green box below.
   
   <img src="/images/FauxPostButton.png" alt="FauxPost Button" width="400">

4. **Click the FauxPost Button**  
   Under the post you want to edit, click the **"FauxPost"** button.  
   This opens the FauxPost editing popup.
   
   <img src="/images/FauxPostPopupFirstLoad.png" alt="FauxPost Popup" width="600">

5. **Read the Original Content**  
   The top text box in the popup displays the original LinkedIn post.  
   This field is read-only and shows what will be visually replaced.

6. **Enter Your FauxPost Version**  
   In the **“FauxPost Text”** box, type your alternative version of the post. This can be seen in the green box below.
   You will also see the **"Key"** field change (in the blue box) and the **"FauxPost URL"** field change (in the red box).

   <img src="/images/FauxPostPopupEditText.png" alt="FauxPost Popup Edit Text" width="600">

7. **Apply the FauxPost**  
   To apply the FauxPost, click the **“FauxPost”** button.  
   This change is only visible to you (and others using FauxPost with the shared URL).
   See the image below and compare the text to the previous images.

   <img src="/images/FauxPostChangePost.png" alt="FauxPost Button" width="500">


8. **Copy the URL**  
   Click the **“Copy URL”** button to copy the link to your clipboard (surrounded by the green box).
   A message will appear with links to **TinyURL** and **Bitly** in case you'd like to shorten the link (some can be very long). This can be seen surrounded by a blue box below.
   Note: the popup can be resized and also be scrolled so that it will work with any screen size. You can see the scrolling below.

   <img src="/images/FauxPostCopyURLButton.png" alt="FauxPost Copy URL Button" width="500">

9. **Revert to the Original Post**  
   Click the **“Original”** button to restore the original version of the post, which can be seen below.
    
   <img src="/images/FauxPostRevertToOriginal.png" alt="FauxPost Revert To Original" width="400">

10. **Open SharedURL**
   If you receive a FauxPost URL from someone, simply install the extension from https://chromewebstore.google.com/detail/fauxpost/albklnhkabkccdpdimjnnlbppakgfgna, then open the URL in your browser. Here's the URL to the example shown in this guide...

   https://tinyurl.com/27xbkkxn
      


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
