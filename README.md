# English reading classroom

面向中国大学一年级学生的英语阅读练习。网站以课文照片中的第32–34页为依据，保留第1–10段正文、图片说明和 Notes，提供6道四选一题，覆盖主旨、细节、推断与词义。

照片没有显示独立文章标题，网页使用第33页页脚中的 **Planting seeds, harvesting the future** 作为阅读标题。

## 使用网站

下载或克隆本仓库，用 Chrome、Edge、Firefox 或 Safari 打开根目录的 `index.html`，即可离线使用。网站不需要构建、数据库、API 密钥或服务器。

学生选完6题后点击“提交答案”，页面会显示总分、正确答案、中文解析和原文依据。漏答时，提交按钮附近显示未答题号，并定位到第一道未答题。“重新练习”清空答案和得分。

页面适配电脑和手机。不要求姓名、不上传成绩、不使用浏览器存储保存作答。若文件预览器禁止运行 JavaScript，请下载 HTML 文件后用浏览器打开。

## 源代码

- `index.html`：完整网页，内含 HTML、CSS、JavaScript、课文、题目和解析。
- `tests/reading-practice.test.cjs`：浏览器回归测试。
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

覆盖1440px、390px、320px宽度下的全对（6/6）、部分答错（3/6）、漏答提示、第一道漏答题定位、按钮旁提示可见性、解析与原文依据、重新练习、重复提交、JavaScript 被禁用时的提示，以及无成绩上传行为。

GitHub Actions 会在推送、Pull Request 和手动触发时运行测试。生产部署只会在 `main` 分支测试通过后执行。

## 公开部署到 GitHub Pages

仓库管理员首次启用时，在 GitHub 网页上操作：

1. 打开仓库，点击 **Settings（设置）**。
2. 在左侧 **Code and automation** 下点击 **Pages**。
3. 在 **Build and deployment → Source** 中选择 **GitHub Actions**。
4. 将网站 Pull Request 合并到 `main`。若已经合并，打开 **Actions → Test and deploy reading practice → Run workflow**，选择 `main` 并运行。
5. 等待 `test` 和 `deploy` 两个任务成功。部署记录中的 `github-pages` 链接就是可分享给学生的网址；也可在 **Settings → Pages** 查看 **Visit site**。

对于当前仓库，GitHub Pages 的默认项目地址应为：

`https://cao577purdue-png.github.io/English-reading/`

这个地址仅在 GitHub Pages 已启用、部署任务成功后才可使用。工作流只发布 `index.html`，不会把测试依赖或照片附件复制到网站。不要仅凭地址格式判断部署已经完成。

如果 Pages 设置页提示当前仓库或套餐不支持发布，请按 GitHub 页面提示处理仓库可见性或套餐；不要擅自修改仓库可见性。
