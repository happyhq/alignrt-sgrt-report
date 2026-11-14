/* Progressive-disclosure interactions for the static SGRT technical report. */
(() => {
  'use strict';

  const DATA = window.SGRT_REPORT_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const number = (id) => Number($(`#${id}`)?.value ?? 0);
  const write = (id, value) => {
    const node = $(`#${id}`);
    if (node) node.textContent = value;
  };
  const fixed = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—';

  function announce(id, text, state = '') {
    const node = $(`#${id}`);
    if (!node) return;
    node.textContent = text;
    if (state) node.dataset.state = state;
  }

  function bindRange(ids, callback) {
    ids.forEach((id) => {
      const input = $(`#${id}`);
      if (input) input.addEventListener('input', callback);
    });
  }

  function initHub() {
    if (document.body.dataset.page !== 'hub') return;
    const positions = {
      surface: [78, 168],
      coordinates: [270, 74],
      pose: [496, 112],
      validity: [704, 74],
      feedback: [790, 272],
      evidence: [510, 344]
    };
    const edgeColor = { data: '#125bc5', geometry: '#076b83', control: '#a94f12', evidence: '#5d7083' };
    const edgeDash = { data: '', geometry: '8 4', control: '', evidence: '5 5' };
    const map = $('#system-map');
    const detail = $('#map-detail');
    const nodes = DATA.nodes;
    const edges = DATA.edges;
    const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
    let selected = 'surface';

    function center(id) {
      const [x, y] = positions[id];
      return [x + 74, y + 31];
    }

    function draw() {
      if (!map) return;
      const lines = edges.map((edge) => {
        const [x1, y1] = center(edge.from);
        const [x2, y2] = center(edge.to);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return `<g>
          <path d="M${x1} ${y1} Q${mx} ${my - 18} ${x2} ${y2}" class="map-edge"
            stroke="${edgeColor[edge.kind]}" stroke-dasharray="${edgeDash[edge.kind]}"
            marker-end="url(#map-arrow-${edge.kind})"></path>
          <text x="${mx}" y="${my - 9}" class="map-edge-label" text-anchor="middle">${edge.label}</text>
        </g>`;
      }).join('');
      const boxes = nodes.map((node) => {
        const [x, y] = positions[node.id];
        return `<g class="map-node" data-node-id="${node.id}" role="button" tabindex="0"
          aria-pressed="${node.id === selected}" aria-label="查看${node.title}">
          <rect x="${x}" y="${y}" width="148" height="62" rx="9"></rect>
          <text x="${x + 14}" y="${y + 22}" fill="#076b83" font-size="10" font-family="Consolas, monospace">${node.title.slice(0, 2)}</text>
          <text x="${x + 14}" y="${y + 44}" fill="#102e50" font-size="13" font-weight="650">${node.title.slice(5)}</text>
        </g>`;
      }).join('');
      map.innerHTML = `<title id="system-map-title">系统总览：六章之间的数据、几何、控制与证据关系</title>
        <desc id="system-map-desc">从体表测量开始，经统一坐标、参考配准、可信度判断和反馈门控，最终进入证据边界。节点可点击查看统一字段。</desc>
        <defs>
          <marker id="map-arrow-data" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#125bc5"/></marker>
          <marker id="map-arrow-geometry" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#076b83"/></marker>
          <marker id="map-arrow-control" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#a94f12"/></marker>
          <marker id="map-arrow-evidence" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#5d7083"/></marker>
        </defs>${lines}${boxes}`;
      $$('.map-node', map).forEach((node) => {
        node.addEventListener('click', () => select(node.dataset.nodeId));
        node.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            select(node.dataset.nodeId);
          }
        });
      });
    }

    function select(id) {
      selected = id;
      const node = byId[id];
      if (!node || !detail) return;
      $$('.map-node', map).forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.nodeId === id));
      });
      write('map-detail-kicker', 'NODE / ' + node.title.slice(0, 2));
      write('map-detail-title', node.title);
      write('map-detail-function', node.function);
      write('map-detail-inputs', node.inputs.join(' · '));
      write('map-detail-outputs', node.outputs.join(' · '));
      write('map-detail-upstream', node.upstream.join(' · '));
      write('map-detail-downstream', node.downstream.join(' · '));
      write('map-detail-evidence', node.evidence.join(' · '));
      write('map-detail-boundary', node.boundary);
      const link = $('#map-detail-link');
      if (link) link.href = DATA.chapters.find((chapter) => chapter.id === id)?.href || '#chapters';
      detail.dataset.node = id;
    }

    draw();
    select(selected);

    const legacyTarget = DATA.legacyAnchors[window.location.hash.slice(1)];
    if (legacyTarget) {
      window.location.replace(new URL(legacyTarget, window.location.href).href);
      return;
    }

    $$('[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        $$('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        $$('.experiment-card').forEach((card) => {
          card.hidden = filter !== 'all' && card.dataset.chapter !== filter;
        });
      });
    });
  }

  function initMatching() {
    const canvasLeft = $('#matching-left');
    const canvasRight = $('#matching-right');
    const slider = $('#matching-disparity');
    if (!canvasLeft || !canvasRight || !slider) return;
    let mode = 'random';

    function randFactory(seed) {
      return () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    }

    function paint(canvas, shift, isRight) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = mode === 'blank' ? '#6e7c86' : '#1b2a35';
      ctx.fillRect(0, 0, width, height);
      const random = randFactory(37);
      if (mode === 'random') {
        for (let i = 0; i < 220; i += 1) {
          const x = random() * width;
          const y = random() * height;
          const radius = .8 + random() * 2.1;
          const gray = 150 + Math.floor(random() * 90);
          ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
          ctx.beginPath();
          ctx.arc(x + shift, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (mode === 'repeat') {
        for (let y = 8; y < height; y += 22) {
          for (let x = 8; x < width + 22; x += 22) {
            ctx.fillStyle = '#d8e3e5';
            ctx.beginPath();
            ctx.arc(x + shift, y, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.strokeStyle = 'rgba(134, 214, 245, .36)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 96.5);
      ctx.lineTo(width, 96.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = isRight ? '#86d6f5' : '#ffb271';
      ctx.lineWidth = 2;
      ctx.strokeRect(212, 80, 16, 16);
    }

    function update() {
      const disparity = Number(slider.value);
      paint(canvasLeft, 0, false);
      paint(canvasRight, -disparity, true);
      const score = mode === 'blank' ? null : mode === 'repeat' ? 0.88 : (disparity === 48 ? 0.96 : 0.71);
      const depth = mode === 'blank' ? null : 57.6 / disparity;
      write('matching-disparity-label', `${disparity} px`);
      write('matching-score', score === null ? '—' : fixed(score, 2));
      write('matching-depth', depth === null ? '—' : `${fixed(depth, 2)} m`);
      if (mode === 'blank') {
        announce('matching-verdict', '不可用：没有可辨识纹理，不能把某个位置读成对应点。', 'off');
      } else if (mode === 'repeat') {
        announce('matching-verdict', '有歧义：重复纹理可能在多个候选位置得到相似分数。', 'warn');
      } else if (disparity === 48) {
        announce('matching-verdict', '唯一性通过（教学示例）：随机纹理在正确视差附近出现主峰。', 'ok');
      } else {
        announce('matching-verdict', '候选偏离主峰：分数高不是正确概率，仍需唯一性和一致性检查。', 'warn');
      }
      announce('matching-readout', depth === null
        ? '没有可信对应，暂停输出三维点。'
        : `对应 ${disparity} px → 理想深度 ${fixed(depth, 2)} m。只有通过唯一性检查才可继续三角测量。`);
    }

    $$('[data-texture]').forEach((button) => {
      button.addEventListener('click', () => {
        mode = button.dataset.texture;
        $$('[data-texture]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        update();
      });
    });
    slider.addEventListener('input', update);
    const scan = $('#matching-scan');
    if (scan) {
      scan.addEventListener('click', () => {
        const next = Number(slider.value) >= 72 ? 24 : Number(slider.value) + 4;
        slider.value = String(next);
        update();
      });
    }
    update();
  }

  function initStereo() {
    const z = $('#stereo-z');
    if (!z) return;
    function update() {
      const distance = number('stereo-z');
      const baseline = number('stereo-baseline');
      const disparity = 720 * baseline / distance;
      const error = (distance * distance) / (720 * baseline) * 0.1;
      write('stereo-disparity', `${fixed(disparity, 1)} px`);
      write('stereo-depth', `${fixed(distance / 1000, 2)} m`);
      write('stereo-error', `≈ ${fixed(error, 2)} mm`);
      announce('stereo-state', `视差 ${fixed(disparity, 1)} px；这是已校正理想模型的几何换算，不是设备精度。`);
    }
    bindRange(['stereo-z', 'stereo-baseline'], update);
    update();
  }

  function initCalibration() {
    const errorInput = $('#calibration-error');
    if (!errorInput) return;
    function update() {
      const error = number('calibration-error');
      const residual = Math.abs(error) * 0.42;
      const depth = Math.abs(error) * 1.7;
      write('calibration-residual', `${fixed(residual, 1)} px`);
      write('calibration-depth-error', `≈ ${fixed(depth, 1)} mm`);
      announce('calibration-state', Math.abs(error) < .5
        ? '理想参数示例：像素残差很小，但仍需要独立空间基准验证绝对尺度。'
        : '参数扰动示例：像素域残差变大，空间误差还会受到距离与几何放大的影响。');
    }
    errorInput.addEventListener('input', update);
    update();
  }

  function initFusion() {
    const buttons = $$('[data-pod]');
    const total = 925;
    if (!buttons.length) return;
    function update() {
      const counts = [367, 690, 925];
      const active = buttons.map((button) => button.getAttribute('aria-pressed') === 'true');
      const count = active.reduce((sum, on, index) => sum + (on ? counts[index] : 0), 0);
      const visible = Math.min(total, count);
      write('fusion-coverage', `${visible} / ${total}`);
      const percentage = visible / total * 100;
      const meter = $('#fusion-meter');
      if (meter) meter.style.width = `${percentage}%`;
      announce('fusion-state', visible === 0
        ? '没有可用表面观测：缺失数据不能补造，也不能读成零偏差。'
        : `合成上表面可见采样 ${fixed(percentage, 1)}%；更多视角用于补覆盖，不自动等于更高精度。`);
    }
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        update();
      });
    });
    update();
  }

  function initPose() {
    const sx = $('#pose-tx');
    if (!sx) return;
    function update() {
      const tx = number('pose-tx');
      const ty = number('pose-ty');
      const angle = number('pose-rot');
      const roi = number('pose-roi');
      const target = $('#pose-target');
      if (target) target.setAttribute('transform', `translate(${tx * 2.5} ${ty * 2.5}) rotate(${angle} 320 190)`);
      write('pose-tx-value', `${tx.toFixed(1)} mm`);
      write('pose-ty-value', `${ty.toFixed(1)} mm`);
      write('pose-rot-value', `${angle.toFixed(1)}°`);
      write('pose-roi-value', `${roi}%`);
      const leverage = roi < 30 ? '低' : roi < 65 ? '中' : '高';
      write('pose-leverage', leverage);
      announce('pose-state', roi < 30
        ? 'ROI 过小：可观测形状不足，低残差也可能对应多个位姿解。'
        : 'ROI 形状提供约束；6DoF 仍依赖参考、旋转中心和坐标协议，不等于自动移床。');
    }
    bindRange(['pose-tx', 'pose-ty', 'pose-rot', 'pose-roi'], update);
    update();
  }

  function initValidity() {
    const pods = $$('[data-validity-pod]');
    if (!pods.length) return;
    function update() {
      const active = pods.filter((button) => button.getAttribute('aria-pressed') === 'true').length;
      const blocked = $('#validity-occlusion')?.checked;
      const stale = $('#validity-stale')?.checked;
      const coverage = active === 0 ? 0 : active === 1 ? .42 : active === 2 ? .7 : .9;
      const constraint = active === 0 ? 0 : active === 1 ? .16 : active === 2 ? .38 : .64;
      const ghost = $('#validity-ghost')?.checked;
      const usable = coverage >= .55 && constraint >= .2 && !stale && !ghost;
      const unavailable = coverage === 0 || stale || active === 0;
      const state = unavailable ? 'UNAVAILABLE' : usable && !blocked ? 'VALID' : 'DEGRADED';
      write('validity-coverage', `${fixed(coverage * 100, 0)}%`);
      write('validity-constraint', constraint.toFixed(2));
      write('validity-state', state);
      const stateNode = $('#validity-state');
      if (stateNode) stateNode.dataset.state = state === 'VALID' ? 'ok' : state === 'DEGRADED' ? 'warn' : 'off';
      const reasons = [];
      if (active === 0) reasons.push('无相机观测');
      if (blocked) reasons.push('机架/附件遮挡');
      if (stale) reasons.push('数据未更新');
      if (ghost) reasons.push('几何约束不足');
      if (coverage < .55 && active > 0) reasons.push('可见覆盖不足');
      announce('validity-reasons', reasons.length ? `原因：${reasons.join(' · ')}。无数据不能当作零运动。` : '残差、覆盖、约束和新鲜度同时通过教学检查。');
    }
    pods.forEach((button) => {
      button.addEventListener('click', () => {
        button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
        update();
      });
    });
    bindRange([], update);
    ['validity-occlusion', 'validity-stale', 'validity-ghost'].forEach((id) => {
      const input = $(`#${id}`);
      if (input) input.addEventListener('change', update);
    });
    update();
  }

  function initQA() {
    const bias = $('#qa-bias');
    if (!bias) return;
    function update() {
      const zero = number('qa-bias');
      const scale = number('qa-scale');
      const ten = zero + 10 * (1 + scale / 100);
      write('qa-zero', `${fixed(zero, 2)} mm`);
      write('qa-ten', `${fixed(ten, 2)} mm`);
      write('qa-scale-value', `${scale >= 0 ? '+' : ''}${fixed(scale, 1)}%`);
      announce('qa-state', `零点读数 ${fixed(zero, 2)} mm；10 mm 位移读数 ${fixed(ten, 2)} mm。绝对偏差与位移量偏差要分开看。`);
    }
    bindRange(['qa-bias', 'qa-scale'], update);
    const reset = $('#qa-reset');
    if (reset) {
      reset.addEventListener('click', () => {
        $('#qa-bias').value = '0';
        $('#qa-scale').value = '0';
        update();
      });
    }
    update();
  }

  function initFeedback() {
    const coach = $('#coach-height');
    if (coach) {
      const updateCoach = () => {
        const height = number('coach-height');
        const low = 55;
        const high = 75;
        const state = height < low ? '低于目标带' : height > high ? '高于目标带' : '位于目标带';
        write('coach-height-value', `${height}%`);
        write('coach-state', state);
        const marker = $('#coach-current');
        if (marker) {
          marker.setAttribute('transform', `translate(0 ${fixed(209 - height * 1.1 - 190, 1)})`);
          marker.dataset.state = state === '位于目标带' ? 'ok' : 'warn';
        }
        announce('coach-readout', state === '位于目标带'
          ? '目标带内是显示状态，不证明内部靶区位于计划位置。'
          : '患者看到的提示是流程反馈；阈值和目标带必须由系统与临床流程定义。');
      };
      coach.addEventListener('input', updateCoach);
      updateCoach();
    }

    const latencyIds = ['latency-capture', 'latency-process', 'latency-interface', 'latency-stop', 'latency-speed'];
    if ($('#latency-capture')) {
      const updateLatency = () => {
        const values = ['latency-capture', 'latency-process', 'latency-interface', 'latency-stop'].map(number);
        const total = values.reduce((sum, value) => sum + value, 0);
        const distance = number('latency-speed') * total / 1000;
        values.forEach((value, index) => {
          const id = ['latency-capture', 'latency-process', 'latency-interface', 'latency-stop'][index];
          write(`${id}-value`, `${value} ms`);
        });
        write('latency-speed-value', `${number('latency-speed')} mm/s`);
        write('latency-total', `${total} ms`);
        write('latency-distance', `${fixed(distance, 2)} mm`);
        const labels = ['wait', 'process', 'interface', 'stop'];
        let start = 0;
        values.forEach((value, index) => {
          const bar = $(`#latency-${labels[index]}`);
          if (bar) {
            bar.style.width = `${Math.max(4, value / Math.max(1, total) * 100)}%`;
            bar.style.left = `${start / Math.max(1, total) * 100}%`;
          }
          start += value;
        });
        announce('latency-state', total === 0
          ? '没有时延数据：不可用不能读成零延迟。'
          : `从表面变化到停束请求共 ${total} ms；教学值，真实响应链需端到端测量。`);
      };
      latencyIds.forEach((id) => {
        const input = $(`#${id}`);
        if (input) input.addEventListener('input', updateLatency);
      });
      updateLatency();
    }
  }

  function initEvidence() {
    const surface = $('#surface-shift');
    if (!surface) return;
    function update() {
      const surfaceValue = number('surface-shift');
      const internalValue = number('internal-shift');
      write('surface-shift-value', `${surfaceValue.toFixed(1)} mm`);
      write('internal-shift-value', `${internalValue.toFixed(1)} mm`);
      const mismatch = Math.abs(surfaceValue - internalValue);
      announce('internal-state', mismatch < .5
        ? '当前教学状态：体表读数与内部标志恰好一致；这不是一般规律。'
        : `当前教学状态：体表与内部标志相差 ${mismatch.toFixed(1)} mm；相同外形不能唯一确定内部位置。`,
        mismatch < .5 ? 'ok' : 'warn');
    }
    bindRange(['surface-shift', 'internal-shift'], update);
    const verify = $('#internal-verify');
    if (verify) {
      verify.addEventListener('click', () => {
        announce('internal-verification', '已取得一次内部影像证据（模拟）：这是一个时刻的核实，不等于后续每次体表监测都得到内部验证。', 'warn');
      });
    }
    update();
  }

  function initChapterPage() {
    const page = document.body.dataset.page;
    if (page === 'surface') {
      initMatching();
      initStereo();
    } else if (page === 'coordinates') {
      initCalibration();
      initFusion();
    } else if (page === 'pose') {
      initPose();
    } else if (page === 'validity') {
      initValidity();
      initQA();
    } else if (page === 'feedback') {
      initFeedback();
    } else if (page === 'evidence') {
      initEvidence();
    }
  }

  function init() {
    initHub();
    initChapterPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
