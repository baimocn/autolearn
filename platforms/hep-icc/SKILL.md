---
name: autolearn-hep-icc
description: 高教社 ICC 数字课程出版云平台（icc.hep.com.cn）学员端自动化。查看课程完成度、按章节遍历课件/自测题/讨论题。触发词：ICC、icc.hep.com.cn、数字课程、高教社、HEP。
---

# ICC（高教社数字课程平台）— 平台手册

> 状态：**平台结构已摸清，只读接口全部打通；写入类（做题/发帖/视频进度）尚在探测。**
> 最后核验：2026-11-03，课程《动物生物化学（2026秋）》，courseId `5000006133`。

## 1. 平台形态

- 门户站 `https://icc.hep.com.cn/getSystemDepartmentPortal.action`（SSE 渲染的 JSP 老站）
- 学员端 SPA：`/iccweb/v1/student/...`（Vue 单页）
- 后端是 **JeecgBoot** 微服务集群，**每个业务一个 `/jeecg-xxx/` 前缀**：
  | 前缀 | 用途 |
  |---|---|
  | `/jeecg-personal` | 课程列表、课程菜单、个人信息 |
  | `/jeecg-resource` | 教学课件资源 |
  | `/jeecg-self-exam` | 自测题 |
  | `/jeecg-answer` | 讨论区 |
- 鉴权：**`X-Access-Token: <JWT>`**（不是 cookie）。JWT 里带 `username` 与 `exp`，过期返回
  `{"code":401,"message":"Token失效，请重新登录!"}`。

## 2. 登录

1. 打开门户 → 点击 `a#denglu[onclick=openLogin()]`（页面里有两个 `#denglu`，要点 `onclick` 那个，
   或直接 JS 调 `openLogin()`）
2. 弹出的登录面板是 **iframe**：`/jsp/systemHome/publishLoginFormNew2.jsp`
3. 字段（在 iframe 的 document 里）：
   - `#loginName` 账号
   - `#loginPassword`（hidden）/ `#loginPassword_tp`（可见框），两个都要写
   - `#captcha` 图片验证码 `#submitButton` 提交
4. **验证码的坑（实测）**：图片不会自动出，**必须先点一下验证码区域**才会渲染；
   不填直接提交会提示「请输入右侧验证码」。拿到图后需要**视觉识别**再填。
5. 登录成功后跳 `/iccweb/v1/student/person`。

> 换账号前要清 cookie，否则沿用上一个会话。

## 3. 数据模型

`course_menu` 返回 13 个节点（12 章 + 1 个"我的学习档案"），每章 `children` 是三个功能菜单：

| 子菜单 | funcid | webInterfaceUrl |
|---|---|---|
| 教学课件 | 12 | `/iccapi/v1/student/resource/resource_list` |
| 自测题 | 52 | `/iccapi/v1/student/self_test/self_test_list` |
| 讨论题 | 9 | `/iccapi/v1/student/disscussion/forum_posts` |

章节与菜单都带 `menuid`，**所有列表接口都靠 `menuId` 定位**。

课件条目关键字段：
`resTitle` 标题、`progress` 进度（0~1，=1 即完成）、`mediaTypeName` 类型（视频/混合）、
`preViewUrl` 预览地址（H5 课件是相对路径，视频是 `VideoId=...`）、`resourceInfoId` 主键。

## 4. 接口（均已实测 200）

全部是 **POST + `application/x-www-form-urlencoded`**，必须带 `X-Access-Token`。

```
POST /jeecg-personal/iccapi/v1/student/course/course_menu
  courseId, courseRoleId, courseUserRoleId, roleGroupId=4

POST /jeecg-resource/iccapi/v1/student/resource/resource_list
  type=0, orderBy=, sequence=, current=1, courseId, menuId,
  courseToUserRoleId, searchKeyword=, pageSize=100

POST /jeecg-self-exam/iccapi/v1/student/self_test/self_test_list
  courseUserRoleId, courseInfoId, roleGroupId=4, type=0, curPage=1, pageSize=100, menuId

POST /jeecg-answer/iccapi/v1/student/disscussion/discussion_boards
  courseId, menuId, curPage=1, pageSize=100, courseToUserRoleId
```

返回统一 `{success, code, message, result}`，分页在 `result.pageList`，
计数在 `result.allCount / finishCount / noFinishCount`（课件）或 `totalCount`。

## 5. 已跑通的脚本

```bash
# 抓 token（需要浏览器已登录且停在学员端）
node scripts/hep-status.mjs
```

`hep-status.mjs` 会：
1. 复用浏览器标签，从真实请求头里抓 `X-Access-Token`（最稳，不依赖 localStorage）
2. 拉 `course_menu` 拿到所有章节 + menuId
3. 逐菜单查课件 / 自测题 / 讨论题，统计完成度
4. 结果写 `hep-status.json`，终端打印每章明细

**实测输出（2026-11-03）**：合计 15/74 —— 课件 15/57、自测题 0/17。

## 6. 待攻克（下次接手从这里开始）

| # | 事项 | 已排除 | 下一步 |
|---|---|---|---|
| 1 | 课件（视频）进度上报 | 点列表项未进播放器（选择器没匹配上） | 用 `resourceInfoId` 直接构造播放页 URL，抓 XHR 找进度上报接口 |
| 2 | 课件（H5 混合） | `preViewUrl` 是相对路径，需拼 `ICourseFiles` 域名 | 打开看是否有 `finish` 上报 |
| 3 | 自测题作答 | 只拿到列表（2 条"进行中"） | 进 `/index/selfTest` 点进题目，抓提交接口 |
| 4 | 讨论题 | 该课本章节 `discussion_boards` 返回空 | 换有讨论题的章节再试 |

## 7. 与 U校园的差异（迁移时的注意点）

| 维度 | U校园 | ICC |
|---|---|---|
| 鉴权 | Cookie | `X-Access-Token` JWT |
| 进度上报 | `finishNode`（节点进视口即发） | 未定，疑似播放器定时上报 |
| 页面形态 | 阅读器 + 教材 iframe | Vue SPA，无 iframe（登录除外） |
| 完成语义 | `state.pass>=1` | 课件 `progress>=1` |
| 登录拦截 | 无 | **图片验证码（需点一下才出图）** |
