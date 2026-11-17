// 分镜脚本：语气温和、少一点推销感。
//
// 写作约束（自己遵守）：
// - 旁白用口语，不用「现在」「就能」「立即」这类强调词
// - 不写祈使句当卖点（「装上试试」→ 陈述事实）
// - 不堆形容词，不排比，不用破折号制造停顿
// - 声音的来源要说清楚：哈基科技出品，hakihakii 写代码，MIT
// - 旁白仍是 bibibobo 合成器念，短句为主
export const SCENES = [
  {
    id: 'hook',
    seconds: 6,
    kicker: '先说声音',
    title: '这死动静',
    subtitle: '哈基科技 · 路墨小剧场',
    nar: '这个声音，你可能听过。',
  },
  {
    id: 'origin',
    seconds: 8,
    kicker: '声音从哪来',
    title: '哈基科技的路墨小剧场',
    subtitle: 'B 站 UP 主 · 配乐脚本里的那段声音',
    nar: '这个声音出自哈基科技的《路墨小剧场》，原本是配乐脚本里的一段。',
  },
  {
    id: 'code',
    seconds: 8,
    kicker: '后来',
    title: '有人把它写成了库',
    subtitle: 'bibibobo · soraincloud 写的第一版',
    nar: '后来有人把这段声音写成了可以调用的库，项目叫 bibibobo，第一次提交来自 soraincloud。',
  },
  {
    id: 'turn',
    seconds: 7,
    kicker: '所以',
    title: '它能念你的回答',
    subtitle: '同样的锯齿波',
    nar: '我在它的基础上包了一层，让 DSH 的回答也能用这个声音念出来。',
  },
  {
    id: 'demo',
    seconds: 8,
    kicker: '在哪',
    title: '回答下面那排按钮',
    subtitle: '和复制挨着',
    nar: '控件就在每条回答的下面，和复制挨着。点一下，它开始念。',
  },
  {
    id: 'play',
    seconds: 7,
    kicker: '念的时候',
    title: '有字幕，有进度条',
    subtitle: '念到哪，一眼能看出来',
    nar: '念的时候有字幕跟着走，下面有一条进度。想停就停，想接着听就接着听。',
  },
  {
    id: 'closing',
    seconds: 7,
    kicker: '念哪一段',
    title: '只念最后那段',
    subtitle: '中间的步骤跳过',
    nar: '如果一轮里说了好几段，它只念最后那段，前面找信息的部分跳过。',
  },
  {
    id: 'how',
    seconds: 7,
    kicker: '技术上的事',
    title: '一条锯齿波',
    subtitle: '两个带通滤波器',
    nar: '声音本身不复杂。一条锯齿波，过两个带通滤波器，就出来了。',
  },
  {
    id: 'credit',
    seconds: 10,
    kicker: '需要说清楚',
    title: '声音不是我做的',
    subtitle: '',
    nar: '这个声音不是我做的。波形、口型、代码，都来自 bibibobo。我只是给它找了个新用处。',
  },
  {
    id: 'thanks',
    seconds: 12,
    kicker: '谢谢',
    title: '声音的来路',
    subtitle: '',
    nar: '谢谢做出这个声音的哈基科技，也谢谢把代码写下来的 soraincloud，还有修过播放方式的 KanbaraDYD。喜欢的话，去 B 站看看原作。',
  },
  {
    id: 'install',
    seconds: 6,
    kicker: '怎么装',
    title: '插件里添加这个仓库',
    subtitle: 'dsh-bibibobo',
    nar: '在插件里添加这个仓库就行。它很小，不联网，也不花你的 token。',
  },
]

export const TOTAL = SCENES.reduce((n, s) => n + s.seconds, 0)
