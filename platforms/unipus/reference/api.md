# 接口协议（阅读器 ipub.unipus.cn）

## 鉴权

- `Authorization: Bearer <JWT>`，JWT 由父页面通过 postMessage 下发给阅读器
- 获取方式：`Network.requestWillBeSentExtraInfo` 抓一个 `/api/reader/*` 请求的 `Authorization` 头
- 有效期约 30 天（`exp - iat = 2592000`）
- 直接 `fetch` 需要手动带上这个头；Cookie 不够

## 读接口

| 用途 | 接口 |
|---|---|
| 书籍基本信息 | `GET /api/reader/book/getBookBasicInfo?bookId=&bookVersionNumber=` |
| 章节列表 | `GET /api/reader/chapter/getChapterList?bookId=&bookVersionNumber=` |
| 目录（含每章 catalog 的 marker id） | `GET /api/reader/chapter/getBookCatalog?...` |
| 章节详情（**含 studentContent.json 的签名 URL**） | `GET /api/reader/chapter/getChapterInfo?...&chapterId=` |
| 章节内容 | 上面拿到的签名 URL，形如 `https://ipub.cdn.unipus.cn/<bookId>/<chapterId>/<ver>/studentContent.json?q-signature=…`，**签名只有 60 秒** |
| 某题作答记录 | `GET /api/reader/answer/list?questionId=<anchor==ver>&versionNumber=<ver>` |

`answer/list` 返回 `{score, userAnswersResult[{childId, userAnswerValue, score}], correctAnswers, questionAnalysis}`。
已提交的自动判题题会带 `correctAnswers` —— 这是"揭示答案"的数据来源。

## 提交接口

```
POST /api/reader/answer/judgeStart
POST /api/reader/answer/judgeResult   （轮询评分结果）
```

`judgeStart` 载荷：

```json
{
  "groupId": "<questionAnchor==versionKey>",
  "lan": "en",
  "userAnswers": [
    { "childId": "<子题或左节点 id>", "questionType": "translation | text_match | fill_blanks | ...", "userAnswerValue": "<字符串>" }
  ],
  "versionNumber": "<组的版本号>",
  "bookId": "0iws4u_bQkCFpqmfcTvdAg",
  "bookVersionNumber": "VTqvEEI",
  "chapterId": "<uuid>"
}
```

### 各题型的 userAnswerValue 形态

| 题型 | 形态 |
|---|---|
| `translation` / 作文 | 纯文本字符串 |
| `text_match`（连线） | **JSON 数组字符串**，每个左节点一条记录：`childId = 左节点 id`，`userAnswerValue = "[\"<右节点id>\"]"` |
| 填空 | 该空的文本 |

取 id 的位置：
- `groupId`：题块内 `[data-ipub-question-group-type]` 元素的 `id`
- `versionNumber`：`answer/list` 请求 URL 里的 `versionNumber`
- 左右节点 id：`.react-flow__node[data-id]`

⚠️ **异步队列**：`judgeStart` 是异步判题。短时间内连发会返回
`{"code":500,"message":"数据异步处理中..."}`，此后新答案写不进去、旧答案也改不掉，且不会很快恢复。
**所以：一次只交一次，别拿它做试错。**

## 课程结构接口（父页面 ucontent.unipus.cn）

- `GET /course/api/course/<courseId>/default` → `course` 是个 **JSON 字符串**，parse 后 `units[].children[]` 就是 `u1 / u1g499 / …` 这棵路由树
- `GET /course/api/v2/course_progress/<courseId>/<unit>/<userId>/default` → 单元进度

## 十一、单元测试 = 独立试卷（paper），不是章节题块

课程结构里每个单元末尾有 `Unit test` 节点，子节点 `base = "quiz-paper-link"`、
`tab_type = "ut"`、`question_num = 26`、`externalNodeId` 就是 **paperId**。

必带请求头：`Authorization: Bearer <token>`
（token 从任意 ipub 请求的 `requestWillBeSentExtraInfo` 里取；不带头会返回 401「身份校验失败」）

| 用途 | 接口 | 关键参数 |
|---|---|---|
| 取试卷版本 | `POST /api/reader/paper/getPaperVersionByPublishedBook` | `{bookId, bookVersionNumber, paperId}` |
| 取整卷内容 | `POST /api/reader/paper/instance/createPaperInstanceByPublishedBook` | 同上 → 返回 `instanceId` + `bigQuestionGroupDTOs` |
| 取最近实例 | `POST /api/reader/paper/instance/getLatestPaperInstance` | 同上 + `versionNumber` |
| 提交历史 | `POST /api/reader/paper/answer/getUserPaperSubmitHistory` | `{paperId, versionNumber, paperType:3}` |
| 得分明细 | `POST /api/reader/paper/answer/getUserPaperScore` | `{instanceId, paperId, versionNumber, paperType:3}` |
| 挑战卷统计 | `POST /api/reader/paper/getChallengePaperStatInfo` | — |
| 保存作答 | `POST /api/reader/paper/answer/saveUserPaperAnswer` | **DTO 未知**，报「用户作答记录不能为空」 |

`paperType = 3` 是诊断/挑战卷，缺 `testMode` 时得分接口报「诊断卷未指定测试模式」。

答案不在试卷里：`answers` 字段为 `null`，必须自己解。

## 十二、取课程完整结构（一次拿全 8 单元 × 38 节点）

在 ucontent 页面内：
```js
fetch("https://ucontent.unipus.cn/course/api/course/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/default", {credentials:"include"})
```
返回 `course`（JSON 字符串）→ `units[]`，递归取每个节点的
`id / url / name / base / tab_type / externalNodeId`。

`url` 拼起来就是阅读器 hash 路径：`#/course-v3:.../courseware/u1/u1g103`。
`externalNodeId` 就是 `data-marker-id` 里 `#` 后面那一段。
