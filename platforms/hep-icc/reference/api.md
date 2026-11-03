# ICC 接口速查（2026-11-03 实测）

## 通用

- 全部 `POST`，`Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- 必带请求头 `X-Access-Token: <JWT>`（从任意 `/iccapi/` 请求头里抄）
- 返回：`{ success: true, code: 200, message: "", result: {...} }`
- 401 = token 过期 → 重新登录

## 1. 课程菜单

```
POST /jeecg-personal/iccapi/v1/student/course/course_menu
courseId=5000006133
courseRoleId=5000045794
courseUserRoleId=5000719585
roleGroupId=4
```

`result` 关键字段：

| 字段 | 含义 |
|---|---|
| `score` | 课程总分（本例 "44"） |
| `chapterList[]` | 章节点数组 |
| `chapterList[].menuid` | 章节菜单 id |
| `chapterList[].children[]` | 子菜单（教学课件/自测题/讨论题） |
| `children[].menuid` | **列表接口传的 menuId** |
| `children[].funcid` | 12=课件 52=自测题 9=讨论题 |
| `children[].url` | 老站 URL（`roleMenuId=` 后面就是 menuId） |

`chapterList` 里除了 12 章，还有一条 `我的学习档案`（`funcid` 不同），遍历时要按 title 过滤。

## 2. 教学课件列表

```
POST /jeecg-resource/iccapi/v1/student/resource/resource_list
type=0
orderBy=
sequence=
current=1
courseId=5000006133
menuId=<章节的 教学课件 menuid>
courseToUserRoleId=5000719585
searchKeyword=
pageSize=100
```

`result`：`allCount / finishCount / noFinishCount / total / pageList[]`

`pageList[]` 条目：

| 字段 | 含义 |
|---|---|
| `resourceInfoId` | 资源主键（播放页大概率用它） |
| `resTitle` | 标题 |
| `progress` | 0~1，**=1 表示完成** |
| `mediaTypeName` | `视频` / `混合` / `PPT` |
| `preViewUrl` | H5 为相对路径；视频为 `VideoId=<uuid>` |
| `mustRead` | 是否必读 |
| `viewer` / `scanNumber` | 浏览/扫码数 |
| `progress` 非 1 的条目就是待做项 |

## 3. 自测题列表

```
POST /jeecg-self-exam/iccapi/v1/student/self_test/self_test_list
courseUserRoleId=5000719585
courseInfoId=5000006133
roleGroupId=4
type=0
curPage=1
pageSize=100
menuId=<自测题 menuid>
```

`result`：`startCount / noStartCount / totalCount / pageList[]`
（`startCount` = 已开始，`noStartCount` = 未开始）

## 4. 讨论题列表

```
POST /jeecg-answer/iccapi/v1/student/disscussion/discussion_boards
courseId=5000006133
menuId=<讨论题 menuid>
curPage=1
pageSize=100
courseToUserRoleId=5000719585
```

本章实测返回空列表（该课讨论区可能没建主题）。

## 5. 课程列表（换账号时用）

```
POST /jeecg-personal/iccapi/v1/student/coursecenter/person_course_list
courseStatus=1
curPage=1
pageSize=10
roleInfoId=
hasTask=false
search=
```

返回的 `courseId / courseRoleId / courseUserRoleId` 就是上面所有接口要的三个 id。

## 6. SPA 路由

| 页面 | 路由 |
|---|---|
| 个人空间 | `/iccweb/v1/student/person` |
| 教学课件 | `/iccweb/v1/student/index/resourceList?courseId=&menuId=&title=&autoIn=true` |
| 自测题 | `/iccweb/v1/student/index/selfTest?courseId=&menuId=&autoIn=true` |
| 讨论区 | `/iccweb/v1/student/index/discussion?courseId=&menuId=&autoIn=true` |

注意：`selfTestList`（多 List）是**错**的，会跳回课程中心；正确是 `selfTest`。
