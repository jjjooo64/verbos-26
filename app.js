// app.js
(function () {
  const style = document.createElement('style');
  style.textContent = `
    body, html {
      margin: 0; padding: 0; height: 100%; background: #111;
      display: flex; justify-content: center; align-items: center;
      overflow: hidden; position: relative;
    }
    canvas {
      display: block; background: #f8f8f8;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4); cursor: pointer;
    }

  `;
  document.head.appendChild(style);

  const stage = document.createElement('div');
  stage.id = 'stage';
  stage.style.cssText = 'position:relative; display:inline-block;';
  const canvas = document.createElement('canvas');
  canvas.id = 'grid';
  stage.appendChild(canvas);
  document.body.appendChild(stage);

  const ctx = canvas.getContext('2d');
  const PHI = 1.61803398875;
  let infinitivo = '';

  const DASH_VERTICAL = [2, 5];
  const DASH_HORIZONTAL = [2, 3];

  const POS_STANDARD = {
    'sub.futuro': [0, 1/9], 'sub.presente': [1/9, 2/9],
    'ind.condicional': [2/9, 3/9], 'ind.futuro': [3/9, 4/9],
    'ind.presente': [4/9, 5/9],
    'ind.imperfecto': [5/9, 6/9], 'ind.preterito': [6/9, 7/9],
    'sub.ra': [7/9, 8/9], 'sub.se': [8/9, 1]
  };
  const POS_BLOCK10 = {
    'sub.futuro': [0, 1/10], 'sub.presente': [1/10, 2/10],
    'ind.condicional': [2/10, 3/10], 'ind.futuro': [3/10, 4/10],
    'ind.presente': [4/10, 5/10], 'ind.presente.vos': [5/10, 6/10],
    'ind.imperfecto': [6/10, 7/10], 'ind.preterito': [7/10, 8/10],
    'sub.ra': [8/10, 9/10], 'sub.se': [9/10, 1]
  };

  const guides = {
    x0:   () => 0,
    x33:  () => canvas.width * 0.33,
    x39:  () => canvas.width * 0.39,
    x43:  () => canvas.width * 0.43,
    x53:  () => canvas.width * 0.53,
    x63:  () => canvas.width * 0.63,
    xRight: () => canvas.width,
    y0:   () => 0,
    y16:  () => canvas.height * (4/35),
    y27:  () => canvas.height * (9/35),
    y33:  () => canvas.height * (11/35),
    y495: () => canvas.height * (17.5/35),
    y60:  () => canvas.height * (21/35),
    y66:  () => canvas.height * (23.8/35),
    y93:  () => canvas.height * (33/35),
    yBot: () => canvas.height
  };

  class Rect {
    constructor(left, top, right, bottom) {
      this.left = left;
      this.top = top;
      this.right = right;
      this.bottom = bottom;
    }
    getX() { return this.left(); }
    getY() { return this.top(); }
    getWidth() { return this.right() - this.left(); }
    getHeight() { return this.bottom() - this.top(); }
    containsPoint(px, py) {
      const x = this.getX(), y = this.getY();
      return px >= x && px <= x + this.getWidth() && py >= y && py <= y + this.getHeight();
    }
  }

  const layout = {
    blueButton: new Rect(guides.x43, guides.y495, guides.x53, guides.y66),
    redButton:  new Rect(guides.x43, guides.y33, guides.x53, guides.y495),
    blocks: [
      new Rect(guides.x0,  guides.y0,  guides.x33, guides.y27),
      new Rect(guides.x63, guides.y0,  guides.xRight, guides.y27),
      new Rect(guides.x0,  guides.y33, guides.x33, guides.y60),
      new Rect(guides.x63, guides.y33, guides.xRight, guides.y60),
      new Rect(guides.x0,  guides.y66, guides.x33, guides.y93),
      new Rect(guides.x63, guides.y66, guides.xRight, guides.y93)
    ],
    randomButton: new Rect(guides.x33, guides.y93, guides.x43, guides.yBot),
    cells: [
      { text: '3',             rect: new Rect(guides.x33, guides.y0,  guides.x43, guides.y16) },
      { text: '2.5',           rect: new Rect(guides.x33, guides.y16, guides.x43, guides.y33) },
      { text: '2',             rect: new Rect(guides.x33, guides.y33, guides.x43, guides.y66) },
      { text: '1',             rect: new Rect(guides.x33, guides.y66, guides.x43, guides.y93) },
      { text: '3 3',         rect: new Rect(guides.x43, guides.y0,  guides.x53, guides.y16) },
      { text: '2.5 [2 2.5 3]', rect: new Rect(guides.x43, guides.y16, guides.x53, guides.y33) },
      { text: '2 [2 3]',     rect: new Rect(guides.x53, guides.y0,  guides.x63, guides.y66) },
      { text: '1 [2 2.5 3]', rect: new Rect(guides.x53, guides.y66, guides.x63, guides.yBot) },
      { text: '', rect: new Rect(guides.x43, guides.y66, guides.x53, guides.yBot) }
    ]
  };

  function getConjugaciones(infinitivo) {
    return window.ConjugationProvider?.getConjugaciones?.(infinitivo) ?? null;
  }

  const textFieldManager = {
    available: [],
    used: [],
    _buildAll() {
      const fields = [];
      const inBlockKeys = [
        [null, 'ind.condicional'],
        ['sub.futuro', 'ind.futuro'],
        ['sub.presente', 'ind.presente'],
        ['sub.ra', 'ind.imperfecto'],
        ['sub.se', 'ind.preterito']
      ];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          for (let ir = 0; ir < 5; ir++) {
            for (let ic = 0; ic < 2; ic++) {
              const key = inBlockKeys[ir][ic === 0 ? 1 : 0];
              if (!key) continue;
              if (r === 1 && c === 0 && ir === 2 && ic === 0) {
                fields.push({ blockRow: r, blockCol: c, intraRow: ir, intraCol: 0, formKey: 'ind.presente' });
                fields.push({ blockRow: r, blockCol: c, intraRow: ir, intraCol: 2, formKey: 'ind.presente.vos' });
                continue;
              }
              fields.push({ blockRow: r, blockCol: c, intraRow: ir, intraCol: ic, formKey: key });
            }
          }
          if (r === 1 && c === 0) {
            fields.push({ blockRow: r, blockCol: c, underType: 'neg', formKey: 'imp.neg' });
            fields.push({ blockRow: r, blockCol: c, underType: 'tuAff', formKey: 'imp.aff' });
            fields.push({ blockRow: r, blockCol: c, underType: 'vosAff', formKey: 'imp.aff.vos' });
          } else if (r === 2 && c === 0) {
            fields.push({ blockRow: r, blockCol: c, underType: 'gerundio', formKey: 'gerundio' });
            fields.push({ blockRow: r, blockCol: c, underType: 'participio', formKey: 'participio' });
          } else {
            fields.push({ blockRow: r, blockCol: c, underType: 'aff', formKey: 'imp.aff' });
            fields.push({ blockRow: r, blockCol: c, underType: 'neg', formKey: 'imp.neg' });
          }
        }
      }
      return fields;
    },
    reset() {
      this.available = this._buildAll();
      this.used = [];
    },
    next() {
      if (this.available.length === 0) return null;
      const idx = Math.floor(Math.random() * this.available.length);
      const field = this.available.splice(idx, 1)[0];
      field.text = '⬛';
      this.used.push(field);
      return field;
    },
    setText(field, text) {
      const entry = this.used.find(f =>
        f.blockRow === field.blockRow &&
        f.blockCol === field.blockCol &&
        f.formKey === field.formKey
      );
      if (entry) entry.text = text;
    }
  };

  textFieldManager.reset();

  function expectedText(field, conj) {
    if (!conj || !field.formKey) return null;
    const { blockRow: r, blockCol: c, formKey } = field;
    let person;
    if (r === 0 && c === 0) person = conj.usted;
    else if (r === 1 && c === 0) person = conj.tu;
    else if (r === 2 && c === 0) person = conj.yo;
    else if (r === 0 && c === 1) person = conj.ustedes;
    else if (r === 1 && c === 1) person = conj.vosotros;
    else if (r === 2 && c === 1) person = conj.nosotros;
    const ind = person?.indicativo || [];
    const sub = person?.subjuntivo || [];
    const imp = person?.imperativo || [];
    const map = {
      'sub.futuro': sub[3],
      'sub.presente': sub[2],
      'sub.ra': sub[1],
      'sub.se': sub[0],
      'ind.condicional': ind[4],
      'ind.futuro': ind[3],
      'ind.presente': ind[2],
      'ind.presente.vos': conj.vos?.[0],
      'ind.imperfecto': ind[1],
      'ind.preterito': ind[0],
      'imp.aff': imp[0],
      'imp.aff.vos': conj.vos?.[1],
      'imp.neg': imp[1],
      'gerundio': conj.gerundio,
      'participio': conj.participio
    };
    return map[formKey] || null;
  }

  function drawVerticalLabel(text, x, y, w, h) {
    const tokens = text.match(/[\d.]+|[\[\]{}]/g) || [];
    if (!tokens.length) return;
    ctx.save();
    const cx = x + w / 2;
    const cy = y + h / 2;
    const heightBased = (h * 0.8) / tokens.length;
    const widthBased = w * 0.6;
    let fontSize = Math.min(heightBased, widthBased);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = fontSize * 1.15;
    const totalH = tokens.length * lineH;
    let ty = cy - totalH / 2 + lineH / 2;
    tokens.forEach(tok => {
      if (/[\[\]{}]/.test(tok)) {
        ctx.save();
        ctx.translate(cx, ty);
        ctx.rotate(Math.PI / 2);
        ctx.fillText(tok, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(tok, cx, ty);
      }
      ty += lineH;
    });
    ctx.restore();
  }

  function draw() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const height = vh;
    const width = Math.min(vw * 0.95, height / PHI);

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const x43 = guides.x43(), y66 = guides.y66(), y33 = guides.y33();
    const y16 = guides.y16(), y93 = guides.y93(), y60 = guides.y60(), y27 = guides.y27();
    const x33 = guides.x33(), x39 = guides.x39(), x63 = guides.x63(), x53 = guides.x53();
    const y495 = guides.y495();

    ctx.beginPath(); ctx.moveTo(x43, 0); ctx.lineTo(x43, y93); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y66); ctx.lineTo(width, y66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y33); ctx.lineTo(x53, y33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x63, y33); ctx.lineTo(width, y33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x33, y16); ctx.lineTo(x53, y16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y93); ctx.lineTo(x43, y93); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x63, y93); ctx.lineTo(width, y93); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y60); ctx.lineTo(x33, y60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x63, y60); ctx.lineTo(width, y60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y27); ctx.lineTo(x33, y27); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x63, y27); ctx.lineTo(width, y27); ctx.stroke();

    ctx.setLineDash(DASH_VERTICAL);
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x33, 0); ctx.lineTo(x33, y93); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x63, 0); ctx.lineTo(x63, guides.yBot()); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x53, 0); ctx.lineTo(x53, y33); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x53, y33); ctx.lineTo(x53, y66); ctx.stroke();

    // Blue button (top half)
    const blue = layout.blueButton;
    ctx.fillStyle = '#000000';
    ctx.fillRect(blue.getX(), blue.getY(), blue.getWidth(), blue.getHeight());

    // Red button (bottom half)
    const red = layout.redButton;
    ctx.fillStyle = 'rgba(225, 30, 30, 1)';
    ctx.fillRect(red.getX(), red.getY(), red.getWidth(), red.getHeight());

    // Solid border for empty left cell (x43-x53, y66-yBot) and vertical cut
    const emptyCell = layout.cells.find(c => c.text === '');
    if (emptyCell) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.6;
      const ex = emptyCell.rect.getX(), ey = emptyCell.rect.getY();
      const ew = emptyCell.rect.getWidth(), eh = emptyCell.rect.getHeight();
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex + ew, ey);
      ctx.lineTo(ex + ew, ey + eh);
      ctx.lineTo(ex, ey + eh);
      ctx.stroke();

      // Display infinitivo stacked vertically
      if (infinitivo) {
        ctx.save();
        let recognized = false;
        try { recognized = !!getConjugaciones(infinitivo); } catch (e) { recognized = false; }
        // Caution tape background for unrecognized
        if (!recognized) {
          const ex = emptyCell.rect.getX(), ey = emptyCell.rect.getY();
          const ew = emptyCell.rect.getWidth(), eh = emptyCell.rect.getHeight();
          ctx.save();
          ctx.beginPath();
          ctx.rect(ex, ey, ew, eh);
          ctx.clip();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.lineWidth = 5;
          const spacing = 16;
          const diag = Math.sqrt(ew * ew + eh * eh);
          for (let i = -diag; i < diag * 2; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(ex + i, ey);
            ctx.lineTo(ex + i - eh, ey + eh);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.fillStyle = recognized ? 'rgba(225, 30, 30, 1)' : 'rgba(0, 0, 0, 0.35)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.max(18, height * 0.03);
        const letters = infinitivo.toUpperCase().split('');
        const available = emptyCell.rect.getHeight() * 0.9;
        const naturalLineH = fontSize * 1.2;
        const naturalH = letters.length * naturalLineH;
        const vScale = Math.min(1, available / naturalH);
        const lineH = naturalLineH * vScale;
        ctx.font = `bold ${fontSize}px "Times New Roman", Georgia, serif`;
        const ew = emptyCell.rect.getWidth();
        const availableW = ew * 0.85;
        const naturalLetterW = fontSize * 1.1;
        const hScale = Math.min(1.8, availableW / naturalLetterW);
        const cx = emptyCell.rect.getX() + ew / 2;
        const cy = emptyCell.rect.getY() + emptyCell.rect.getHeight() / 2;
        const totalH = letters.length * lineH;
        let ty = cy - totalH / 2 + lineH / 2;
        letters.forEach(ch => {
          ctx.save();
          ctx.translate(cx, ty);
          ctx.scale(hScale, vScale);
          ctx.fillText(ch, 0, 0);
          ctx.restore();
          ty += lineH;
        });
        ctx.restore();
      }
    }

    // Random button (die face)
    const randBtn = layout.randomButton;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(randBtn.getX(), randBtn.getY());
    ctx.lineTo(randBtn.getX() + randBtn.getWidth(), randBtn.getY());
    ctx.moveTo(randBtn.getX(), randBtn.getY() + randBtn.getHeight());
    ctx.lineTo(randBtn.getX() + randBtn.getWidth(), randBtn.getY() + randBtn.getHeight());
    ctx.stroke();
    // Draw a die face (5 dots)
    const dieSize = Math.min(randBtn.getWidth(), randBtn.getHeight()) * 0.55;
    const dieX = randBtn.getX() + (randBtn.getWidth() - dieSize) / 2;
    const dieY = randBtn.getY() + (randBtn.getHeight() - dieSize) / 2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(dieX, dieY, dieSize, dieSize);
    // 5 dots
    const dotR = dieSize * 0.08;
    const positions = [
      [0.25, 0.25], [0.75, 0.25],
      [0.5, 0.5],
      [0.25, 0.75], [0.75, 0.75]
    ];
    ctx.fillStyle = '#000';
    positions.forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(dieX + px * dieSize, dieY + py * dieSize, dotR, 0, Math.PI * 2);
      ctx.fill();
    });

    // Block separator lines (4 per block, single column)
    layout.blocks.forEach((block, idx) => {
      const bx = block.getX(), bw = block.getWidth();
      const by = block.getY(), bh = block.getHeight();
      const isMiddleBlock = idx === 2;
      const lineYs = isMiddleBlock
        ? [2/10, 4/10, 6/10, 8/10].map(p => by + bh * p)
        : [2/9, 4/9, 5/9, 7/9].map(p => by + bh * p);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.2;
      lineYs.forEach((ly, i) => {
        ctx.setLineDash([]);
        const isShort = i === 1 || i === 2;
        const startPct = isShort ? 0.367 : 0.1;
        const endPct = isShort ? 0.633 : 0.9;
        ctx.beginPath();
        ctx.moveTo(bx + bw * startPct, ly);
        ctx.lineTo(bx + bw * endPct, ly);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    });

    // Central labels
    layout.cells.forEach(cell => {
      drawVerticalLabel(cell.text, cell.rect.getX(), cell.rect.getY(), cell.rect.getWidth(), cell.rect.getHeight());
    });

    // J pyramid in blue (top half), O pyramid in red (bottom half)
    // Positions relative to the combined rectangle (center at y495)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const comboCenterX = width * 0.48;
    const comboCenterY = height * 0.495;
    const blueLetterSpacing = width * 0.028;
    const blueRowSpacing = height * 0.035;
    const blueBaseFont = Math.min(width * 0.045, height * 0.028);
    const blueTopFont = blueBaseFont * 1.2;

    // J pyramid (above center, in blue)
    const jTopY = comboCenterY - height * 0.04;
    ctx.save();
    ctx.font = `bold ${blueTopFont}px "Times New Roman", Georgia, serif`;
    ctx.translate(comboCenterX, jTopY - blueRowSpacing * 0.35);
    ctx.scale(1.9, 1);
    ctx.fillText('J', 0, 0);
    ctx.restore();
    ctx.font = `bold ${blueBaseFont}px "Times New Roman", Georgia, serif`;
    ctx.fillText('J', comboCenterX - blueLetterSpacing * 1, jTopY + blueRowSpacing * 0.35);
    ctx.fillText('J', comboCenterX + blueLetterSpacing * 0.7, jTopY + blueRowSpacing * 0.35);

    // O pyramid (below center, in red)
    const oTopY = comboCenterY + height * 0.04;
    ctx.save();
    ctx.font = `bold ${blueTopFont}px "Times New Roman", Georgia, serif`;
    ctx.translate(comboCenterX, oTopY - blueRowSpacing * 0.35);
    ctx.scale(1.5, 1);
    ctx.fillText('O', 0, 0);
    ctx.restore();
    ctx.font = `bold ${blueBaseFont}px "Times New Roman", Georgia, serif`;
    ctx.fillText('O', comboCenterX - blueLetterSpacing * 0.7, oTopY + blueRowSpacing * 0.35);
    ctx.fillText('O', comboCenterX + blueLetterSpacing * 0.7, oTopY + blueRowSpacing * 0.35);
    ctx.restore();

    // Field texts
    const verb = infinitivo;
    const conj = getConjugaciones(verb);

    textFieldManager.used.forEach(field => {
      const str = field.text;
      if (!str) return;
      const { blockRow, blockCol, intraRow, intraCol, underType } = field;
      const isLeft = blockCol === 0;
      const blockIdx = blockRow * 2 + blockCol;
      const block = layout.blocks[blockIdx];
      const bx = block.getX();
      const bw = block.getWidth();
      const by = block.getY();
      const bh = block.getHeight();

      let fieldX, fieldY, fieldW, fieldH;
      let highlightX, highlightY, highlightW, highlightH;

      if (underType || intraRow === undefined) {
        const underTops = [height * (9/35), height * (21/35), height * (33/35)];
        const underBots = [height * (11/35), height * (23.8/35), height];
        const underTop = underTops[blockRow] || height * 0.93;
        const underH = (underBots[blockRow] || height) - underTop;
        const halfH = underH / 2;
        const isBlock10 = blockRow === 1 && blockCol === 0;
        const isBlock20 = blockRow === 2 && blockCol === 0;

        if (isBlock20) {
          // gerundio top, participio bottom
          fieldX = bx; fieldW = bw;
          fieldY = underType === 'gerundio' ? underTop : underTop + halfH;
          fieldH = halfH;
        } else if (isBlock10) {
          // 3 stacked: aff, aff vos, neg
          const thirdH = underH / 3;
          const slotMap = { 'tuAff': 0, 'vosAff': 1, 'neg': 2 };
          const slot = slotMap[underType] ?? 0;
          fieldX = bx; fieldW = bw;
          fieldY = underTop + slot * thirdH;
          fieldH = thirdH;
        } else if (underType === 'aff') {
          // afirmativo full width on top
          fieldX = bx; fieldW = bw;
          fieldY = underTop;
          fieldH = halfH;
        } else if (underType === 'neg') {
          // negativo full width on bottom
          fieldX = bx; fieldW = bw;
          fieldY = underTop + halfH;
          fieldH = halfH;
        } else {
          fieldX = bx; fieldW = bw;
          fieldY = underTop;
          fieldH = underH;
        }
        highlightX = fieldX; highlightY = fieldY; highlightW = fieldW; highlightH = fieldH;
      } else {
        const isBlock10 = blockRow === 1 && blockCol === 0;
        const posMap = isBlock10 ? POS_BLOCK10 : POS_STANDARD;
        const [startF, endF] = posMap[field.formKey] || [0.4, 0.5];
        fieldX = bx;
        fieldW = bw;
        fieldY = by + bh * startF;
        fieldH = bh * (endF - startF);
        highlightX = fieldX; highlightY = fieldY; highlightW = fieldW; highlightH = fieldH;
      }

      let showStrikethrough = false;
      if (conj && str !== '⬛') {
        let isCorrect = false;
        try {
          const expected = expectedText(field, conj);
          if (expected && str.toLowerCase() === expected.toLowerCase()) isCorrect = true;
        } catch (e) {
          isCorrect = false;
        }
        if (!isCorrect) showStrikethrough = true;
      }

      const pad = 0.12;
      const maxW = fieldW * (1 - 2 * pad);
      const maxH = fieldH * (1 - 2 * pad);
      if (maxW <= 0 || maxH <= 0) return;

      let fontSize = Math.min(20, maxH * 0.9);
      ctx.font = `${fontSize}px sans-serif`;
      let metrics = ctx.measureText(str);
      while (fontSize > 6 && (metrics.width > maxW || fontSize > maxH)) {
        fontSize -= 0.5;
        ctx.font = `${fontSize}px sans-serif`;
        metrics = ctx.measureText(str);
      }

      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cy = fieldY + fieldH / 2;
      ctx.fillText(str, fieldX + fieldW / 2, cy);
      if (showStrikethrough) {
        ctx.save();
        ctx.strokeStyle = 'rgba(244, 67, 54, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(highlightX, highlightY);
        ctx.lineTo(highlightX + highlightW, highlightY + highlightH);
        ctx.moveTo(highlightX + highlightW, highlightY);
        ctx.lineTo(highlightX, highlightY + highlightH);
        ctx.stroke();
        ctx.restore();
      }
    });
  }



  function getFieldBounds(field) {
    const w = canvas.width, h = canvas.height;
    const isLeft = field.blockCol === 0;
    const blockIdx = field.blockRow * 2 + field.blockCol;
    const block = layout.blocks[blockIdx];
    const bx = block.getX();
    const bw = block.getWidth();
    const by = block.getY();
    const bh = block.getHeight();

    if (field.intraRow === undefined) {
      const underTops = [h * (9/35), h * (21/35), h * (33/35)];
      const underBots = [h * (11/35), h * (23.8/35), h];
      const underTop = underTops[field.blockRow] || h * 0.93;
      const underH = (underBots[field.blockRow] || h) - underTop;
      const halfH = underH / 2;
      const isBlock10 = field.blockRow === 1 && field.blockCol === 0;
      const isBlock20 = field.blockRow === 2 && field.blockCol === 0;

      if (isBlock20) {
        return { x: bx, y: field.underType === 'gerundio' ? underTop : underTop + halfH, w: bw, h: halfH };
      }
      if (isBlock10) {
        const thirdH = underH / 3;
        const slotMap = { 'tuAff': 0, 'vosAff': 1, 'neg': 2 };
        const slot = slotMap[field.underType] ?? 0;
        return { x: bx, y: underTop + slot * thirdH, w: bw, h: thirdH };
      }
      if (field.underType === 'aff') {
        return { x: bx, y: underTop, w: bw, h: halfH };
      }
      if (field.underType === 'neg') {
        return { x: bx, y: underTop + halfH, w: bw, h: halfH };
      }
      return { x: bx, y: underTop, w: bw, h: underH };
    }

    const isBlock10 = field.blockRow === 1 && field.blockCol === 0;
    const posMap = isBlock10 ? POS_BLOCK10 : POS_STANDARD;
    const [startF, endF] = posMap[field.formKey] || [0.4, 0.5];
    return { x: bx, y: by + bh * startF, w: bw, h: bh * (endF - startF) };
  }

  function findGivenFieldAt(px, py) {
    for (const field of textFieldManager.used) {
      const bounds = getFieldBounds(field);
      if (px >= bounds.x && px <= bounds.x + bounds.w && py >= bounds.y && py <= bounds.y + bounds.h) return field;
    }
    return null;
  }

  function fillAllWithAnswers() {
    const verb = infinitivo;
    const conj = getConjugaciones(verb);
    if (!conj) return;
    while (textFieldManager.available.length > 0) {
      const field = textFieldManager.next();
      if (!field) break;
      const expected = expectedText(field, conj);
      field.text = expected || '⬛';
    }
  }

  

  function setInfinitivo(value) {
    try {
      infinitivo = (value || '').trim();
      draw();
    } catch (err) {
      alert('Error: ' + (err.message || err));
    }
  }

  const RANDOM_INFINITIVOS = [
    'abrir','acertar','actuar','adeudar','adquirir','agradecer','aguar','ahincar',
    'aislar','andar','anunciar','aplaudir','argüir','asir','aunar','avergonzar',
    'averiguar','bailar','balbucir','bendecir','caber','cabrahigar','caer','causar',
    'ceñir','coger','cohibir','colgar','conducir','construir','contar','corregir',
    'corroer','creer','dar','decir','delinquir','descafeinar','desdar','desosar',
    'dirigir','discernir','distinguir','dormir','embaír','engorar','enraizar','enviar',
    'erguir','errar','escribir','estar','forzar','haber','hablar','hacer','huir',
    'ir','jugar','leer','lucir','mover','mullir','nacer','oír','oler','pagar',
    'partir','pedir','peinar','placer','poder','poner','predecir','prohibir',
    'prohijar','pudrir','querer','raer','regar','rehacer','rehenchir','rehuir',
    'rehusar','responder','reunir','rever','reír','roer','romper','rozar','saber',
    'sacar','salir','seguir','sentir','ser','servir','sonreír','tañer','temer',
    'tender','tener','torcer','traer','tropezar','vaciar','valer','vencer','venir',
    'ver','volcar','volver','yacer','zurcir'
  ];

  function pickRandomInfinitivo() {
    const idx = Math.floor(Math.random() * RANDOM_INFINITIVOS.length);
    setInfinitivo(RANDOM_INFINITIVOS[idx]);
  }

  canvas.addEventListener('click', (e) => {
    try {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Random button
    if (layout.randomButton.containsPoint(x, y)) {
      pickRandomInfinitivo();
      return;
    }

    // Infinitivo cell (empty cell left of {1 [2 2.5 3]})
    const infinitivoCell = layout.cells.find(c => c.text === '');
    if (infinitivoCell && infinitivoCell.rect.containsPoint(x, y)) {
      const entered = prompt('Introduce infinitivo del verbo:', infinitivo);
      if (entered === null) return;
      setInfinitivo(entered);
      return;
    }

    if (layout.redButton.containsPoint(x, y)) {
      const hatFull = textFieldManager.used.length === 0;
      if (hatFull) {
        const conj = getConjugaciones(infinitivo);
        if (!conj) return;
        if (!confirm(`¿Mostrar todas las conjugaciones del verbo ${infinitivo}??`)) return;
        fillAllWithAnswers();
      } else {
        if (!confirm('¿Reiniciar? Se borrarán todos los campos y su texto.')) return;
        textFieldManager.reset();
      }
      draw();
      return;
    }

    if (layout.blueButton.containsPoint(x, y)) {
      const field = textFieldManager.next();
      if (!field) return;
      draw();
      return;
    }

    const hit = findGivenFieldAt(x, y);
    if (hit) {
      const current = hit.text === '⬛' ? '' : hit.text;
      const entered = prompt('Introduce la conjugación:', current);
      if (entered === null) return;
      const newText = entered.trim() || '⬛';
      textFieldManager.setText(hit, newText);
      draw();
    }
    } catch (err) {
      alert('Error: ' + (err.message || err));
    }
  });

  window.addEventListener('resize', () => {
    draw();
    
  });

  draw();
})();
