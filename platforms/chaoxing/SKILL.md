---
name: chaoxing-explorer
description: "学习通（超星 / Chaoxing）平台侦察手册：覆盖 i.mooc.chaoxing.com 空间、mooc2-ans 课程外壳、mooc1 章节/课时 iframe。含课程列表提取、任务点口径（已完成任务点 X/Y）、知识节点完成机制（isPassed + playTime）、核心接口清单、可自动化程度评估，以及手机 404 等避坑。用于评估/刷学习通课程。"
agent_created: true
---

# 学习通（Chaoxing）自动化侦察手册

> **一句话**：学习通比 U校园简单一个量级——任务点就是「视频看过即完成」，没有 U校园那套 required 白名单/精读/答题/上传的复杂计分。
> 本手册记录 2026-11-21 账号「傅铭胜 / 福建农林大学超星平台」的实地侦察结论。

| 版本 | 日期 | 状态 |
|---|---|---|
| v1.0 | 2026-11-21 | 初建：站点结构 + 任务点口径 + 接口 + 可自动化评估 |

---

## 0. 适用场景

- 用户说「学习通 / 超星 / Chaoxing / 刷课」→ 进本手册。
- **先做只读侦察**：列课程 → 看任务点 X/Y → 判断有没有可刷的，再决定是否动手。
- 与 U校园（见 `platforms/unipus/SKILL.md`）是两套完全不同的系统，不要混用口径。

---

## 1. 站点结构（三层）

```
i.mooc.chaoxing.com/space/index              空间首页（我学的课列表在 iframe: /visit/interaction）
  └─ mooc1-1.chaoxing.com/mooc-ans/visit/stucoursemiddle?courseid=&clazzid=  课程入口（会 302 到 mooc2-ans）
       └─ mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?courseid=&clazzid=   课程外壳（顶部 tab：任务/章节/讨论/作业/考试/资料）
            └─ mooc1.chaoxing.com/mycourse/studentstudy?chapterId=&courseId=  章节详情（视频播放器在此层的 iframe）
```

**入口铁律**：进课程用 `/mooc-ans/visit/stucoursemiddle?courseid=<>&clazzid=<>&vc=1&cpi=<>&ismooc2=1&v=2`，
直接访问 `mooc2-ans/.../stu` 缺 `enc` 参数会报「无效的参数」。`stucoursemiddle` 会自动带上 enc 跳转。

## 2. 课程列表提取

空间首页 iframe（`/visit/interaction`）里，课程卡片是 `<a href="...courseid=(\d+)&clazzid=(\d+)...">`。
标题在父容器 innerText 里（a 自身 innerText 常为空）。提取后得到 `{title, courseid, clazzid, cpi}` 列表。

## 3. 任务点口径（关键，简单）

- 课程外壳点「章节」tab → iframe 顶部显示 **`已完成任务点: X / Y`**。
  ego snapshot 里数字被拆成两行：`text "X"` + `text "/Y"`，正则要分别取。
- **X=Y 即全完成**；`0/0` 表示老师没发布内容（空课壳），不是没刷。
- 目录结构：`第X章 → 第Y节 → 第N课时 / ***复习题`。课时是视频任务点，`***复习题` 是测验。

### 3.1 知识节点完成机制（抓包实证）

课时页 `knowledge/cards` 接口返回每个任务点的：
- **`isPassed: true/false`** —— 任务点是否完成（唯一的完成判据）
- **`playTime`** —— 视频已播放毫秒数（如 1003000≈16.7 分钟），播够即 isPassed=true
- 其它字段：`headOffset`, `jobid`, `mid`, `type:"video"`, `attDurationEnc`, `videoFaceCaptureEnc`

目录接口 `studentstudycourselist` 顶部有隐藏字段：
`<input id="_studystate" value="{nextChapterId:0,unfinishCount:0}"/>` —— `unfinishCount` 是未完成数，0 即全完成。

## 4. 核心接口清单

| 接口 | 作用 |
|---|---|
| `/mooc2-ans/mycourse/stu?courseid=&clazzid=&cpi=&enc=` | 课程外壳（需 enc，由 visit 入口跳转获得） |
| `/mooc2-ans/mycourse/studentcourse?...&ut=s&stuenc=` | 课程数据（含任务点计数） |
| `/mooc-ans/mycourse/studentstudycourselist?courseId=&chapterId=&clazzid=` | 章节目录树（含 `_studystate.unfinishCount`） |
| `/mooc-ans/mycourse/studentstudyAjax?courseId=&clazzid=&chapterId=` | 章节学习状态 |
| `/mooc-ans/knowledge/cards?clazzid=&courseid=&knowledgeid=&num=0&ut=s` | **课时任务点数据（isPassed/playTime）** |
| `/mooc-ans/verifyCode/studychapter` | 学习校验 |

## 5. 可自动化程度评估

**技术上可行，且比 U校园简单：**
- 视频任务点：播完视频即 `isPassed=true`，无需答题（对比 U校园要精读/答题/上传）。
- 进度口径只有一个（`已完成任务点 X/Y`），无"两套账"问题。
- **但**：实测某账号 22 门课中，5 门有内容的课任务点全部 `X/X`（100% 完成），其余 17 门是 0/0 空课壳或无任务 —— 即**没有可刷目标**。作业/考试也全部已完成。

**结论**：学习通的难点不在技术，在于「有没有未完成的任务」。动手前必须先按第 3 章侦察，确认存在 `X<Y` 的课。

## 6. 避坑

- **手机打开 404**：PC 登录页 `/passport2.chaoxing.com/login` 在手机 UA 下 302 到 `/mlogin?null`（坏参数），移动页不认 → 404。
  手机应直开 `https://passport2.chaoxing.com/mlogin`（已验证 HTTP 200，干净的「登录」页）；或用 App 扫码。
- ego-browser 跨域 iframe：`page.evaluate` 读不到跨域 iframe 的 `contentDocument`（会返回空/异常），**用 `page.snapshot()` 穿透 iframe**（它自带 iframe 内容）。
- 直接访问 `mooc2-ans/.../stu` 报「无效的参数」→ 必须走 `stucoursemiddle` 入口拿 enc。
- 快照里任务点数字拆成 `text "X"` 和 `text "/Y"` 两行，正则分开取。

## 7. 侦察 SOP（照做即可）

1. 登录 → 空间首页 → 从 iframe 提取课程列表（courseid/clazzid/cpi）。
2. 逐课：`goto stucoursemiddle` → 点「章节」tab → snapshot 取「已完成任务点 X/Y」。
3. 筛出 `X<Y` 的课 = 有可刷任务。若全 `X=Y` 或 `0/0` → 无可刷目标，停止并报告。
4. 对目标课：进课时 → 抓 `knowledge/cards` 看 `isPassed=false` 的节点 → 播视频至 playTime 达标。
5. 核验：重看章节页 X/Y 是否增长。
