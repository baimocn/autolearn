---
name: autolearn
description: 在线课程平台自动化总入口（多平台）。当前收录 U校园（Unipus）：视频/音频倍速、口语 TTS 录音、文件上传、简答提交、精读课文、正文慢滚上报。触发词：U校园、Unipus、刷课、做题、口语题、上传题、精读、课程进度。
---

# autolearn — 在线课程自动化技能

本技能用 **CDP 接管已登录的 Chrome**，直接操作页面完成课程任务点。
按平台分包，先读对应平台的子技能，再动手。

## 路由

| 平台 | 入口 | 域名特征 |
|---|---|---|
| U校园 Unipus | `platforms/unipus/SKILL.md` | `ucontent.unipus.cn` / `ipub.unipus.cn` / `uai.unipus.cn` / `sso.unipus.cn` |
| ICC 高教社数字课程 | `platforms/hep-icc/SKILL.md` | `icc.hep.com.cn`（JeecgBoot 微服务，多 `/jeecg-*/` 前缀） |

> 新平台接入：复制 `platforms/unipus/` 改造成 `platforms/<new>/`，
> 保留「先探测、再动手、每步用接口 pass 核验」的骨架，替换选择器与接口即可。

## 通用铁律（所有平台都适用）

1. **只操作 `document.visibilityState === 'visible'` 的标签页**，否则点击无效、进度不动。
2. **判定只看接口**（如 `course_progress` 的 `pass` 字段），不看页面文字猜。
3. **点不动先查遮罩**：`.ant-modal-wrap` / `[class*=backdrop]`，用 `elementFromPoint` 一秒定位。
4. **React 按钮的终极解法**：`el.__reactProps.onClick({...})`；输入框用原生 setter + `input` 事件。
5. **破坏性操作先列清单**：清空、重交、覆盖提交一律先确认。

## 使用前提

- Chrome 以 `--remote-debugging-port=9222` 启动，且**已登录目标平台**
- Node 18+，仅用内置模块
- `platforms/<name>/scripts/config.mjs` 存在（从 `config.example.mjs` 复制填写）
