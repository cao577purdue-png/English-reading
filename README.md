# English reading classroom

面向中国大学一年级学生的英语阅读练习。网站以课文照片中的第32–34页为依据，保留第1–10段正文、图片说明和 Notes，提供10道四选一题：原有6道阅读题，以及新增的3道四、六级重点词汇或词组题（foster、tackle、in light of）和1道文章结构题。

照片没有显示独立文章标题，网页使用第33页页脚中的 **Planting seeds, harvesting the future** 作为阅读标题。

## 使用网站

下载或克隆本仓库，用 Chrome、Edge、Firefox 或 Safari 打开根目录的 `index.html`，即可离线使用。网站不需要构建、数据库、API 密钥或服务器。

学生选完10题后点击“提交答案”，页面会显示总分、正确答案、中文解析和原文依据。漏答时，提交按钮附近显示未答题号，并定位到第一道未答题。“重新练习”清空答案和得分。每题1分，满分10分。

页面适配电脑和手机。不要求姓名、不上传成绩、不使用浏览器存储保存作答。若文件预览器禁止运行 JavaScript，请下载 HTML 文件后用浏览器打开。

## 源代码

- `index.html`：完整网页，内含 HTML、CSS、JavaScript、课文、题目和解析。
- `unit2-textb.html`：独立的 Text B 课堂练习，根据上传文档第2–5页制作，包含5个 Case、原练习图和36个计分项。评分依据文档后面的教师答案表；思维导图忽略大小写及常见连字符差异。判断题改写和 Bonus 为选填，不计分。无需姓名或班级。
- `unit2-textb-adventure.html`：同内容的“瑞士探案手账”活泼版，加入原创瑞士山湖列车插画、瑞士位置示意图、钟表与校园主题插画、Rolex/OMEGA/Patek Philippe/Swatch 品牌文化名片。文化图卡不计分；36项题目、标准答案、中文讲解与评分程序均与简洁版一致。地图底图来自 Natural Earth（公共领域）。所有配图均内嵌，网页可独立离线打开。
- `tests/reading-practice.test.cjs`：浏览器回归测试。
- `tests/unit2-textb.test.cjs`：两个 Text B 版本的内容一致性、36/36、31/36、0/36、漏答、重练、手机布局和隐私检查。
- `package.json`、`package-lock.json`：固定测试依赖，网站运行时不需要安装。
- `.github/workflows/site.yml`：自动测试，以及合并到 `main` 后的 GitHub Pages 部署。

## 测试

需要 Node.js 22 或更高版本。首次运行：

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

测试会自动开启只绑定本机的临时 HTTP 服务，测试结束后关闭。已安装系统 Chromium 时会优先使用；否则使用 Playwright 的 Chromium。

覆盖1440px、390px、320px宽度下的全对（10/10）、部分答错（5/10）、仅答原有6题时的漏答校验、第一道漏答题定位、按钮旁提示可见性、解析与原文依据、重新练习、重复提交、JavaScript 被禁用时的提示，以及无成绩上传行为。

GitHub Actions 会在推送、Pull Request 和手动触发时运行测试。生产部署只会在 `main` 分支测试通过后执行，并检查三个公开网页返回 HTTP 200、内容与部署源文件一致。

## 公开部署到 GitHub Pages

仓库管理员首次启用时，在 GitHub 网页上操作：

1. 打开仓库，点击 **Settings（设置）**。
2. 在左侧 **Code and automation** 下点击 **Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
4. 将网站 Pull Request 合并到 `main`。若已经合并，打开 **Actions → Test and deploy reading practice → Run workflow**，选择 `main` 并运行。
5. 等待 `test` 和 `deploy` 两个任务成功。部署记录中的 `github-pages` 链接就是可分享给学生的网址；也可在 **Settings → Pages** 查看 **Visit site**。

对于当前仓库，GitHub Pages 的默认项目地址应为：

`https://cao577purdue-png.github.io/English-reading/`

这个地址仅在 GitHub Pages 已启用、部署任务成功后才可使用。工作流发布三个 HTML 文件，不会把测试依赖或原始文档复制到网站。Text B 简洁版地址为 `https://cao577purdue-png.github.io/English-reading/unit2-textb.html`，活泼版地址为 `https://cao577purdue-png.github.io/English-reading/unit2-textb-adventure.html`。不要仅凭地址格式判断部署已经完成。

如果 Pages 设置页提示当前仓库或套餐不支持发布，请按 GitHub 页面提示处理仓库可见性或套餐；不要擅自修改仓库可见性。
