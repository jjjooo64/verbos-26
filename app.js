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
    #verbInput {
      position: absolute; border: 1px solid #999; padding: 2px 4px;
      font-size: 13px; text-align: center; background: #fff;
      box-sizing: border-box; display: none;
    }
  `;
  document.head.appendChild(style);

  const stage = document.createElement('div');
  stage.id = 'stage';
  stage.style.cssText = 'position:relative; display:inline-block;';
  const canvas = document.createElement('canvas');
  canvas.id = 'grid';
  const input = document.createElement('input');
  input.id = 'verbInput';
  input.type = 'text';
  input.placeholder = 'verbo (ej. comer)';
  stage.appendChild(canvas);
  stage.appendChild(input);
  document.body.appendChild(stage);

  const ctx = canvas.getContext('2d');
  const PHI = 1.61803398875;

  function getConjugaciones(infinitivo) {
    return window.ConjugationProvider?.getConjugaciones?.(infinitivo) ?? null;
  }

  let blockTexts = [];

  const textFieldManager = {
    available: [],
    used: [],
    _buildAll() {
      const fields = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          for (let ir = 0; ir < 5; ir++) {
            for (let ic = 0; ic < 2; ic++) {
              if (ir === 0 && ic === 1) continue;
              if (r === 1 && c === 0 && ir === 2 && ic === 0) {
                fields.push({ blockRow: r, blockCol: c, intraRow: ir, intraCol: 0 });
                fields.push({ blockRow: r, blockCol: c, intraRow: ir, intraCol: 2 });
                continue;
              }
              fields.push({ blockRow: r, blockCol: c, intraRow: ir, intraCol: ic });
            }
          }
          if (r === 1 && c === 0) {
            fields.push({ blockRow: r, blockCol: c, underType: 'neg' });
            fields.push({ blockRow: r, blockCol: c, underType: 'tuAff' });
            fields.push({ blockRow: r, blockCol: c, underType: 'vosAff' });
          } else if (r === 2 && c === 1) {
            fields.push({ blockRow: r, blockCol: c, underType: 'gerundio' });
            fields.push({ blockRow: r, blockCol: c, underType: 'participio' });
          } else if (r === 2 && c === 0) {
          } else {
            fields.push({ blockRow: r, blockCol: c, underType: 'aff' });
            fields.push({ blockRow: r, blockCol: c, underType: 'neg' });
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
        f.intraRow === field.intraRow &&
        f.intraCol === field.intraCol &&
        f.underType === field.underType
      );
      if (entry) entry.text = text;
    }
  };

  textFieldManager.reset();

  function expectedText(field, conj) {
    if (!conj) return null;
    const { blockRow: r, blockCol: c, intraRow: ir, intraCol: ic, underType } = field;
    if (underType) {
      if (r === 1 && c === 0) {
        if (underType === 'neg') return conj.tu?.imperativo?.[1] || null;
        if (underType === 'tuAff') return conj.tu?.imperativo?.[0] || null;
        if (underType === 'vosAff') return conj.vos?.[1] || null;
      }
      if (underType === 'gerundio') return conj.gerundio || null;
      if (underType === 'participio') return conj.participio || null;
      if (underType === 'aff') {
        if (r === 0 && c === 0) return conj.usted?.imperativo?.[0] || null;
        if (r === 0 && c === 1) return conj.ustedes?.imperativo?.[0] || null;
        if (r === 1 && c === 1) return conj.vosotros?.imperativo?.[0] || null;
      }
      if (underType === 'neg') {
        if (r === 0 && c === 0) return conj.usted?.imperativo?.[1] || null;
        if (r === 0 && c === 1) return conj.ustedes?.imperativo?.[1] || null;
        if (r === 1 && c === 1) return conj.vosotros?.imperativo?.[1] || null;
      }
      return null;
    }
    let person;
    if (r === 0 && c === 0) person = conj.usted;
    else if (r === 1 && c === 0) person = conj.tu;
    else if (r === 2 && c === 0) person = conj.yo;
    else if (r === 0 && c === 1) person = conj.ustedes;
    else if (r === 1 && c === 1) person = conj.vosotros;
    else if (r === 2 && c === 1) person = conj.nosotros;
    if (!person) return null;
    const ind = person.indicativo || [];
    const sub = person.subjuntivo || [];
    const pairs = [
      ['', ind[4] || ''],
      [sub[3] || '', ind[3] || ''],
      [sub[2] || '', ind[2] || ''],
      [sub[1] || '', ind[1] || ''],
      [sub[0] || '', ind[0] || '']
    ];
    if (ir === undefined || ir < 0 || ir > 4) return null;
    if (r === 1 && c === 0 && ir === 2) {
      if (ic === 0) return ind[2] || null;
      if (ic === 2) return conj.vos?.[0] || null;
    }
    return ic === 0 ? pairs[ir][1] : pairs[ir][0];
  }

  function drawVerticalLabel(text, x, y, w, h) {
    const tokens = text.match(/[\d.]+|[\[\]{}]/g) || [];
    if (!tokens.length) return;

    ctx.save();
    const cx = x + w / 2;
    const cy = y + h / 2;

    let fontSize = Math.min(18, (h * 0.82) / tokens.length);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#222';
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

    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const x43 = width * 0.43;
    ctx.beginPath(); ctx.moveTo(x43, 0); ctx.lineTo(x43, height); ctx.stroke();

    const y66 = height * 0.66;
    ctx.beginPath(); ctx.moveTo(0, y66); ctx.lineTo(width, y66); ctx.stroke();

    const y33 = height * 0.33;
    ctx.beginPath(); ctx.moveTo(0, y33); ctx.lineTo(width * 0.53, y33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(width * 0.63, y33); ctx.lineTo(width, y33); ctx.stroke();

    const y16 = height * 0.16;
    ctx.beginPath(); ctx.moveTo(width * 0.33, y16); ctx.lineTo(width * 0.53, y16); ctx.stroke();

    const y93 = height * 0.93;
    ctx.beginPath(); ctx.moveTo(0, y93); ctx.lineTo(width, y93); ctx.stroke();

    const y60 = height * 0.60;
    ctx.beginPath(); ctx.moveTo(0, y60); ctx.lineTo(width * 0.39, y60); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(width * 0.63, y60); ctx.lineTo(width, y60); ctx.stroke();

    const y27 = height * 0.27;
    ctx.beginPath(); ctx.moveTo(0, y27); ctx.lineTo(width * 0.33, y27); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(width * 0.63, y27); ctx.lineTo(width, y27); ctx.stroke();

    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.4;

    const x33 = width * 0.33;
    const x39 = width * 0.39;
    const x63 = width * 0.63;

    ctx.beginPath(); ctx.moveTo(x33, 0); ctx.lineTo(x33, y33); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x39, y33); ctx.lineTo(x39, y66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x33, y66); ctx.lineTo(x33, y93); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x63, 0); ctx.lineTo(x63, y93); ctx.stroke();

    const x53 = width * 0.53;
    ctx.beginPath(); ctx.moveTo(x53, 0); ctx.lineTo(x53, y66); ctx.stroke();

    ctx.setLineDash([]);
    ctx.lineWidth = 1.2;

    // Buttons always active
    ctx.fillStyle = '#f44336';
    ctx.fillRect(width * 0.33, height * 0.93, width * 0.10, height * 0.07);

    ctx.fillStyle = '#2196F3';
    ctx.fillRect(width * 0.43, height * 0.33, width * 0.10, height * 0.33);

    const blocks = [
      { x: 0, w: width * 0.33, y: 0, h: height * 0.27 },
      { x: width * 0.63, w: width * 0.37, y: 0, h: height * 0.27 },
      { x: 0, w: width * 0.39, y: height * 0.33, h: height * 0.27 },
      { x: width * 0.63, w: width * 0.37, y: height * 0.33, h: height * 0.27 },
      { x: 0, w: width * 0.33, y: height * 0.66, h: height * 0.27 },
      { x: width * 0.63, w: width * 0.37, y: height * 0.66, h: height * 0.27 }
    ];

    blocks.forEach(block => {
      const totalSegWidth = block.w * 0.80;
      const gap = block.w * 0.05;
      const halfLen = (totalSegWidth - gap) / 2;
      const startX = block.x + (block.w - totalSegWidth) / 2;
      const margin = height * 0.08;
      const usable = block.h - 2 * margin;
      const spacing = usable / 3;
      const isLeftBlock = block.x < width * 0.5;
      const isBlock10 = Math.abs(block.y - height * 0.33) < 2 && isLeftBlock;

      for (let i = 0; i < 4; i++) {
        const segY = block.y + margin + i * spacing;

        if (isBlock10 && i === 2) {
          ctx.beginPath(); ctx.moveTo(startX, segY); ctx.lineTo(startX + halfLen, segY); ctx.stroke();
          const blockRight = block.x + block.w;
          const innerStart = startX + halfLen + gap;
          const vosEnd = blockRight - block.w * 0.05;
          const available = vosEnd - innerStart;
          const each = available * 0.42;
          const tuStart = innerStart;
          const tuEnd = tuStart + each;
          const vosStart = tuEnd + available * 0.08;
          ctx.beginPath(); ctx.moveTo(tuStart, segY); ctx.lineTo(tuEnd, segY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(vosStart, segY); ctx.lineTo(vosEnd, segY); ctx.stroke();
        } else {
          const leftX = startX;
          const rightX = startX + halfLen + gap;

          if (isLeftBlock) {
            if (i > 0) {
              ctx.beginPath(); ctx.moveTo(leftX, segY); ctx.lineTo(leftX + halfLen, segY); ctx.stroke();
            }
            ctx.beginPath(); ctx.moveTo(rightX, segY); ctx.lineTo(rightX + halfLen, segY); ctx.stroke();
          } else {
            ctx.beginPath(); ctx.moveTo(leftX, segY); ctx.lineTo(leftX + halfLen, segY); ctx.stroke();
            if (i > 0) {
              ctx.beginPath(); ctx.moveTo(rightX, segY); ctx.lineTo(rightX + halfLen, segY); ctx.stroke();
            }
          }
        }
      }
    });

    const cells = [
      { text: '3',     x: width * 0.33, y: 0,             w: width * 0.10, h: height * 0.16 },
      { text: '2.5',   x: width * 0.33, y: height * 0.16, w: width * 0.10, h: height * 0.17 },
      { text: '2',     x: width * 0.39, y: height * 0.33, w: width * 0.04, h: height * 0.33 },
      { text: '1',     x: width * 0.33, y: height * 0.66, w: width * 0.10, h: height * 0.27 },
      { text: '{3 3}',         x: width * 0.43, y: 0,             w: width * 0.10, h: height * 0.16 },
      { text: '{2.5 [2.5 3]}', x: width * 0.43, y: height * 0.16, w: width * 0.10, h: height * 0.17 },
      { text: '{2 [2 2.5 3]}', x: width * 0.53, y: 0,             w: width * 0.10, h: height * 0.66 },
      { text: '{1 [2 2.5 3]}', x: width * 0.43, y: height * 0.66, w: width * 0.20, h: height * 0.27 }
    ];
    cells.forEach(cell => drawVerticalLabel(cell.text, cell.x, cell.y, cell.w, cell.h));

    blockTexts.forEach(t => {
      const { blockRow, blockCol, str, intraRow, intraCol, underType } = t;
      if (!str) return;
      const isLeft = blockCol === 0;
      const isMiddleLeft = blockRow === 1 && blockCol === 0;
      const bx = isLeft ? 0 : width * 0.63;
      const bw = isMiddleLeft ? width * 0.39 : (isLeft ? width * 0.33 : width * 0.37);
      const by = blockRow === 0 ? 0 : blockRow === 1 ? height * 0.33 : height * 0.66;
      const bh = height * 0.27;

      let fieldX, fieldY, fieldW, fieldH;

      if (underType || intraRow === undefined) {
        const underTops = [height * 0.27, height * 0.60, height * 0.93];
        const underBots = [height * 0.33, height * 0.66, height];
        fieldY = underTops[blockRow] || height * 0.93;
        fieldH = (underBots[blockRow] || height) - fieldY;

        if (underType === 'neg' && blockRow === 1 && blockCol === 0) {
          fieldX = bx; fieldW = bw / 3;
        } else if (underType === 'tuAff') {
          fieldX = bx + bw / 3; fieldW = bw / 3;
        } else if (underType === 'vosAff') {
          fieldX = bx + 2 * bw / 3; fieldW = bw / 3;
        } else if (underType === 'gerundio') {
          fieldX = bx + bw / 2; fieldW = bw / 2;
        } else if (underType === 'participio') {
          fieldX = bx; fieldW = bw / 2;
        } else if (underType === 'aff' || underType === 'neg') {
          const half = bw / 2;
          const onLeft = (underType === 'neg' && isLeft) || (underType === 'aff' && !isLeft);
          fieldX = onLeft ? bx : bx + half;
          fieldW = half;
        } else {
          fieldX = bx; fieldW = bw;
        }
      } else {
        const margin = height * 0.08;
        const usable = bh - 2 * margin;
        const spacing = usable / 3;
        const segYs = [0, 1, 2, 3].map(i => by + margin + i * spacing);
        const gaps = [
          { top: by, bottom: segYs[0] },
          { top: segYs[0], bottom: segYs[1] },
          { top: segYs[1], bottom: segYs[2] },
          { top: segYs[2], bottom: segYs[3] },
          { top: segYs[3], bottom: by + bh }
        ];
        const gap = gaps[Math.max(0, Math.min(4, intraRow))];

        const totalSegWidth = bw * 0.80;
        const segGap = bw * 0.05;
        const halfLen = (totalSegWidth - segGap) / 2;
        const startX = bx + (bw - totalSegWidth) / 2;

        if (isMiddleLeft && intraRow === 2 && (intraCol === 0 || intraCol === 2)) {
          const blockRight = bx + bw;
          const innerStart = startX + halfLen + segGap;
          const vosEnd = blockRight - bw * 0.05;
          const available = vosEnd - innerStart;
          const each = available * 0.42;
          const tuStart = innerStart;
          const tuEnd = tuStart + each;
          const vosStart = tuEnd + available * 0.08;
          if (intraCol === 0) { fieldX = tuStart; fieldW = tuEnd - tuStart; }
          else { fieldX = vosStart; fieldW = vosEnd - vosStart; }
        } else if (isLeft) {
          fieldX = intraCol === 0 ? startX + halfLen + segGap : startX;
          fieldW = halfLen;
        } else {
          fieldX = intraCol === 0 ? startX : startX + halfLen + segGap;
          fieldW = halfLen;
        }
        fieldY = gap.top;
        fieldH = gap.bottom - gap.top;

        const halfGap = spacing / 2;
        if (intraRow === 0) fieldY = (segYs[0] - halfGap) - fieldH / 2;
        else if (intraRow === 4) fieldY = (segYs[3] + halfGap) - fieldH / 2;
      }

      if (t.highlight === 'green' || t.highlight === 'red') {
        ctx.fillStyle = t.highlight === 'green' ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)';
        ctx.fillRect(fieldX, fieldY, fieldW, fieldH);
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

      ctx.fillStyle = '#222';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let cy = fieldY + fieldH / 2;
      if (intraRow === 0) {
        const margin = height * 0.08;
        const spacing = (bh - 2 * margin) / 3;
        cy = (by + margin) - spacing / 2;
      } else if (intraRow === 4) {
        const margin = height * 0.08;
        const spacing = (bh - 2 * margin) / 3;
        cy = (by + margin + 3 * spacing) + spacing / 2;
      }
      ctx.fillText(str, fieldX + fieldW / 2, cy);
    });
  }

  function addBlockText(blockRow, blockCol, str, intraRow, intraCol, isConjugation = false) {
    blockTexts.push({ blockRow, blockCol, str, intraRow, intraCol, isConjugation });
    draw();
  }

  function fillConjugations(conj) {
    blockTexts = blockTexts.filter(t => !t.isConjugation);

    function placeInBlock(r, c, personData) {
      if (!personData) return;
      const ind = personData.indicativo || [];
      const sub = personData.subjuntivo || [];
      const pairs = [
        ['', ind[4] || ''],
        [sub[3] || '', ind[3] || ''],
        [sub[2] || '', ind[2] || ''],
        [sub[1] || '', ind[1] || ''],
        [sub[0] || '', ind[0] || '']
      ];
      pairs.forEach((pair, ir) => {
        if (pair[1]) addBlockText(r, c, pair[1], ir, 0, true);
        if (pair[0]) addBlockText(r, c, pair[0], ir, 1, true);
      });
    }

    placeInBlock(0, 0, conj.usted);
    if (conj.usted?.imperativo) {
      blockTexts.push({ blockRow: 0, blockCol: 0, str: conj.usted.imperativo[0], underType: 'aff', isConjugation: true });
      blockTexts.push({ blockRow: 0, blockCol: 0, str: conj.usted.imperativo[1], underType: 'neg', isConjugation: true });
    }

    const tuData = conj.tu;
    if (tuData) {
      const tuForDisplay = { indicativo: [...(tuData.indicativo || [])], subjuntivo: tuData.subjuntivo };
      const tuPresent = tuForDisplay.indicativo[2] || '';
      const vosPresent = (conj.vos && conj.vos[0]) || '';
      tuForDisplay.indicativo[2] = '';
      placeInBlock(1, 0, tuForDisplay);
      if (tuPresent) addBlockText(1, 0, tuPresent, 2, 0, true);
      if (vosPresent) addBlockText(1, 0, vosPresent, 2, 2, true);
      if (tuData.imperativo) {
        blockTexts.push({ blockRow: 1, blockCol: 0, str: tuData.imperativo[1], underType: 'neg', isConjugation: true });
        blockTexts.push({ blockRow: 1, blockCol: 0, str: tuData.imperativo[0], underType: 'tuAff', isConjugation: true });
        if (conj.vos?.[1]) blockTexts.push({ blockRow: 1, blockCol: 0, str: conj.vos[1], underType: 'vosAff', isConjugation: true });
      }
    }

    placeInBlock(2, 0, conj.yo);
    placeInBlock(0, 1, conj.ustedes);
    if (conj.ustedes?.imperativo) {
      blockTexts.push({ blockRow: 0, blockCol: 1, str: conj.ustedes.imperativo[0], underType: 'aff', isConjugation: true });
      blockTexts.push({ blockRow: 0, blockCol: 1, str: conj.ustedes.imperativo[1], underType: 'neg', isConjugation: true });
    }
    placeInBlock(1, 1, conj.vosotros);
    if (conj.vosotros?.imperativo) {
      blockTexts.push({ blockRow: 1, blockCol: 1, str: conj.vosotros.imperativo[0], underType: 'aff', isConjugation: true });
      blockTexts.push({ blockRow: 1, blockCol: 1, str: conj.vosotros.imperativo[1], underType: 'neg', isConjugation: true });
    }
    placeInBlock(2, 1, conj.nosotros);
    if (conj.gerundio) blockTexts.push({ blockRow: 2, blockCol: 1, str: conj.gerundio, underType: 'gerundio', isConjugation: true });
    if (conj.participio) blockTexts.push({ blockRow: 2, blockCol: 1, str: conj.participio, underType: 'participio', isConjugation: true });
    draw();
  }

  function positionVerbInput() {
    input.style.left = '1%';
    input.style.top = '93.5%';
    input.style.width = '31%';
    input.style.height = '5.5%';
    input.style.display = 'block';
    stage.style.width = canvas.width + 'px';
    stage.style.height = canvas.height + 'px';
  }

  function getFieldBounds(field) {
    const w = canvas.width, h = canvas.height;
    const isLeft = field.blockCol === 0;
    const isMiddleLeft = field.blockRow === 1 && field.blockCol === 0;
    const bx = isLeft ? 0 : w * 0.63;
    const bw = isMiddleLeft ? w * 0.39 : (isLeft ? w * 0.33 : w * 0.37);
    const by = field.blockRow === 0 ? 0 : field.blockRow === 1 ? h * 0.33 : h * 0.66;
    const bh = h * 0.27;

    if (field.intraRow === undefined) {
      const underTops = [h * 0.27, h * 0.60, h * 0.93];
      const underBots = [h * 0.33, h * 0.66, h];
      const fy = underTops[field.blockRow] || h * 0.93;
      const fh = (underBots[field.blockRow] || h) - fy;
      if (field.underType === 'neg' && field.blockRow === 1 && field.blockCol === 0) return { x: bx, y: fy, w: bw / 3, h: fh };
      if (field.underType === 'tuAff') return { x: bx + bw / 3, y: fy, w: bw / 3, h: fh };
      if (field.underType === 'vosAff') return { x: bx + 2 * bw / 3, y: fy, w: bw / 3, h: fh };
      if (field.underType === 'gerundio') return { x: bx + bw / 2, y: fy, w: bw / 2, h: fh };
      if (field.underType === 'participio') return { x: bx, y: fy, w: bw / 2, h: fh };
      if (field.underType === 'aff' || field.underType === 'neg') {
        const half = bw / 2;
        const onLeft = (field.underType === 'neg' && isLeft) || (field.underType === 'aff' && !isLeft);
        return { x: onLeft ? bx : bx + half, y: fy, w: half, h: fh };
      }
      return { x: bx, y: fy, w: bw, h: fh };
    }

    const margin = h * 0.08;
    const usable = bh - 2 * margin;
    const spacing = usable / 3;
    const segYs = [0, 1, 2, 3].map(i => by + margin + i * spacing);
    const gaps = [
      { top: by, bottom: segYs[0] },
      { top: segYs[0], bottom: segYs[1] },
      { top: segYs[1], bottom: segYs[2] },
      { top: segYs[2], bottom: segYs[3] },
      { top: segYs[3], bottom: by + bh }
    ];
    const gap = gaps[Math.max(0, Math.min(4, field.intraRow))] || gaps[2];

    if (isMiddleLeft && field.intraRow === 2 && (field.intraCol === 0 || field.intraCol === 2)) {
      const totalSegWidth = bw * 0.80;
      const segGap = bw * 0.05;
      const halfLen = (totalSegWidth - segGap) / 2;
      const startX = bx + (bw - totalSegWidth) / 2;
      const innerStart = startX + halfLen + segGap;
      const vosEnd = bx + bw - bw * 0.05;
      const available = vosEnd - innerStart;
      const each = available * 0.42;
      const tuStart = innerStart;
      const tuEnd = tuStart + each;
      const vosStart = tuEnd + available * 0.08;
      if (field.intraCol === 0) return { x: tuStart, y: gap.top, w: tuEnd - tuStart, h: gap.bottom - gap.top };
      return { x: vosStart, y: gap.top, w: vosEnd - vosStart, h: gap.bottom - gap.top };
    }

    const totalSegWidth = bw * 0.80;
    const segGap = bw * 0.05;
    const halfLen = (totalSegWidth - segGap) / 2;
    const startX = bx + (bw - totalSegWidth) / 2;
    let colX, colW;
    if (isLeft) {
      colX = field.intraCol === 0 ? startX + halfLen + segGap : startX;
      colW = halfLen;
    } else {
      colX = field.intraCol === 0 ? startX : startX + halfLen + segGap;
      colW = halfLen;
    }
    return { x: colX, y: gap.top, w: colW, h: gap.bottom - gap.top };
  }

  function findGivenFieldAt(px, py) {
    for (const field of textFieldManager.used) {
      const entry = blockTexts.find(t =>
        !t.isConjugation &&
        t.blockRow === field.blockRow &&
        t.blockCol === field.blockCol &&
        t.intraRow === field.intraRow &&
        t.intraCol === field.intraCol &&
        t.underType === field.underType
      );
      if (!entry) continue;
      const bounds = getFieldBounds(field);
      if (px >= bounds.x && px <= bounds.x + bounds.w && py >= bounds.y && py <= bounds.y + bounds.h) return entry;
    }
    return null;
  }
    
    function refreshDisplay() {
      const verb = input.value.trim();
      const conj = getConjugaciones(verb);

      if (conj && textFieldManager.used.length === 0) {
        blockTexts = [];
        fillConjugations(conj);
      } else if (conj) {
        blockTexts = textFieldManager.used.map(field => ({
          ...field,
          str: field.text || '⬛',
          isConjugation: false,
          highlight: field.text && field.text !== '⬛'
            ? (field.text.toLowerCase() === (expectedText(field, conj) || '').toLowerCase() ? 'green' : 'red')
            : null
        }));
      } else {
        blockTexts = textFieldManager.used.map(field => ({
          ...field,
          str: field.text || '⬛',
          isConjugation: false
        }));
      }
      draw();
    }
    
  input.addEventListener('input', refreshDisplay);

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const w = canvas.width;
    const h = canvas.height;

    // Red button — always available
    if (x >= w * 0.33 && x <= w * 0.43 && y >= h * 0.93 && y <= h) {
      if (!confirm('Reset the hat? All drawn fields and their text will be cleared.')) return;
      blockTexts = blockTexts.filter(t => t.isConjugation);
      textFieldManager.reset();
      refreshDisplay();
      return;
    }

    // Blue button — always available
    if (x >= w * 0.43 && x <= w * 0.53 && y >= h * 0.33 && y <= h * 0.66) {
      const field = textFieldManager.next();
      if (!field) return;
      field.text = '⬛';
      blockTexts.push({ ...field, str: '⬛', isConjugation: false });
      refreshDisplay();
      return;
    }

    // Tap drawn field → prompt
    const hit = findGivenFieldAt(x, y);
    if (hit) {
      const current = hit.str === '⬛' ? '' : hit.str;
      const entered = prompt('Enter text for this field:', current);
      if (entered === null) return;
      const newText = entered.trim() || '⬛';
      hit.str = newText;
      textFieldManager.setText(hit, newText);
      refreshDisplay();
    }
  });

  window.addEventListener('resize', () => {
    draw();
    positionVerbInput();
  });

  draw();
  setTimeout(positionVerbInput, 100);
})();
