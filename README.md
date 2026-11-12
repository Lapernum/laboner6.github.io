# 影記 · LAPERGRAPHY v2.0

拉邦那的《星际公民》游戏内摄影作品集。整站用原生 HTML / CSS / JavaScript 重写，没有 React、Vue、Tailwind 或任何前端框架；上传管理端也只用 Node.js 内置模块，没有后端框架。

- 新版地址：`/`
- 经典版地址：`/old/`
- 两个版本右上角都有「新版 / 经典版」一键切换按钮。
- 顶部进度条现在可以用鼠标拖动；经典版也补上了拖动（原版只显示位置）。

---

## 1. 目录结构

```text
.
├─ index.html               新版入口
├─ css/site.css             新版全部样式
├─ js/                      新版原生 ES Modules
│  ├─ main.js               入口 / 滚动 / 快捷键
│  ├─ gallery.js            双行横向画廊、懒加载
│  ├─ progress.js           可拖动顶部进度条
│  ├─ lightbox.js           原图查看器
│  ├─ datehud.js            底部年月 / 月份跳转
│  ├─ intro.js              关于面板
│  ├─ theme.js              深色 / 浅色主题
│  ├─ data.js               ImageInfo.json 读取
│  ├─ config.js             图片域名与工具函数
│  ├─ logo.js               旋转圆弧 Logo
│  ├─ ui.js                 Toast / 剪贴板 / URL
│  └─ admin.js              仅本机显示上传入口
├─ assets/                  图片、字体子集
├─ old/                     经典版 1.3（只做了路径兼容 + 开关 + 拖动）
├─ ImageInfo.json           作品索引（新版和经典版共用）
├─ admin/
│  ├─ server.mjs            本地管理服务器（零依赖）
│  ├─ index.html            上传工作台
│  ├─ admin.js              拖拽 / EXIF / 缩略图 / 上传 / 发布
│  ├─ admin.css
│  └─ config.example.json   配置示例；真正的 config.json 不会提交
├─ tools/subset-fonts.py    字体子集重建脚本
├─ start-admin.cmd          Windows 双击启动
├─ start-admin.sh           macOS / Linux 启动
└─ package.json             只有 start / fonts 两个脚本，没有依赖
```

运行时要求：**Node.js 18 或更高版本**（管理端用到内置 `fetch`、`FormData` 解析）。

---

## 2. 本地预览 / 打开管理台

Windows 直接双击 `start-admin.cmd`，或者在项目根目录执行：

```bash
node admin/server.mjs
```

浏览器会自动打开：

- 管理台：`http://127.0.0.1:8787/admin/`
- 网站预览：`http://127.0.0.1:8787/`

服务器只监听 `127.0.0.1`，公网访客访问不到。关掉终端窗口或按 `Ctrl+C` 即停止。

如果你只是想像普通静态站一样预览，也可以在项目根目录运行任意静态服务器（注意 `.js` 的 MIME 必须是 `text/javascript`），但上传功能只有 `admin/server.mjs` 提供。

---

## 3. 首次配置：连接 Backblaze B2

新版不把图片放进 GitHub 仓库，而是继续放在原来的图片域名 `https://img.lapernum.site`（Backblaze B2 + Cloudflare）。管理台需要一组只在本机保存的 B2 密钥。

### 3.1 在 B2 创建 Application Key

1. 登录 Backblaze，进入 **Application Keys**。
2. 新建一个 key，权限至少勾选：
   - `listBuckets`
   - `writeFiles`
3. 最好把 key 限制到图片所在的 bucket（例如 `lapernum`）。
4. 记下 **keyID** 和 **applicationKey**（applicationKey 只显示一次）。

### 3.2 在管理台填写

打开 `http://127.0.0.1:8787/admin/`，首次会自动展开配置区：

| 字段 | 示例 | 说明 |
|---|---|---|
| B2 Key ID | `005xxxxxxxx...` | 上一步的 keyID |
| Application Key | `K005...` | 上一步的 applicationKey |
| Bucket 名称 | `lapernum` | 图片所在的 bucket |
| 公开访问前缀 | `https://img.lapernum.site` | 现有图片域名，不要带结尾 `/` |
| 缩略图前缀 | `jpg/` | 保持默认，和现有文件一致 |
| 原图前缀 | `full/` | 新上传原图放这里；旧图仍用 `png/` |

保存时管理端会：

1. 调用 `b2_authorize_account` 验证密钥；
2. 列出账号下的 bucket，确认 bucket 名称存在；
3. 把配置写入 `admin/config.json`。

`admin/config.json` 已经在 `.gitignore` 里，**不要提交**。配置里含有密钥，只保存在你本机。

> 公开读取由 B2 bucket 的公开权限 / Cloudflare 负责，前端永远拿不到密钥。若 `https://img.lapernum.site/jpg/Star_Citizen_00000.jpg` 能在浏览器打开，就说明公开访问没问题。

### 3.3 本地预览模式

如果暂时没有 B2 密钥，可以点「改用本地预览模式」。图片会写到 `admin/media/`，`ImageInfo.json` 里的路径是 `/media/...`。这个模式只用于本机试排版，**不会部署**，不要提交这些记录。

---

## 4. 上传工作流

1. 双击 `start-admin.cmd`，打开管理台。
2. 把照片拖进虚线框，或点「选择照片」，或直接在页面里 `Ctrl+V` 粘贴截图。
3. 每张照片会自动：
   - 读取 EXIF `DateTimeOriginal`（没有 EXIF 时用文件修改时间）；
   - 读取方向修正后的宽高；
   - 在浏览器里生成最长边 3200px 的 JPEG 缩略图；
   - 显示尺寸、大小和可编辑的拍摄时间。
4. 点「开始上传」：
   - 原图上传到 `full/Star_Citizen_XXXXX.<jpg|png|webp|avif>`；
   - 缩略图上传到 `jpg/Star_Citizen_XXXXX.jpg`；
   - 追加到 `ImageInfo.json`，ID 继续现有的 `Star_Citizen_XXXXX` 连号；
   - 按原来的排布算法重算 `Flow / Num / PositionL / PositionR`，让两行长度保持平衡；
   - 如果勾选「上传后自动发布」，会 `git add ImageInfo.json` → `git commit` → `git push`。
5. GitHub Pages 通常 1 分钟内更新。Cloudflare 如果缓存了 `ImageInfo.json`，可能需要手动 purge 一下。

### 日期与顺序

画廊是「越新的作品越靠左」：数组末尾（index 最大）在最左边。上传队列会按拍摄时间从早到晚分配 ID，所以同一次上传的多张照片仍然保持时间顺序。

如果某张照片的拍摄时间早于当前最新作品，它仍会被追加到数组末尾（即最左边），但日期 HUD 会显示旧月份。管理台会给这类照片一个「早于最新作品，会排在最左侧」的提示。**建议按时间顺序补传**；这是为了保持原有 `Star_Citizen_XXXXX` ID 与 `?targetId=` 分享链接不变而做的取舍。

### 手动发布

取消勾选自动发布后，上传只改本地 `ImageInfo.json`。你可以在项目根目录手动执行：

```bash
git add ImageInfo.json
git commit -m "Add photographs"
git push
```

管理台的「重新配置」里也可以关闭 `git push`，只提交到本地。

---

## 5. 部署到 GitHub Pages

把整个目录（除了 `admin/config.json`、`admin/media/`、`admin/.tmp/`）提交到 `laboner6.github.io` 仓库的默认分支即可。GitHub Pages 继续从根目录发布。

首次部署前建议：

```bash
git status
# 确认没有 admin/config.json、admin/media/ 被加入
git add -A
git commit -m "Rewrite site as v2.0 + local upload studio"
git push
```

如果使用自定义域名 `lapernum.site`，`CNAME` 文件保持原样。图片仍然走 `https://img.lapernum.site`，不需要改 B2 的公开域名。

### 为什么上传端不部署到线上

GitHub Pages 是纯静态托管，不能安全地保存 B2 密钥，也不能执行 `git push`。所以上传工作台是一个**只在本机运行**的小服务器：

- 线上网站不包含密钥；
- 线上访客看不到「上传」按钮；
- 只有你本机运行 `admin/server.mjs` 时，新版页面才会通过 `/api/health` 检测到它并显示上传图标；
- 管理服务器校验 `Host` 和 `Origin`，只接受 `127.0.0.1` / `localhost` 的请求。

---

## 6. 新版 / 经典版切换

- 新版右上角：`经典版 v1.3` → `/old/`
- 经典版右上角：`新版 v2.0` → `/`

两个版本共用根目录的 `ImageInfo.json` 和同一个 `localStorage.theme`，所以切换时主题不会跳变，新上传的作品也会同时出现在两边。

切换按钮现在只跳转到对方首页，不携带 `?pos`，也不会自动滚动或打开大图；`?targetId=` 仍然保留原来的分享/自动打开大图行为。

经典版为了放进 `/old/` 做了这些**最小兼容修改**，视觉和交互保持 1.3 原样：

1. 相对路径改成 `../assets/`、`../ImageInfo.json`；
2. 加载 `legacy.css` / `legacy-enhance.js`：注入切换按钮、把顶部进度条变成可拖动；
3. `module.js` 里原图地址支持新增的 `FullPath` 字段；没有该字段的旧图继续用 `png/<Name>.png`。

经典版的 `?targetId=`、双行排布、日期跳转、主题、分享链接都保持原逻辑。

---

## 7. 语言切换

新版右上角有语言按钮，三种模式：

- 中文
- English
- 中英双语（默认）

选择会写入 `localStorage.lang`，刷新页面或重新打开浏览器后仍然保持。双语模式下导航、关于页、滚动提示、灯箱尺寸/比例以及「下载原图 / Download original」等底部按钮都会显示中英两行；中文或 English 模式则只显示对应语言。经典版保持 1.3 的原始双语排版。

---

## 8. 顶部滑动条

新版：

- 鼠标按住拖动，直接改变横向滚动位置；
- 点击轨道空白处可以跳到对应位置；
- 支持触屏 / 触控笔（Pointer Events）；
- 键盘聚焦后可 `←` / `→` / `Home` / `End`；
- 滑块宽度按「视口宽度 / 总宽度」计算，位置与滚动进度同步。

经典版通过 `legacy-enhance.js` 也补上了相同的拖动能力。

---

## 9. 图片 ID 与 ImageInfo.json

**ID 系统没有改。** 仍然是：

```text
Star_Citizen_00000
Star_Citizen_00001
...
Star_Citizen_00365
```

新上传继续 `max(编号) + 1`，补零到 5 位。分享链接仍然是：

```text
https://lapernum.site/?targetId=365
```

`targetId` 是数组下标。为了方便，新版还支持 `?photo=Star_Citizen_00365`。

每条记录的字段：

```json
{
  "PositionL": 0,
  "WHRatio": 2.3703703703703702,
  "Num": 1,
  "PositionR": 2.3703703703703702,
  "DateModified": "2026-08-01 02-08-33",
  "Name": "Star_Citizen_00365",
  "Flow": 1,
  "FullPath": "full/Star_Citizen_00366.jpg"
}
```

- `FullPath` 是新增的可选字段，只出现在新上传的作品上；旧作品没有这个字段，继续使用 `png/<Name>.png`。
- `Flow` 决定进入上面还是下面一行。
- 布局重算规则与原来完全一致：从数组末尾（最新）往前走，把每张图放到当前较短的一行，`PositionL` 是本行已用长度，`PositionR = PositionL + WHRatio`，`Num` 是本行第几张。长度单位是 `35vh`。
- 上传只追加、不重排已有记录；已有作品的 `Name / DateModified / Flow` 不会被改，只有位置会因新图插入左侧而整体平移。

---

## 10. 字体

原始 Noto Sans SC / TC 可变字体接近 29MB，已替换为按站内实际用字生成的 woff2 子集（合计约 280KB）：

- `assets/fonts/NotoSansSC.woff2`
- `assets/fonts/NotoSansTC.woff2`
- `assets/fonts/Outfit.woff2`

如果以后改了中文文案，重新生成：

1. 从 Google Fonts 下载原始 TTF，放回 `assets/fonts/`（文件名见 `tools/subset-fonts.py`）；
2. `pip install fonttools brotli`
3. `python tools/subset-fonts.py`

没重新生成也不会乱码：子集缺字时会自动回退到系统字体（PingFang SC / 微软雅黑）。

---

## 11. 常见问题

**端口 8787 被占用**
管理端会自动尝试 8788、8789……终端会打印实际地址。也可以用 `PORT=9000 node admin/server.mjs` 指定。

**B2 授权失败**
检查 keyID / applicationKey 是否复制完整，key 是否有 `listBuckets` 和 `writeFiles` 权限，bucket 名称是否拼对。

**上传成功但线上图片 404**
- `https://img.lapernum.site/full/Star_Citizen_XXXXX.jpg` 是否能直接打开？
- B2 bucket 是否公开读？
- Cloudflare 是否缓存了旧的 404？purge 一下。
- 如果 Cloudflare 只放行了 `jpg/` 和 `png/`，在「重新配置 → 存储路径」里把原图前缀改成 `png/`；`FullPath` 会记录实际路径，经典版也能打开。
- `publicBaseUrl` 是否和 `js/config.js` 里的 `imageBase` 一致（默认 `https://img.lapernum.site`）。

**push 失败**
先在终端确认 `git remote -v`、`git status`、`git config user.name/user.email`。管理端用 `GIT_TERMINAL_PROMPT=0` 执行 git，遇到需要交互输入密码/口令时会直接失败并给出 stderr。也可以只提交到本地，再手动 push。

**经典版里新上传的原图打不开**
经典版 `module.js` 已支持 `FullPath`；确认部署的是新版本的 `old/module.js`，并且 B2 上 `full/` 文件可公开访问。

**本地预览模式的照片线上看不到**
这是预期行为：本地模式只写 `admin/media/`，路径是 `/media/...`。正式上传请切回 B2 模式。

---

## 12. 致谢

设计建议与支持：GrakePCH、BoFone、澄风拌果汁。

Star Citizen 及相关标识归 Cloud Imperium Games 所有。本站为非官方粉丝作品，作品版权归拉邦那（Lapernum）所有；转载/使用请标明作者并链接回本站，请勿商用。
