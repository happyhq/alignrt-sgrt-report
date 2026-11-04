# AlignRT 与 SGRT 交互式专题报告

基于 29 页入门 PPT 制作的中文 HTML5 专题报告，包含七章正文、八幅 SVG 插图、九组交互结构图，以及原文、备注与引用记录。

当前版本：**0.2.0**。

在线阅读：**[AlignRT 与 SGRT 交互式专题报告](https://happyhq.github.io/alignrt-sgrt-report/)**。

- [报告首页](outputs/sgrt-interactive-report/index.html)
- [使用、部署与打印说明](outputs/sgrt-interactive-report/README.md)
- [Markdown 原稿](outputs/sgrt-interactive-report/report.md)
- [插图方案](outputs/sgrt-interactive-report/插图方案.md)
- [验收记录](outputs/sgrt-interactive-report/验收检查.md)
- [A4 PDF](outputs/sgrt-interactive-report/AlignRT与SGRT专题报告_A4.pdf)
- [版本变更](CHANGELOG.md)
- [与参考站的设计分析和本次改进](outputs/sgrt-interactive-report/设计分析与改进.md)

## 本地阅读

下载或克隆仓库后，在浏览器中打开 `outputs/sgrt-interactive-report/index.html`。所有运行资源均在仓库内，无需构建。

也可从仓库根目录运行：

```shell
python -m http.server 8765 --bind 127.0.0.1 --directory outputs/sgrt-interactive-report
```

然后访问 <http://127.0.0.1:8765/>。

## 内容维护

网页正文在 `outputs/sgrt-interactive-report/index.html`，版式及交互在其 `assets/` 目录。`source.json` 和 `report.md` 保留原 PPT 的逐页记录。新增事实须记录来源；素材中的概念结构、参数与选配件描述应保持其来源边界。

本仓库以当前最终文件作为维护基线，不依赖本机临时生成脚本。早期构建过程、旧版本备份和工作区其他调研文件保留在本机。

## 版本管理

`main` 保存可阅读版本。后续修改通过 `codex/描述` 分支、提交及 PR 进行 review。更新内容时同步维护 `CHANGELOG.md`，形成可交付版本时更新 `VERSION` 并创建对应标签。初始标签为 `v0.1.0`。

本地完整性检查：

```shell
python tools/check_report.py
```

GitHub Actions 在 push 和 pull request 时运行相同检查，验证本地资源、页内锚点、SVG 与来源记录。配置见 `.github/workflows/check-report.yml`。浏览器视觉验收范围见报告验收记录，完整性检查不替代视觉复核。

## 在线发布

仓库公开维护，通过 GitHub Pages 提供无需登录的阅读地址：<https://happyhq.github.io/alignrt-sgrt-report/>。

`.github/workflows/deploy-pages.yml` 在 `main` 更新或手动运行时，先检查报告完整性，再将 `outputs/sgrt-interactive-report/` 发布到 GitHub Pages。无需构建命令。通过 PR 合入 `main` 后，可在仓库 Actions 中查看部署进度；部署成功后刷新阅读网址即可获取更新。其他本地工作文件不属于发布目录。
