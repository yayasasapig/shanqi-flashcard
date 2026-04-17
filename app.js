// ============================================================
// 山啟快閃卡牌 - Flashcard App
// ============================================================

const MiniMax_API_KEY = 'sk-cp-LAFqJ8zoM0LEHwXy4-7T1Fe-OMI-j-5y4IUFhAi_48AJdCE-ttvdzS0rQoDwkzjjJh1DUwz5PBci3Opntg3jRBw05LINQaVAInpiWDzkFfyLtjYDXPLtC98';
const MiniMax_ENDPOINT = 'https://api.minimax.io/v1/image_generation';
const MiniMax_MODEL = 'anycouple-01';

// ============================================================
// State
// ============================================================
let cards = [];
let activeCardIndex = -1;
let cardsPerPage = 6;
let cardIdCounter = 0;

// ============================================================
// Init
// ============================================================
function init() {
  // Add 3 default cards
  addCard();
  addCard();
  addCard();
  renderCardList();
  selectCard(0);
  renderPreview();

  document.getElementById('addCardBtn').addEventListener('click', () => {
    addCard();
    renderCardList();
    selectCard(cards.length - 1);
    renderPreview();
  });

  document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);

  // Per-page buttons
  document.querySelectorAll('.per-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.per-page-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cardsPerPage = parseInt(btn.dataset.count);
      renderPreview();
    });
  });
}

// ============================================================
// Card Management
// ============================================================
function addCard() {
  cards.push({
    id: cardIdCounter++,
    image: null,        // base64 data URL or null
    imageSource: null,  // 'upload' or 'ai'
    zh: '',
    en: '',
    showImage: true,
    showZh: true,
    showEn: true,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
    fontFamily: 'PingFang TC'
  });
}

function deleteCard(index) {
  cards.splice(index, 1);
  if (activeCardIndex >= cards.length) {
    activeCardIndex = cards.length - 1;
  }
  if (cards.length === 0) {
    addCard();
    activeCardIndex = 0;
  }
  renderCardList();
  if (activeCardIndex >= 0) selectCard(activeCardIndex);
  else renderPreview();
  renderPreview();
}

function selectCard(index) {
  activeCardIndex = index;
  renderCardList();
  renderCardEditor();
}

function renderCardList() {
  const container = document.getElementById('cardList');
  container.innerHTML = '';
  cards.forEach((card, i) => {
    const item = document.createElement('div');
    item.className = 'card-list-item' + (i === activeCardIndex ? ' active' : '');
    item.onclick = (e) => {
      if (!e.target.classList.contains('card-delete-btn')) selectCard(i);
    };

    const thumb = card.image
      ? `<img class="card-thumb" src="${card.image}" alt="thumb">`
      : `<div class="card-thumb-placeholder">🃏</div>`;

    const name = card.zh || card.en || `卡片 ${i + 1}`;
    const lang = [card.zh && '中文', card.en && '英文'].filter(Boolean).join(' / ') || '未填';

    item.innerHTML = `
      ${thumb}
      <div class="card-info">
        <div class="card-info-name">${name}</div>
        <div class="card-info-lang">${lang}</div>
      </div>
      <button class="card-delete-btn" title="刪除">✕</button>
    `;

    item.querySelector('.card-delete-btn').onclick = (e) => {
      e.stopPropagation();
      deleteCard(i);
    };

    container.appendChild(item);
  });
}

// ============================================================
// Card Editor
// ============================================================
function renderCardEditor() {
  const container = document.getElementById('cardEditor');
  if (activeCardIndex < 0 || activeCardIndex >= cards.length) {
    container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">請先選擇一張卡片</p>';
    return;
  }

  const card = cards[activeCardIndex];

  container.innerHTML = `
    <div class="editor-row">
      <label>圖像</label>
      <div class="image-section">
        <div class="image-btn-row">
          <button class="image-btn ai-btn" id="aiImageBtn">🤖 AI 生成</button>
          <button class="image-btn" id="uploadImageBtn">📤 上載圖片</button>
          <button class="image-btn" id="clearImageBtn">🗑️ 清除</button>
        </div>
        <div class="ai-prompt-row">
          <input type="text" id="aiPromptInput" placeholder="輸入提示詞，例如：Cute panda, bright colors...">
        </div>
        <div class="ai-generate-row">
          <button class="btn-generate" id="generateImageBtn">✨ 生成圖像</button>
        </div>
        ${card.image
          ? `<img class="image-preview" id="imagePreview" src="${card.image}" alt="preview">`
          : `<div class="image-placeholder" id="imagePlaceholder"><span>🖼️</span><span>尚無圖像</span></div>`
        }
      </div>
      <input type="file" id="fileInput" accept="image/jpeg,image/png" style="display:none">
    </div>

    <div class="editor-row">
      <label>中文文字</label>
      <input type="text" id="zhInput" value="${escapeHtml(card.zh)}" placeholder="輸入繁體中文">
    </div>

    <div class="editor-row">
      <label>英文文字</label>
      <input type="text" id="enInput" value="${escapeHtml(card.en)}" placeholder="Enter English text">
    </div>

    <div class="editor-row">
      <label>顯示設定</label>
      <div class="text-controls">
        <div class="text-toggle-row">
          <label class="text-toggle ${card.showImage ? 'active' : ''}" id="toggleShowImage">
            <input type="checkbox" ${card.showImage ? 'checked' : ''}> 🖼️ 圖像
          </label>
          <label class="text-toggle ${card.showZh ? 'active' : ''}" id="toggleShowZh">
            <input type="checkbox" ${card.showZh ? 'checked' : ''}> 中文
          </label>
          <label class="text-toggle ${card.showEn ? 'active' : ''}" id="toggleShowEn">
            <input type="checkbox" ${card.showEn ? 'checked' : ''}> EN
          </label>
        </div>
      </div>
    </div>

    <div class="editor-row">
      <label>文字編輯</label>
      <div class="text-controls">
        <div class="text-controls-grid">
          <div>
            <label style="font-size:0.75rem;color:var(--text-light)">字體</label>
            <select class="font-select" id="fontFamilySelect">
              <option value="PingFang TC" ${card.fontFamily === 'PingFang TC' ? 'selected' : ''}>PingFang TC</option>
              <option value="Microsoft JhengHei" ${card.fontFamily === 'Microsoft JhengHei' ? 'selected' : ''}>Microsoft JhengHei</option>
              <option value="Arial Unicode MS" ${card.fontFamily === 'Arial Unicode MS' ? 'selected' : ''}>Arial Unicode MS</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.75rem;color:var(--text-light)">粗幼</label>
            <select class="font-select" id="fontWeightSelect">
              <option value="normal" ${card.fontWeight === 'normal' ? 'selected' : ''}>正常</option>
              <option value="bold" ${card.fontWeight === 'bold' ? 'selected' : ''}>粗體</option>
            </select>
          </div>
        </div>
        <div class="font-size-row">
          <label style="font-size:0.75rem;color:var(--text-light)">字體大小</label>
          <input type="range" id="fontSizeRange" min="10" max="36" value="${card.fontSize}">
          <span id="fontSizeValue">${card.fontSize}px</span>
        </div>
        <div class="text-align-row">
          <button class="align-btn ${card.textAlign === 'left' ? 'active' : ''}" data-align="left" title="靠左">⬅ 左</button>
          <button class="align-btn ${card.textAlign === 'center' ? 'active' : ''}" data-align="center" title="置中">⬌ 中</button>
          <button class="align-btn ${card.textAlign === 'right' ? 'active' : ''}" data-align="right" title="靠右">➡ 右</button>
        </div>
      </div>
    </div>
  `;

  // Bind events
  document.getElementById('zhInput').addEventListener('input', (e) => {
    cards[activeCardIndex].zh = e.target.value;
    renderCardList();
    renderPreview();
  });

  document.getElementById('enInput').addEventListener('input', (e) => {
    cards[activeCardIndex].en = e.target.value;
    renderCardList();
    renderPreview();
  });

  // Toggle buttons
  ['Image', 'Zh', 'En'].forEach(field => {
    const btn = document.getElementById('toggleShow' + field);
    btn.addEventListener('click', () => {
      const key = 'show' + field;
      cards[activeCardIndex][key] = !cards[activeCardIndex][key];
      btn.classList.toggle('active', cards[activeCardIndex][key]);
      btn.querySelector('input').checked = cards[activeCardIndex][key];
      renderPreview();
    });
  });

  // Font controls
  document.getElementById('fontFamilySelect').addEventListener('change', (e) => {
    cards[activeCardIndex].fontFamily = e.target.value;
    renderPreview();
  });

  document.getElementById('fontWeightSelect').addEventListener('change', (e) => {
    cards[activeCardIndex].fontWeight = e.target.value;
    renderPreview();
  });

  document.getElementById('fontSizeRange').addEventListener('input', (e) => {
    cards[activeCardIndex].fontSize = parseInt(e.target.value);
    document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
    renderPreview();
  });

  // Text align
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cards[activeCardIndex].textAlign = btn.dataset.align;
      document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPreview();
    });
  });

  // Image controls
  document.getElementById('uploadImageBtn').onclick = () => {
    document.getElementById('fileInput').click();
  };

  document.getElementById('fileInput').addEventListener('change', handleFileUpload);

  document.getElementById('clearImageBtn').onclick = () => {
    cards[activeCardIndex].image = null;
    cards[activeCardIndex].imageSource = null;
    renderCardEditor();
    renderCardList();
    renderPreview();
  };

  document.getElementById('generateImageBtn').onclick = generateImage;
}

// ============================================================
// Image Upload & Crop
// ============================================================
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    cropToSquare(ev.target.result).then(dataUrl => {
      cards[activeCardIndex].image = dataUrl;
      cards[activeCardIndex].imageSource = 'upload';
      renderCardEditor();
      renderCardList();
      renderPreview();
    });
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function cropToSquare(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = dataUrl;
  });
}

// ============================================================
// AI Image Generation
// ============================================================
async function generateImage() {
  const prompt = document.getElementById('aiPromptInput').value.trim();
  if (!prompt) {
    showToast('請輸入提示詞', 'error');
    return;
  }

  const btn = document.getElementById('generateImageBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 生成中...';
  showToast('正在生成圖像...', 'info');

  try {
    const response = await fetch(MiniMax_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MiniMax_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MiniMax_MODEL,
        prompt: prompt,
        image_size: '1024x1024',
        num_images: 1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('API error: ' + err);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // Download and crop
    const imgResponse = await fetch(imageUrl);
    const blob = await imgResponse.blob();
    const reader = new FileReader();
    reader.onload = (ev) => {
      cropToSquare(ev.target.result).then(dataUrl => {
        cards[activeCardIndex].image = dataUrl;
        cards[activeCardIndex].imageSource = 'ai';
        renderCardEditor();
        renderCardList();
        renderPreview();
        showToast('✅ 圖像生成成功！', 'success');
        btn.disabled = false;
        btn.textContent = '✨ 生成圖像';
      });
    };
    reader.readAsDataURL(blob);

  } catch (err) {
    console.error(err);
    showToast('生成失敗：' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = '✨ 生成圖像';
  }
}

// ============================================================
// Preview Rendering
// ============================================================
function renderPreview() {
  const container = document.getElementById('previewContainer');
  const pages = Math.ceil(cards.length / cardsPerPage);

  let html = '';

  for (let p = 0; p < pages; p++) {
    const pageCards = cards.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
    html += buildAPage(pageCards);
  }

  container.innerHTML = html;
}

function buildAPage(pageCards) {
  const n = pageCards.length;
  const cols = cardsPerPage <= 1 ? 1 : cardsPerPage <= 2 ? 2 : cardsPerPage <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);

  let gridStyle = `grid-template-columns: repeat(${cols}, 1fr);`;
  if (rows > 1 && cardsPerPage <= 4) {
    gridStyle += `grid-template-rows: repeat(${rows}, 1fr);`;
  }

  let cardsHtml = '';
  pageCards.forEach(card => {
    cardsHtml += buildFlashcard(card);
  });

  return `<div class="a4-page" style="${gridStyle}">${cardsHtml}</div>`;
}

function buildFlashcard(card) {
  const imgHtml = card.showImage
    ? (card.image
        ? `<img class="flashcard-img" src="${card.image}" alt="card">`
        : `<div class="flashcard-img-placeholder">🖼️</div>`)
    : '';

  const zhStyle = `font-size:${card.fontSize}px;font-weight:${card.fontWeight};text-align:${card.textAlign};font-family:'${card.fontFamily}',sans-serif;`;

  const zhHtml = card.showZh ? `<div class="flashcard-zh" style="${zhStyle}">${escapeHtml(card.zh)}</div>` : '';
  const enHtml = card.showEn ? `<div class="flashcard-en" style="${zhStyle.replace(card.fontWeight === 'bold' ? 'font-weight:bold;' : '', '')}font-size:${Math.max(10, card.fontSize - 4)}px;text-align:${card.textAlign};font-family:'${card.fontFamily}',sans-serif;">${escapeHtml(card.en)}</div>` : '';

  return `<div class="flashcard">
    ${imgHtml}
    <div class="flashcard-text">
      ${zhHtml}
      ${enHtml}
    </div>
  </div>`;
}

// ============================================================
// PDF Generation
// ============================================================
async function downloadPDF() {
  showToast('正在生成 PDF...', 'info');
  const downloadBtn = document.getElementById('downloadPdfBtn');
  downloadBtn.disabled = true;
  downloadBtn.textContent = '⏳ 生成中...';

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = 595.28;
    const pageH = 841.89;
    const margin = 24;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;

    const pages = Math.ceil(cards.length / cardsPerPage);
    const cols = cardsPerPage <= 1 ? 1 : cardsPerPage <= 2 ? 2 : cardsPerPage <= 4 ? 2 : 3;

    for (let p = 0; p < pages; p++) {
      if (p > 0) pdf.addPage();

      const pageCards = cards.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
      const n = pageCards.length;
      const rows = Math.ceil(n / cols);

      const cardW = availW / cols;
      const cardH = availH / rows;

      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i];
        const colIdx = i % cols;
        const rowIdx = Math.floor(i / cols);
        const x = margin + colIdx * cardW;
        const y = margin + rowIdx * cardH;

        // Background
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, cardW - 4, cardH - 4, 6, 6, 'FD');

        const imgAreaSize = Math.min(cardW - 8, cardH * 0.55);
        const textAreaTop = y + imgAreaSize + 4;
        const textAreaH = cardH - imgAreaSize - 8;
        const textAreaW = cardW - 8;

        // Image
        if (card.showImage && card.image) {
          try {
            pdf.addImage(card.image, 'JPEG', x + 4, y + 4, imgAreaSize - 4, imgAreaSize - 4);
          } catch (imgErr) {
            console.warn('Image add failed:', imgErr);
          }
        }

        // Text
        const textPadding = 6;
        const textX = x + textPadding;
        const textW = textAreaW - textPadding * 2;
        const textStartY = textAreaTop + textPadding;

        pdf.setFont('Helvetica', card.fontWeight === 'bold' ? 'bold' : 'normal');

        if (card.showZh && card.zh) {
          pdf.setFontSize(card.fontSize);
          pdf.setFont('Helvetica', 'bold');
          pdf.text(card.zh, textX, textStartY + card.fontSize, { maxWidth: textW, align: card.textAlign });
        }

        if (card.showEn && card.en) {
          pdf.setFontSize(Math.max(10, card.fontSize - 4));
          pdf.setFont('Helvetica', 'normal');
          const enY = textStartY + card.fontSize + (card.showZh && card.zh ? card.fontSize * 0.8 : 0);
          pdf.text(card.en, textX, enY + Math.max(10, card.fontSize - 4), { maxWidth: textW, align: card.textAlign });
        }
      }
    }

    pdf.save('山啟快閃卡牌.pdf');
    showToast('✅ PDF 下載成功！', 'success');
  } catch (err) {
    console.error(err);
    showToast('PDF 生成失敗：' + err.message, 'error');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = '⬇️ 下載 PDF';
  }
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// ============================================================
// Start
// ============================================================
document.addEventListener('DOMContentLoaded', init);
