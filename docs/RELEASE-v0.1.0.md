# v0.1.0 发布说明

用 bibibobo 的锯齿波小人声把 DSH 的回答念出来。控件长在回答自己下面那排按钮里
（与「复制 / 好的回复 / 有问题的回复 / 在上下文视图中查看此轮 / 在新对话中分支」同排），
播放时有字幕和进度条，可暂停、继续、结束。

## 这一版有什么

- **位置**：每条回答下方的操作行里，不再是输入框工具栏
- **字幕**：60 字窗口随播放滚动，两端按需加省略号
- **进度条**：6em 轨道，随播放推进，带 `role="progressbar"`
- **念哪一段**：只念该轮的收尾回复（沿用宿主 `turn-tail` 的 `closing` 判定），
  多步回答不念中间步骤
- **每轮都能念**：历史回答下面也保留自己的 🔊，点哪轮念哪轮
- **暂停 / 继续 / 结束**：单例 `<audio>`，不会声音叠加；播完自动回 idle

## 声音来源

合成器是 [bibibobo](https://github.com/hakihakii/bibibobo) 的**原样内联副本**，未作任何改动：

- 声音最初出自：B 站 哈基科技《路墨小剧场》每期配乐脚本
- 写成代码：`soraincloud`（首次提交 `af11592`）
- 播放方式修复：`KanbaraDYD`（提交 `3ac39a2`）
- 仓库托管：[@hakihakii](https://github.com/hakihakii)（GitHub Organization）
- 协议：MIT

一条锯齿波加两个带通滤波器，不用采样、不用 TTS 模型。声音本身属于哈基科技的作品，
代码由 soraincloud 写成，喜欢的话请给 [bibibobo](https://github.com/hakihakii/bibibobo) 点个 star。

## 安装

下载下面的 `dsh-bibibobo.tgz`，在 DSH 的 **设置 → 插件 → 添加插件** 里选择它。
也可以直接在应用内选本仓库根目录安装。

## 附件

| 文件 | 用途 |
|---|---|
| `dsh-bibibobo.tgz` | 固定名，plugin market 的 `tarball` 字段指向它 |
| `dsh-bibibobo-0.1.0.tgz` | 带版本号，内容相同，便于回溯 |

## 验证

- 19 项自动化测试通过（合成器、WAV 头、Markdown 清洗、节点提取、字幕行）
- 合成器与上游 `bibibobo.js` 逐样本比对一致
- 四项行为使用者实机点验：点 🔊 有声、播放时变 ⏸、点 ⏸ 暂停、点 ⏹ 停止

**完整变更**：https://github.com/cxv117793-blip/dsh-bibibobo/commits/main
