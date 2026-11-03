# 页面架构（三层 + 一个隐藏的第四层）

```
uai.unipus.cn/app/cmgt/resource-detail/<id>      ← 课程页（单元列表、教程目录、继续学习）
        │ 点「继续学习」或单元小节
        ▼
ucontent.unipus.cn/_ipublishpc_default/pc.html    ← 容器页（路由 hash：unit/section/…）
        │ iframe#ipublish-pc-book-easy-iframe（跨子域）
        ▼
ipub.unipus.cn/learner/textbook/book/<bookId>/chapter/<chapterId>?bookVersionNumber=…
        ├─ 左侧目录抽屉 .catalog_area-close-menu__Q1QfP（凸起把手，点开才渲染单元树）
        ├─ 正文滚动容器 .pc_center-left__MPwlq（横向长文档，scrollHeight 可达 3.8 万）
        └─ 题块 div.editor-question-block.questionBlockNode（懒挂载）
```

**第四层**：连线/匹配题内部是 **React Flow 画布**（`.react-flow__node[data-id]`、`.react-flow__handle-left/right`）。

## 关键机制

### 懒挂载
题块里的 `input` / `textarea` 只在进入视口后渲染。读 `count()` 为 0 不代表题没做，可能是没滚到。

### 三种状态
- **编辑态**：有 `input`/`textarea`，按钮是「提交」
- **已提交态**：值渲染成文本/链接，按钮是「重新作答」，并出现「答案」区
- **录音态**：出现「准备时长 / 作答时长 / 点击开始」→ 跳过

### 粘性提交条
每个题块右上角有自己的悬浮「提交/重新作答」，锚在视口顶部（y≈127~160）。
**坐标点击时按钮属于哪个题块取决于当前滚动位置** —— 这是"点了没反应"的头号原因，所以一律 `jsClick`。

### 单元与章节
- 章节 = `chapter/<uuid>`，每个单元一个 chapterId
- 阅读器加载哪个 chapter 由**父页面路由 + 服务端当前单元指针**共同决定，直接改 iframe URL 会破坏父子 token 握手 → 页面空白
- 唯一可靠切换：左侧抽屉 → 展开单元 → 点该单元下的小节 → 父页弹「当前单元还未完成」→ JS 点「去学习」

### 会话
CAS 会话约 1~2 小时过期，过期后整页跳到 `sso.unipus.cn`。
`ensure-login.mjs` 会用浏览器保存的账号密码登录；若出现《服务协议》弹窗需点「同意」，并**勾选登录框下方的协议复选框**才能登录成功。
