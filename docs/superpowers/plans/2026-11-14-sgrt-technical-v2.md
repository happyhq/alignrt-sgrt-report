# SGRT 技术报告 technical-v2 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不覆盖 v0.3.0 的前提下，把现有单页技术报告重组为“总览枢纽 + 六章页面”的可离线阅读、可 GitHub Pages 发布的 `technical-v2/`。

**Architecture:** 使用原生 HTML/CSS/JavaScript。`technical-v2/index.html` 提供系统地图、六章入口和实验索引；六个子目录各自承担一个问题链，共享 `assets/report.css`、`assets/report-data.js` 和 `assets/report.js`。交互以渐进披露和单一主实验为主，所有结论按 Fact / Inference / Assumption 标注。

**Tech Stack:** HTML5、CSS Grid/Flexbox、原生 JavaScript、SVG、Python 标准库检查器、pytest。

**Spec:** 本轮用户确认的方案 C：“总览枢纽 + 六章页面”，读者为产品/研发人员与临床协作者；保留浅色阅读页 + 深色实验台；先预览，再推送 GitHub Pages。

## Global Constraints

- 只修改报告线相关文件；不得执行 `git add .`，不得覆盖已发布的 `outputs/sgrt-interactive-report/technical/index.html`。
- `technical-v2/` 必须可离线打开，页面资源和跨页链接均使用相对路径。
- 六个章节文件必须存在：`surface/index.html`、`coordinates/index.html`、`pose/index.html`、`validity/index.html`、`feedback/index.html`、`evidence/index.html`。
- 15 个实验必须有稳定 ID；旧锚点通过映射表兼容，不能让旧链接静默断掉。
- 证据层级统一为 `fact`、`inference`、`assumption`；不得把教学参数、公开产品宣传或工程推断写成设备规格、临床结论或 R0 证据。
- R0 边界保持：单组双目、独立模体台架、本地工作站、模拟接口；不连接真实出束控制、不驱动治疗床、不接入真实患者。
- 视觉基线：阅读背景 `#F3F7FB`、正文深蓝 `#102E50`、实验台 `#142B40`；蓝色表示数据，橙色表示控制/边界，绿色只表示明确通过。
- 页面无横向溢出；复杂图表允许局部横向滚动；键盘可完成主要导航和实验操作；动态结果使用 `aria-live="polite"`；SVG 必须有 `<title>` 和 `<desc>`；尊重 `prefers-reduced-motion`。
- `python tools/check_report.py` 必须在发布前通过；`python -m pytest` 不得引入新的回归。

## Review Focus

- 旧链接指向 `technical/index.html#matching` 等锚点时，必须落到 v2 对应章节或实验，而不是 404 或错误章节。
- 页面切换、移动端折叠和键盘操作不能依赖鼠标悬停；原生 `details` 与按钮需有可见焦点。
- 合成实验必须明确标注“教学示例”，不能将参数读取为厂商性能、临床阈值或 R0 验收值。
- 证据编号在正文、实验卡片和证据页之间必须可追溯；缺来源的结论必须降级为 Inference/Assumption。
- GitHub Pages 的子目录部署必须保留相对路径，不能出现以 `/` 开头的本地资源链接。

---

### Task 1: 扩展报告检查器并建立失败测试

**Files:**
- Modify: `tools/check_report.py`
- Create: `tests/test_report_checker.py`

**Interfaces:**
- Consumes: 现有 `Page`、`check_page(path)` 与 `REPORT` 常量。
- Produces: `V2_PAGES: tuple[str, ...]`、`check_v2(root: Path) -> dict`、`check_page(path, root=REPORT)`；`check_v2` 返回包含 `pages`、`experiments`、`legacy_anchors` 的摘要。

- [x] **Step 1: 写失败测试**

```python
def test_v2_has_six_chapters_and_one_h1_each():
    result = check_v2(REPORT)
    assert result['pages'] == 7
    for relative in V2_PAGES:
        assert (REPORT / relative).is_file()

def test_v2_experiment_registry_has_fifteen_unique_ids():
    result = check_v2(REPORT)
    assert result['experiments'] == 15

def test_v2_legacy_anchor_mapping_resolves():
    result = check_v2(REPORT)
    assert result['legacy_anchors']['matching'] == 'surface/index.html#experiment-matching'
```

- [x] **Step 2: 运行并确认失败**

Run: `python -m pytest tests/test_report_checker.py -q`

Expected: FAIL because `technical-v2`、`check_v2` 和 `V2_PAGES` 尚不存在。

- [x] **Step 3: 实现检查器最小逻辑**

`check_page` 增加 `root` 参数；路径链接先解析目标文件，再检查 fragment 是否存在于目标页。新增 `V2_PAGES` 全集检查、`check_v2` 汇总、旧锚点映射检查，并将原有根报告检查保持原样。不要因为 v2 新增 SVG 改变旧报告“9 个 SVG”的断言。

- [x] **Step 4: 运行测试**

Run: `python -m pytest tests/test_report_checker.py -q`
Expected: PASS；若 v2 尚未建立，后续任务继续补齐内容。

- [x] **Step 5: Commit**

```bash
git add tools/check_report.py tests/test_report_checker.py
git commit -m "test: validate technical report v2 structure"
```

### Task 2: 建立共享数据、视觉系统和枢纽页

**Files:**
- Create: `outputs/sgrt-interactive-report/technical-v2/assets/report-data.js`
- Create: `outputs/sgrt-interactive-report/technical-v2/assets/report.css`
- Create: `outputs/sgrt-interactive-report/technical-v2/assets/report.js`
- Create: `outputs/sgrt-interactive-report/technical-v2/index.html`

**Interfaces:**
- `window.SGRT_REPORT_DATA` 提供 `chapters`、`experiments`、`edges`、`evidence`、`legacyAnchors`。
- `report.js` 暴露页面初始化入口 `initReport()`，并在 `DOMContentLoaded` 自动执行。
- 枢纽页节点使用 `data-node-id`；章节入口使用 `data-chapter-id`；实验索引使用 `data-experiment-id`。

- [x] **Step 1: 写枢纽页结构测试**

断言总览页只有一个 `h1`，包含 6 个 `data-chapter-id`、15 个 `data-experiment-id`、系统地图 SVG 的 `<title>` 和 `<desc>`，以及 Fact / Inference / Assumption 图例。

- [x] **Step 2: 运行测试确认失败**

Run: `python -m pytest tests/test_report_checker.py -q`

- [x] **Step 3: 创建共享数据与页面**

数据字段固定为：章节 `id`、`number`、`title`、`question`、`conclusion`、`href`；实验 `id`、`chapterId`、`legacyNo`、`title`、`kind`、`canAnswer`、`cannotAnswer`、`evidenceIds`、`boundary`、`status`；证据 `id`、`kind`、`title`、`locator`、`supports`、`limits`、`status`。系统地图限制在 6–9 个节点、12 条关系内，关系语义使用文字标签与线型，不只依赖颜色。

- [x] **Step 4: 人工检查枢纽页**

Run: `python -m http.server 8765 --bind 127.0.0.1 -d outputs/sgrt-interactive-report`
Expected: `http://127.0.0.1:8765/technical-v2/` 可打开，节点点击后出现统一详情字段。

### Task 3: 建立六章页面模板与主交互

**Files:**
- Create: `technical-v2/surface/index.html`
- Create: `technical-v2/coordinates/index.html`
- Create: `technical-v2/pose/index.html`
- Create: `technical-v2/validity/index.html`
- Create: `technical-v2/feedback/index.html`
- Create: `technical-v2/evidence/index.html`
- Modify: `technical-v2/assets/report.js`

**Interfaces:**
- 每章包含 `main#main`、`h1`、`section[data-chapter]`、一个默认展开的 `.experiment--primary`，以及上一章/下一章和“回系统地图”链接。
- 交互容器使用 `data-lab` 标识：`matching`、`stereo`、`calibration`、`fusion`、`pose`、`roi`、`registration`、`residual`、`validity`、`coach`、`latency`、`surface-internal`。
- 动态读数使用 `data-output`，状态变化写入 `aria-live` 区域。

- [x] **Step 1: 写章节与交互存在性测试**

断言每章有唯一 `h1`、主实验、证据边界块、前后章链接；重点断言 `surface` 的匹配滑块、`pose` 的六自由度滑块、`validity` 的有效性状态和 `feedback` 的时延控件存在。

- [x] **Step 2: 运行测试确认失败**

Run: `python -m pytest tests/test_report_checker.py -q`

- [x] **Step 3: 实现六章内容与交互**

按用户确认的问题链写正文：体表 → 三维；多视角 → 统一坐标；参考 → ROI → 6DoF；配准 → 可信度；测量 → 反馈/门控；体表证据 → 内部证据。保留旧实验的教学意图与参数说明，页面统一使用“本章问题 → 主图 → 主交互 → 工程结论 → 证据与边界”的节奏。合成数值必须标为“教学示例”。

- [x] **Step 4: 运行自动化检查**

Run: `python -m pytest tests/test_report_checker.py -q && python tools/check_report.py`
Expected: PASS；无重复 ID、无断链、无逃逸报告目录的资源。

### Task 4: 旧锚点映射、根页面入口与发布检查

**Files:**
- Modify: `outputs/sgrt-interactive-report/index.html`（只增加 v2 入口链接）
- Modify: `outputs/sgrt-interactive-report/technical-v2/assets/report-data.js`
- Modify: `tools/check_report.py`
- Modify: `README.md`（仅补充分发路径与 v2 预览入口）

**Interfaces:**
- `legacyAnchors` 将旧 ID 映射到 `chapter/index.html#experiment-...`。
- `report.js` 在带有 `#legacy=` 的入口或旧锚点路径中完成清晰提示与跳转，不悄悄改变当前页面语义。

- [x] **Step 1: 写旧锚点和入口测试**

断言 `matching`、`pose-sixdof`、`qa-registration`、`dibh-coach`、`gating-latency`、`evidence-library` 均能解析到存在的目标页和目标 fragment；断言根页包含 `technical-v2/index.html` 链接。

- [x] **Step 2: 实现映射与入口**

不删除旧页；在根报告的专题导航中增加“技术报告 v2”。检查器对跨页 fragment 做真实存在性验证。

- [x] **Step 3: 全量验证**

Run: `python -m pytest -q`
Run: `python tools/check_report.py`
Expected: 全部通过；旧报告仍可访问，v2 预览路径可访问。

### Task 5: 浏览器验收与 GitHub Pages 发布

**Files:**
- No source changes unless validation finds a defect.

**Interfaces:**
- 目标预览 URL：`https://happyhq.github.io/alignrt-sgrt-report/technical-v2/`

- [x] **Step 1: 本地浏览器检查**

检查 1440×1000、1024×768、390×844；验证导航、实验操作、键盘焦点、`prefers-reduced-motion`、页面无横向溢出、复杂图表局部滚动、旧锚点和所有跨页链接。

- [x] **Step 2: 发布前风险复核**

确认没有医疗结论升级、没有真实设备接口暗示、没有绝对路径、没有未标注证据层级；确认 GitHub Pages 只需上传 `outputs/sgrt-interactive-report`。

- [x] **Step 3: 只暂存本次文件并提交**

```bash
git add outputs/sgrt-interactive-report/technical-v2 \
  outputs/sgrt-interactive-report/README.md \
  tools/check_report.py tests/test_report_checker.py \
  docs/superpowers/plans/2026-11-14-sgrt-technical-v2.md \
  docs/quality/PreMortem-technical-v2-2026-11-14.md
git commit -m "feat: add interactive technical report v2"
```

- [x] **Step 4: 推送并观察 Actions**

推送当前分支到 `origin`；由于 `deploy-pages.yml` 只监听 `main`，将本次提交合入或推送到 `main` 后再观察部署结果。不得把工作区无关改动一起提交。

- [x] **Step 5: 验证公开页面**

Run: `Invoke-WebRequest -UseBasicParsing https://happyhq.github.io/alignrt-sgrt-report/technical-v2/`
Expected: HTTP 200，页面标题为“SGRT 技术原理与应用 · 技术总览”，六章入口和实验交互可见。
