# autolearn

> 用 CDP 直接驱动浏览器，自动完成在线课程平台上的各类任务点（视频/音频/口语/上传/简答/阅读）。
> 目前收录 **U校园（Unipus）**，架构按“多平台”设计，后续可继续加 `platforms/xxx`。

## 这是什么

一个**可复用的自动化技能包**：不靠录屏式 RPA、不靠模拟人类随机行为，而是
**接管一个已登录的 Chrome（CDP 9222），直接读页面 DOM + 调接口 + 触发 React 事件**。

已经跑通的题型：

| 题型 | 做法 | 备注 |
|---|---|---|
| 视频/音频 | 倍速 + `audio.playbackRate` | 进度按真实播放时长计 |
| 口语录音 | TTS 生成音频 + 伪造 `getUserMedia` 注入 | 逐题打分，实测 98~100 |
| 文件上传 | 拦截文件选择框 + `DOM.setFileInputFiles` | 提交即 `pass=1` |
| 简答题 | 原生 value setter 填值 + `__reactProps.onClick` 提交 | 提交即 `pass=1` |
| 精读课文 | 打开精读 → 2 倍速播完 → 关闭 | 每篇计 1 个节点 |
| 正文滚动 | 匀速慢滚，阅读器自动上报 `finishNode` | 节点进视口即计 |

## 目录结构

```
autolearn/
├── SKILL.md                     # 给 AI 智能体读的总入口（路由到具体平台）
└── platforms/
    └── unipus/                  # U校园
        ├── SKILL.md             # 平台完整操作手册（含 21 节踩坑实录）
        ├── reference/           # 接口/参数/题型速查
        ├── scripts/             # 可直接跑的 .mjs 脚本
        └── assets/              # 历史报告与统计
```

## 快速开始

```bash
# 1. 用调试端口启动 Chrome 并登录平台
chrome.exe --remote-debugging-port=9222 --user-data-dir=%USERPROFILE%\unipus

# 2. 复制并填写你的课程参数（config.mjs 不会被提交）
cd platforms/unipus/scripts
cp config.example.mjs config.mjs

# 3. 登录（凭据走环境变量，不写进代码）
export UNIPUS_USER=你的账号
export UNIPUS_PASS=你的密码
node login5.mjs

# 4. 按需运行具体任务脚本
node scrollpass.mjs 1 4      # 第 1 单元慢滚上报正文
node final2.mjs 1,2,3        # 逐单元跑精读
```

## 设计原则

- **薄封装**：脚本只依赖 Node 内置能力 + CDP，没有 puppeteer / selenium。
- **可验证**：每一步都以「接口返回的 `pass` 字段」为准，不靠截图猜。
- **可组合**：平台差异隔离在 `platforms/<name>/` 内，公共手法（CDP 封装、React 事件调用、
  遮罩排查）作为经验沉淀在 SKILL.md，新平台照着改。

## 硬坑速查（血泪换来的）

1. **`visibilityState !== 'visible'` 的标签页等于白干**——点击事件打不到前台页面。
2. **点击没反应、也没网络请求**：先查两层遮罩（`.ant-modal-wrap` / `[class*=backdrop]`），
   再直接调 `element.__reactProps.onClick(...)`。
3. **React 受控输入**必须用原生 setter + `input`/`change` 事件，否则字数不更新。
4. **想直接 POST 上报接口补进度？** U校园会 401（六种鉴权组合全试过），只能让页面自己发。

## 免责声明

本项目仅用于**个人已付费、已在读课程**的重复性操作自动化，用于学习研究。
使用者需自行确认不违反所在平台的服务条款；作者不对账号封禁或成绩争议负责。
仓库内**不含任何账号密码、Cookie、Token**。

## License

MIT
