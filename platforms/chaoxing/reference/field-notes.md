# 学习通（Chaoxing）侦察实录

## 1. 首次侦察（2026-11-21，账号 傅铭胜 / 福建农林大学超星平台）

- **现象**：用户要求「用 ego-browser 探索学习通咋样」。
- **环境**：ego-browser v2.2.1，新建 space 7「学习通探索」。登录页 `passport2.chaoxing.com/login`（手机号/超星号 + 密码 + 登录按钮 + 扫码选项），用户手动完成登录。
- **登录后**：落地 `i.mooc.chaoxing.com/space/index?ws=1`，显示「福建农林大学超星平台」，顶部 tab：首页/我的课程/我的作业/iWrite，侧栏菜单：课程/笔记/收件箱/专题创作/听课评课/小组/云盘/评价问卷。

### 课程清单（22 门，从 iframe `/visit/interaction` 提取）
1. 习近平新时代中国特色社会主义思想概论 240828019/152290603 → 0/0
2. Python程序设计 266183928/152218581 → 0/0
3. 颈腰椎健康保健及防治常识 265449986/151472395 → 32/32
4. 改革开放史 265363143/150435503 → 78/78
5. 植物学实验 248752258/147776020 → 0/0
6. 25级综合英语2 261805328/142726828 → 0/0
7. 植物学 246486488/141711466 → 22/22
8. 中国近现代史纲要2026春 260932879/140357017 → 0/0
9. 操作系统 260300988/138825213 → 0/0
10. 大学生党课初级教程 259537559/137215584 → 0/0
11. 25综合英语I 257476055/132800062 → 0/0
12. 军事理论课 256315890/130621357 → **87/87**
13. 思想道德与法治 250063820/129525680 → 0/0
14. 国家安全教育 254666452/129227455 → **116/116**
15-22. 课程已结束（8 门）

**关键结论**：有内容的 5 门课（颈腰椎/改革开放史/植物学/军事理论/国家安全教育）任务点全部 `X/X` 满完成；其余是 0/0 空课壳。**没有可刷目标**。

### 任务点完成机制（抓包实证）
- 进军事理论课「第1课时 国防的含义和类型」（videojs 视频，约 500M）：
  - iframe 显示 `listboxoption "任务点已完成"`。
- `knowledge/cards` 接口返回：
  `{"isPassed":true,"playTime":1003000,"jobid":"...","type":"video","mid":"...","headOffset":1003000,...}`
  → **isPassed 是完成判据，playTime 是已播放毫秒数**。
- `studentstudycourselist` 返回目录 HTML，顶部 `<input id="_studystate" value="{nextChapterId:0,unfinishCount:0}"/>` → unfinishCount=0 全完成。
- 作业 tab：1/1 已完成；考试 tab：已完成（提示"完成20%任务点可参加考试"）。

### 手机 404 根因（实测 UA 对比）
- `curl -A 桌面UA https://passport2.chaoxing.com/login` → 200 停 `/login`
- `curl -A iPhoneUA` → 302 到 `/mlogin?null`
- `curl -A AndroidUA` → 302 到 `/mlogin?null`
- 干净地址 `https://passport2.chaoxing.com/mlogin` → 200，标题「登录」，25020 字节，无 404 特征。
- **结论**：PC 登录页在手机 UA 下重定向丢了回调参数，拼成 `?null`，移动页报 404。手机应直开干净的 `/mlogin`。

### 踩坑
- 直接访问 `mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu?courseid=&clazzid=` 报「无效的参数」——缺 `enc`。必须走 `mooc1-1.chaoxing.com/mooc-ans/visit/stucoursemiddle?...` 入口自动跳转带 enc。
- `page.evaluate` 读跨域 iframe 的 `contentDocument` 拿不到内容（返回空或 CROSS_ORIGIN）；改用 `page.snapshot()` 能穿透 iframe 读到文本。
- snapshot 里「已完成任务点: 87 /87」的数字是两行 `text "87"` + `text "/87"`，正则需分别取 `text "(\d+)"` 和 `text "/(\d+)"`。
- 课程卡片 a 标签自身 innerText 为空，标题要从父容器（向上 5~6 层）取。
- 批量探测用 `page.goto` + 点章节 tab + snapshot，14 门课约 70 秒。

## 2. 待补充
- 若将来出现 `X<Y` 的课程：验证播视频使 playTime 达标 → isPassed 翻转的完整自动化链路。
- 作业/考试的未提交自动化（本次全部已完成，未展开）。
